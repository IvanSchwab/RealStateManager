<template>
  <div>
    <div class="pia-page-header">
      <div class="pia-page-title-block">
        <h1>Documentos Legales</h1>
        <div class="pia-page-subtitle">
          <span>{{ documents.length }} documentos</span>
        </div>
      </div>
      <div class="pia-page-actions">
        <button class="pia-btn pia-btn-primary" @click="openTypeSelectorDialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo documento
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:var(--gap)">
      <div class="pia-search-bar" style="width:260px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="search" placeholder="Buscar por propiedad…" />
      </div>
      <select v-model="documentTypeFilter" class="pia-btn pia-btn-ghost" style="font-size:13px;cursor:pointer">
        <option value="all">Todos los tipos</option>
        <option value="corretaje">Autorización de Corretaje</option>
        <option value="boleto_compraventa">Boleto de Compraventa</option>
        <option value="entrega_llaves">Entrega de Llaves</option>
      </select>
      <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm" @click="clearFilters">Limpiar</button>
    </div>

    <div v-if="loading" style="padding:60px;text-align:center;color:var(--pia-text-3)">Cargando documentos…</div>
    <div v-else-if="error" style="padding:40px;text-align:center;color:var(--terra)">{{ error }}</div>

    <div v-else class="pia-card" style="padding:0;overflow:hidden">
      <div class="pia-scroll-x">
        <table class="pia-tbl">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Propiedad</th>
              <th>Fecha de creación</th>
              <th style="text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in filteredDocuments" :key="doc.id">
              <td>
                <span class="pia-chip" :class="getDocumentTypeChipClass(doc.document_type)" style="font-size:11px">
                  {{ getDocumentTypeLabel(doc.document_type) }}
                </span>
              </td>
              <td>
                <strong>{{ doc.property_name || 'Propiedad desconocida' }}</strong>
              </td>
              <td style="font-family:var(--font-mono);font-size:12px;color:var(--pia-text-3)">
                {{ formatDate(doc.created_at) }}
              </td>
              <td style="text-align:right">
                <div style="display:inline-flex;gap:2px">
                  <button class="pia-icon-btn" style="width:28px;height:28px" title="Descargar PDF"
                    :disabled="!doc.pdf_url || downloadingId === doc.id"
                    @click="downloadDocument(doc)">
                    <svg v-if="downloadingId !== doc.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" class="pia-loader-anim"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  </button>
                  <button class="pia-icon-btn" style="width:28px;height:28px" title="Eliminar" @click="confirmDelete(doc)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--terra)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredDocuments.length === 0" class="pia-empty">
          <div class="pia-empty-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/></svg>
          </div>
          <div>{{ hasActiveFilters ? 'Sin documentos con estos filtros' : 'No hay documentos generados' }}</div>
          <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm" @click="clearFilters">Limpiar filtros</button>
          <button v-else class="pia-btn pia-btn-primary pia-btn-sm" @click="openTypeSelectorDialog">Nuevo documento</button>
        </div>
      </div>
      <div v-if="filteredDocuments.length > 0" class="pia-tbl-footer">
        <span>{{ filteredDocuments.length }} de {{ documents.length }} documentos</span>
      </div>
    </div>

    <DocumentTypeSelectorDialog v-model:open="typeSelectorDialogOpen" @select="handleTypeSelect" />
    <CorretajeDialog v-model:open="corretajeDialogOpen" @success="handleDialogSuccess" />
    <BoletoDialog v-model:open="boletoDialogOpen" @success="handleDialogSuccess" />
    <EntregaLlavesDialog v-model:open="entregaLlavesDialogOpen" @success="handleDialogSuccess" />

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
          <Button variant="outline" @click="deleteDialogOpen = false" :disabled="deleting">Cancelar</Button>
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
import { Loader2 } from 'lucide-vue-next'
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
function getDocumentTypeChipClass(type: LegalDocumentType): string {
  const map: Record<LegalDocumentType, string> = {
    corretaje: 'neutral',
    boleto_compraventa: 'up',
    entrega_llaves: 'warn',
  }
  return map[type] || 'neutral'
}

function getDocumentTypeLabel(type: LegalDocumentType): string {
  const labels: Record<LegalDocumentType, string> = {
    corretaje: 'Autorización de Corretaje',
    boleto_compraventa: 'Boleto de Compraventa',
    entrega_llaves: 'Entrega de Llaves',
  }
  return labels[type] || type
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
