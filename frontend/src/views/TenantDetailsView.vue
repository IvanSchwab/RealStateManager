<template>
  <MainLayout>
    <div class="p-6">
      <!-- Loading state -->
      <div v-if="loading" class="py-12 text-center text-muted-foreground">
        <Loader2 class="w-8 h-8 mx-auto animate-spin" />
        <p class="mt-2">Loading tenant...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">Error loading tenant</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadTenant">
          Retry
        </Button>
      </div>

      <!-- Not found state -->
      <div v-else-if="!tenant" class="py-12 text-center">
        <Users class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-lg font-medium text-muted-foreground mb-2">Tenant not found</p>
        <Button variant="outline" @click="goBack">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Back to Tenants
        </Button>
      </div>

      <!-- Tenant details -->
      <template v-else>
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <Button variant="ghost" size="sm" class="mb-2" @click="goBack">
              <ArrowLeft class="w-4 h-4 mr-2" />
              Back to Tenants
            </Button>
            <h1 class="text-2xl font-bold">{{ tenant.last_name }}, {{ tenant.first_name }}</h1>
            <p class="text-muted-foreground mt-1">
              <Badge :variant="getStatusVariant(tenant.status)" class="capitalize">
                {{ tenant.status }}
              </Badge>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" @click="openEditDialog">
              <Pencil class="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" @click="openDeleteDialog">
              <Trash2 class="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <!-- Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Column -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Personal Information Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl class="grid grid-cols-2 gap-4">
                  <div>
                    <dt class="text-sm text-muted-foreground">Full Name</dt>
                    <dd class="font-medium">{{ tenant.first_name }} {{ tenant.last_name }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">DNI</dt>
                    <dd class="font-medium">{{ tenant.dni ?? '-' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">CUIT/CUIL</dt>
                    <dd class="font-medium">{{ tenant.cuit_cuil ?? '-' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Email</dt>
                    <dd class="font-medium">
                      <a
                        v-if="tenant.email"
                        :href="`mailto:${tenant.email}`"
                        class="text-primary hover:underline"
                      >
                        {{ tenant.email }}
                      </a>
                      <span v-else>-</span>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Phone</dt>
                    <dd class="font-medium">
                      <a
                        :href="`tel:${tenant.phone}`"
                        class="text-primary hover:underline"
                      >
                        {{ tenant.phone }}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Address</dt>
                    <dd class="font-medium">{{ tenant.address ?? '-' }}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <!-- Employment Information Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Employment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div v-if="tenant.employer || tenant.monthly_income" class="space-y-4">
                  <dl class="grid grid-cols-2 gap-4">
                    <div>
                      <dt class="text-sm text-muted-foreground">Employer</dt>
                      <dd class="font-medium">{{ tenant.employer ?? '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-sm text-muted-foreground">Employer Phone</dt>
                      <dd class="font-medium">{{ tenant.employer_phone ?? '-' }}</dd>
                    </div>
                  </dl>
                  <div class="pt-4 border-t">
                    <dt class="text-sm text-muted-foreground">Monthly Income</dt>
                    <dd class="text-2xl font-bold text-primary">
                      {{ formatCurrency(tenant.monthly_income) }}
                    </dd>
                  </div>
                </div>
                <p v-else class="text-muted-foreground text-sm">No employment information</p>
              </CardContent>
            </Card>

            <!-- Documents Card -->
            <Card>
              <CardHeader class="flex flex-row items-center justify-between">
                <CardTitle class="text-lg">Documents</CardTitle>
                <Button size="sm" @click="triggerFileUpload">
                  <Upload class="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </CardHeader>
              <CardContent>
                <!-- Upload input (hidden) -->
                <input
                  ref="fileInputRef"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  class="hidden"
                  @change="handleFileSelect"
                />

                <!-- Document type select and upload preview -->
                <div v-if="selectedFile" class="mb-4 p-4 border border-border rounded-lg bg-muted/30">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                      <FileIcon class="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p class="font-medium text-sm">{{ selectedFile.name }}</p>
                        <p class="text-xs text-muted-foreground">
                          {{ formatFileSize(selectedFile.size) }}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" @click="clearSelectedFile">
                      <X class="w-4 h-4" />
                    </Button>
                  </div>

                  <div class="flex items-end gap-3">
                    <div class="flex-1">
                      <Label for="docType" class="text-sm">Document Type</Label>
                      <Select v-model="selectedDocumentType">
                        <SelectTrigger class="mt-1">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="dni_frente">DNI (Frente)</SelectItem>
                            <SelectItem value="dni_dorso">DNI (Dorso)</SelectItem>
                            <SelectItem value="recibo_sueldo">Recibo de Sueldo</SelectItem>
                            <SelectItem value="garantia">Garantía</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      :disabled="!selectedDocumentType || documentsLoading"
                      @click="uploadSelectedFile"
                    >
                      <Loader2 v-if="documentsLoading" class="w-4 h-4 mr-2 animate-spin" />
                      Upload
                    </Button>
                  </div>
                </div>

                <!-- Documents loading -->
                <div v-if="documentsLoading && !selectedFile" class="py-4 text-center">
                  <Loader2 class="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                </div>

                <!-- Documents list -->
                <div v-else-if="documents.length > 0" class="space-y-2">
                  <div
                    v-for="doc in documents"
                    :key="doc.id"
                    class="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div class="flex items-center gap-3">
                      <div class="p-2 bg-muted rounded">
                        <component :is="getDocumentIcon(doc.mime_type)" class="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p class="font-medium text-sm">{{ doc.file_name }}</p>
                        <div class="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" class="text-xs">
                            {{ getDocumentTypeLabel(doc.document_type) }}
                          </Badge>
                          <span>{{ formatFileSize(doc.file_size) }}</span>
                          <span>{{ formatDate(doc.created_at) }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Download"
                        @click="handleDownload(doc)"
                      >
                        <Download class="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        @click="confirmDeleteDocument(doc)"
                      >
                        <Trash2 class="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>

                <!-- Empty state -->
                <div v-else class="py-8 text-center">
                  <FileText class="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p class="text-sm text-muted-foreground mb-3">No documents uploaded yet</p>
                  <Button variant="outline" size="sm" @click="triggerFileUpload">
                    <Upload class="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardContent>
            </Card>

            <!-- Notes Card -->
            <Card v-if="tenant.notes">
              <CardHeader>
                <CardTitle class="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p class="text-muted-foreground whitespace-pre-wrap">{{ tenant.notes }}</p>
              </CardContent>
            </Card>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Emergency Contact Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div v-if="tenant.emergency_contact_name || tenant.emergency_contact_phone" class="space-y-3">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User class="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p class="font-medium">{{ tenant.emergency_contact_name ?? '-' }}</p>
                      <p v-if="tenant.emergency_contact_phone" class="text-sm text-muted-foreground">
                        <a
                          :href="`tel:${tenant.emergency_contact_phone}`"
                          class="text-primary hover:underline"
                        >
                          {{ tenant.emergency_contact_phone }}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
                <p v-else class="text-muted-foreground text-sm">No emergency contact</p>
              </CardContent>
            </Card>

            <!-- Metadata Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <div>
                  <p class="text-sm text-muted-foreground">Created</p>
                  <p class="font-medium">{{ formatDateTime(tenant.created_at) }}</p>
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">Last Updated</p>
                  <p class="font-medium">{{ formatDateTime(tenant.updated_at) }}</p>
                </div>
              </CardContent>
            </Card>

            <!-- Contracts Placeholder -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Contracts</CardTitle>
              </CardHeader>
              <CardContent>
                <p class="text-sm text-muted-foreground">
                  Contract history will be displayed here in a future update.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </template>

      <!-- Tenant Dialog (Edit) -->
      <TenantDialog
        v-model:open="dialogOpen"
        :tenant-id="tenantId"
        @success="handleEditSuccess"
      />

      <!-- Delete Confirmation Dialog -->
      <DeleteTenantDialog
        v-if="tenant"
        v-model:open="deleteDialogOpen"
        :tenant-id="tenant.id"
        :tenant-name="`${tenant.last_name}, ${tenant.first_name}`"
        @confirm="handleDeleteSuccess"
      />

      <!-- Delete Document Confirmation -->
      <AlertDialog :open="deleteDocDialogOpen" @update:open="deleteDocDialogOpen = $event">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{{ documentToDelete?.file_name }}"</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              @click="handleDeleteDocument"
            >
              <Loader2 v-if="documentsLoading" class="w-4 h-4 mr-2 animate-spin" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import TenantDialog from '@/components/tenants/TenantDialog.vue'
import DeleteTenantDialog from '@/components/tenants/DeleteTenantDialog.vue'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  Loader2,
  User,
  Upload,
  Download,
  FileText,
  File as FileIcon,
  Image,
  X
} from 'lucide-vue-next'
import { useTenants } from '@/composables/useTenants'
import { useDocuments } from '@/composables/useDocuments'
import type { Tenant, Document, DocumentType } from '@/types'

const route = useRoute()
const router = useRouter()
const { fetchTenantById, loading, error } = useTenants()
const {
  documents,
  loading: documentsLoading,
  fetchDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  getDocumentTypeLabel,
  formatFileSize: formatFileSizeUtil
} = useDocuments()

const tenant = ref<Tenant | null>(null)
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)

// Document management state
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const selectedDocumentType = ref<DocumentType | ''>('')
const deleteDocDialogOpen = ref(false)
const documentToDelete = ref<Document | null>(null)

const tenantId = computed(() => route.params.id as string)

// Methods
function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatFileSize(bytes: number | null): string {
  return formatFileSizeUtil(bytes)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'activo':
      return 'default'
    case 'inactivo':
      return 'secondary'
    default:
      return 'default'
  }
}

function getDocumentIcon(mimeType: string | null) {
  if (mimeType?.startsWith('image/')) return Image
  return FileText
}

function goBack() {
  router.push({ name: 'tenants' })
}

function openEditDialog() {
  dialogOpen.value = true
}

function openDeleteDialog() {
  deleteDialogOpen.value = true
}

// Document methods
function triggerFileUpload() {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      alert('File type not allowed. Please upload PDF, JPG, or PNG files only.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB.')
      return
    }

    selectedFile.value = file
    selectedDocumentType.value = ''
  }
  // Reset input
  input.value = ''
}

function clearSelectedFile() {
  selectedFile.value = null
  selectedDocumentType.value = ''
}

async function uploadSelectedFile() {
  if (!selectedFile.value || !selectedDocumentType.value || !tenant.value) return

  try {
    await uploadDocument(
      selectedFile.value,
      'tenant',
      tenant.value.id,
      selectedDocumentType.value as DocumentType
    )
    alert('Document uploaded successfully!')
    clearSelectedFile()
    // Refresh documents list
    await fetchDocuments('tenant', tenant.value.id)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to upload document'
    alert(`Error: ${message}`)
  }
}

async function handleDownload(doc: Document) {
  try {
    await downloadDocument(doc)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to download document'
    alert(`Error: ${message}`)
  }
}

function confirmDeleteDocument(doc: Document) {
  documentToDelete.value = doc
  deleteDocDialogOpen.value = true
}

async function handleDeleteDocument() {
  if (!documentToDelete.value || !tenant.value) return

  try {
    await deleteDocument(documentToDelete.value.id)
    alert('Document deleted successfully!')
    documentToDelete.value = null
    deleteDocDialogOpen.value = false
    // Refresh documents list
    await fetchDocuments('tenant', tenant.value.id)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to delete document'
    alert(`Error: ${message}`)
  }
}

async function loadTenant() {
  const data = await fetchTenantById(tenantId.value)
  tenant.value = data

  // Load documents after tenant is loaded
  if (data) {
    await fetchDocuments('tenant', data.id)
  }
}

async function handleEditSuccess() {
  await loadTenant()
}

function handleDeleteSuccess() {
  router.push({ name: 'tenants' })
}

onMounted(() => {
  loadTenant()
})
</script>
