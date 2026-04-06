<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Documentos Legales</h1>
      <Button @click="openTypeSelectorDialog">
        <Plus class="w-4 h-4 mr-2" />
        Nuevo Documento
      </Button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-4 mb-6">
      <div class="flex-1 min-w-[200px]">
        <Input
          v-model="search"
          placeholder="Buscar por propiedad..."
          class="w-full"
        >
          <template #prefix>
            <Search class="w-4 h-4 text-muted-foreground" />
          </template>
        </Input>
      </div>

      <Select v-model="documentTypeFilter" class="w-[220px]">
        <SelectTrigger>
          <SelectValue placeholder="Tipo de documento" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="corretaje">Autorización de Corretaje</SelectItem>
            <SelectItem value="boleto_compraventa">Boleto de Compraventa</SelectItem>
            <SelectItem value="entrega_llaves">Entrega de Llaves</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button
        v-if="hasActiveFilters"
        variant="ghost"
        size="sm"
        @click="clearFilters"
      >
        <X class="w-4 h-4 mr-1" />
        Limpiar filtros
      </Button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="py-12 text-center text-muted-foreground">
      <Loader2 class="w-8 h-8 mx-auto animate-spin" />
      <p class="mt-2">Cargando documentos...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="py-12 text-center">
      <p class="text-destructive font-medium mb-2">Error al cargar documentos</p>
      <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
      <Button variant="outline" @click="loadDocuments">
        Reintentar
      </Button>
    </div>

    <!-- Data loaded -->
    <template v-else>
      <!-- Empty state -->
      <div v-if="filteredDocuments.length === 0" class="py-12 text-center">
        <ScrollText class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-lg font-medium text-muted-foreground mb-2">
          {{ hasActiveFilters ? 'No se encontraron documentos' : 'No hay documentos' }}
        </p>
        <p class="text-sm text-muted-foreground mb-4">
          {{ hasActiveFilters
            ? 'Intenta ajustar los filtros de búsqueda'
            : 'Comienza generando tu primer documento legal'
          }}
        </p>
        <Button v-if="hasActiveFilters" variant="outline" @click="clearFilters">
          Limpiar filtros
        </Button>
        <Button v-else @click="openTypeSelectorDialog">
          <Plus class="w-4 h-4 mr-2" />
          Nuevo Documento
        </Button>
      </div>

      <!-- Documents table (desktop) -->
      <div v-else class="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-muted/50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Propiedad</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fecha de creación</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="doc in filteredDocuments"
              :key="doc.id"
              class="border-t border-border hover:bg-muted/30 transition-colors"
            >
              <td class="px-4 py-3">
                <Badge :class="getDocumentTypeBadgeClass(doc.document_type)">
                  {{ getDocumentTypeLabel(doc.document_type) }}
                </Badge>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm font-medium text-foreground">
                  {{ doc.property_name || 'Propiedad desconocida' }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-muted-foreground">
                {{ formatDate(doc.created_at) }}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    :disabled="!doc.pdf_url || downloadingId === doc.id"
                    @click="downloadDocument(doc)"
                    title="Descargar PDF"
                  >
                    <Loader2 v-if="downloadingId === doc.id" class="w-4 h-4 animate-spin" />
                    <Download v-else class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    @click="confirmDelete(doc)"
                    title="Eliminar"
                  >
                    <Trash2 class="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Documents cards (mobile) -->
      <div v-if="filteredDocuments.length > 0" class="md:hidden space-y-4">
        <div
          v-for="doc in filteredDocuments"
          :key="doc.id"
          class="bg-card border border-border rounded-lg p-4"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <Badge :class="getDocumentTypeBadgeClass(doc.document_type)" class="mb-2">
                {{ getDocumentTypeLabel(doc.document_type) }}
              </Badge>
              <h3 class="font-medium">{{ doc.property_name || 'Propiedad desconocida' }}</h3>
            </div>
          </div>

          <p class="text-sm text-muted-foreground mb-3">
            Creado: {{ formatDate(doc.created_at) }}
          </p>

          <div class="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              :disabled="!doc.pdf_url || downloadingId === doc.id"
              @click="downloadDocument(doc)"
            >
              <Loader2 v-if="downloadingId === doc.id" class="w-4 h-4 mr-1 animate-spin" />
              <Download v-else class="w-4 h-4 mr-1" />
              Descargar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              @click="confirmDelete(doc)"
            >
              <Trash2 class="w-4 h-4 mr-1 text-destructive" />
              Eliminar
            </Button>
          </div>
        </div>
      </div>

      <p v-if="filteredDocuments.length > 0" class="mt-4 text-sm text-muted-foreground">
        Mostrando {{ filteredDocuments.length }} de {{ documents.length }} documentos
      </p>
    </template>

    <!-- Document Type Selector Dialog -->
    <DocumentTypeSelectorDialog
      v-model:open="typeSelectorDialogOpen"
      @select="handleTypeSelect"
    />

    <!-- Corretaje Dialog -->
    <CorretajeDialog
      v-model:open="corretajeDialogOpen"
      @success="handleDialogSuccess"
    />

    <!-- Boleto Dialog -->
    <BoletoDialog
      v-model:open="boletoDialogOpen"
      @success="handleDialogSuccess"
    />

    <!-- Entrega Llaves Dialog -->
    <EntregaLlavesDialog
      v-model:open="entregaLlavesDialogOpen"
      @success="handleDialogSuccess"
    />

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="deleteDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar documento</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar este documento? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div v-if="documentToDelete" class="p-4 bg-muted/50 rounded-lg space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Tipo:</span>
            <span class="font-medium">{{ getDocumentTypeLabel(documentToDelete.document_type) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Propiedad:</span>
            <span class="font-medium">{{ documentToDelete.property_name || 'Desconocida' }}</span>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <Button variant="outline" @click="deleteDialogOpen = false" :disabled="deleting">
            Cancelar
          </Button>
          <Button variant="destructive" @click="executeDelete" :disabled="deleting">
            <Loader2 v-if="deleting" class="w-4 h-4 mr-2 animate-spin" />
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import DocumentTypeSelectorDialog from '@/components/documents/DocumentTypeSelectorDialog.vue'
import CorretajeDialog from '@/components/documents/CorretajeDialog.vue'
import BoletoDialog from '@/components/documents/BoletoDialog.vue'
import EntregaLlavesDialog from '@/components/documents/EntregaLlavesDialog.vue'
import {
  Plus,
  Search,
  X,
  Download,
  Trash2,
  ScrollText,
  Loader2,
} from 'lucide-vue-next'
import { useLegalDocuments, type LegalDocumentType, type LegalDocument } from '@/composables/useLegalDocuments'
import { useDate } from '@/composables/useDate'
import { useDebounce } from '@/composables/useDebounce'
import { useToast } from '@/composables/useToast'
import { supabase } from '@/lib/supabase'
import { storeToRefs } from 'pinia'

const { formatDate } = useDate()
const toast = useToast()
const legalDocumentsStore = useLegalDocuments()
const { documents, loading, error } = storeToRefs(legalDocumentsStore)
const { fetchDocuments, deleteDocument } = legalDocumentsStore

// Filter state
const search = ref('')
const documentTypeFilter = ref<LegalDocumentType | 'all'>('all')
const debouncedSearch = useDebounce(search, 300)

// Dialog state
const typeSelectorDialogOpen = ref(false)
const corretajeDialogOpen = ref(false)
const boletoDialogOpen = ref(false)
const entregaLlavesDialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const documentToDelete = ref<LegalDocument | null>(null)

// Action state
const downloadingId = ref<string | null>(null)
const deleting = ref(false)

// Computed
const hasActiveFilters = computed(() =>
  search.value !== '' || documentTypeFilter.value !== 'all'
)

const filteredDocuments = computed(() => {
  let result = documents.value

  // Filter by document type
  if (documentTypeFilter.value !== 'all') {
    result = result.filter(doc => doc.document_type === documentTypeFilter.value)
  }

  // Filter by search (property name)
  if (debouncedSearch.value) {
    const searchLower = debouncedSearch.value.toLowerCase()
    result = result.filter(doc =>
      doc.property_name?.toLowerCase().includes(searchLower)
    )
  }

  return result
})

// Document type helpers
function getDocumentTypeLabel(type: LegalDocumentType): string {
  const labels: Record<LegalDocumentType, string> = {
    corretaje: 'Autorización de Corretaje',
    boleto_compraventa: 'Boleto de Compraventa',
    entrega_llaves: 'Entrega de Llaves',
  }
  return labels[type] || type
}

function getDocumentTypeBadgeClass(type: LegalDocumentType): string {
  const classes: Record<LegalDocumentType, string> = {
    corretaje: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    boleto_compraventa: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    entrega_llaves: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  }
  return classes[type] || ''
}

// Actions
function clearFilters() {
  search.value = ''
  documentTypeFilter.value = 'all'
}

function openTypeSelectorDialog() {
  typeSelectorDialogOpen.value = true
}

function handleTypeSelect(type: LegalDocumentType) {
  typeSelectorDialogOpen.value = false

  switch (type) {
    case 'corretaje':
      corretajeDialogOpen.value = true
      break
    case 'boleto_compraventa':
      boletoDialogOpen.value = true
      break
    case 'entrega_llaves':
      entregaLlavesDialogOpen.value = true
      break
  }
}

async function handleDialogSuccess() {
  await loadDocuments()
}

async function downloadDocument(doc: LegalDocument) {
  if (!doc.pdf_url) {
    toast.error('El documento no tiene un PDF asociado')
    return
  }

  downloadingId.value = doc.id

  try {
    // Get signed URL for download
    const { data, error: downloadError } = await supabase.storage
      .from('contract-documents')
      .download(doc.pdf_url)

    if (downloadError) throw downloadError

    // Create download link
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = `${getDocumentTypeLabel(doc.document_type)}_${doc.property_name || 'documento'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Documento descargado correctamente')
  } catch (e) {
    console.error('Error downloading document:', e)
    toast.error('Error al descargar el documento')
  } finally {
    downloadingId.value = null
  }
}

function confirmDelete(doc: LegalDocument) {
  documentToDelete.value = doc
  deleteDialogOpen.value = true
}

async function executeDelete() {
  if (!documentToDelete.value) return

  deleting.value = true

  try {
    const success = await deleteDocument(documentToDelete.value.id)

    if (success) {
      toast.success('Documento eliminado correctamente')
      deleteDialogOpen.value = false
      documentToDelete.value = null
    } else {
      toast.error('Error al eliminar el documento')
    }
  } catch (e) {
    console.error('Error deleting document:', e)
    toast.error('Error al eliminar el documento')
  } finally {
    deleting.value = false
  }
}

async function loadDocuments() {
  await fetchDocuments()
}

// Watch for filter changes
watch(documentTypeFilter, () => {
  // Filters are applied client-side, no need to re-fetch
})

onMounted(() => {
  loadDocuments()
})
</script>
