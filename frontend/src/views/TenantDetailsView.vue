<template>
  <div class="p-6">
      <!-- Loading state -->
      <div v-if="loading" class="py-12 text-center text-muted-foreground">
        <Loader2 class="w-8 h-8 mx-auto animate-spin" />
        <p class="mt-2">{{ $t('tenants.loadingTenants') }}</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">{{ $t('tenants.errorLoading') }}</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadTenant">
          {{ $t('common.retry') }}
        </Button>
      </div>

      <!-- Not found state -->
      <div v-else-if="!tenant" class="py-12 text-center">
        <Users class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-lg font-medium text-muted-foreground mb-2">{{ $t('tenants.tenantNotFound') }}</p>
        <Button variant="outline" @click="goBack">
          <ArrowLeft class="w-4 h-4 mr-2" />
          {{ $t('tenants.backToTenants') }}
        </Button>
      </div>

      <!-- Tenant details -->
      <template v-else>
        <!-- Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <Button variant="ghost" size="sm" class="mb-2" @click="goBack">
              <ArrowLeft class="w-4 h-4 mr-2" />
              {{ $t('tenants.backToTenants') }}
            </Button>
            <h1 class="text-2xl font-bold">{{ tenant.last_name }}, {{ tenant.first_name }}</h1>
            <p class="text-muted-foreground mt-1">
              <Badge :variant="getStatusVariant(tenant.status)">
                {{ $t(`tenants.${tenant.status}`) }}
              </Badge>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" @click="openEditDialog">
              <Pencil class="w-4 h-4 mr-2" />
              {{ $t('common.edit') }}
            </Button>
            <Button variant="destructive" @click="openDeleteDialog">
              <Trash2 class="w-4 h-4 mr-2" />
              {{ $t('common.delete') }}
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
                <CardTitle class="text-lg">{{ $t('tenants.personalInfo') }}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('common.name') }}</dt>
                    <dd class="font-medium">{{ tenant.first_name }} {{ tenant.last_name }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('tenants.dni') }}</dt>
                    <dd class="font-medium">{{ tenant.dni ?? '-' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('tenants.cuitCuil') }}</dt>
                    <dd class="font-medium">{{ tenant.cuit_cuil ?? '-' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">{{ $t('common.email') }}</dt>
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
                    <dt class="text-sm text-muted-foreground">{{ $t('common.phone') }}</dt>
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
                    <dt class="text-sm text-muted-foreground">{{ $t('common.address') }}</dt>
                    <dd class="font-medium">{{ tenant.address ?? '-' }}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <!-- Employment Information Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('tenants.employmentInfo') }}</CardTitle>
              </CardHeader>
              <CardContent>
                <div v-if="tenant.employer || tenant.monthly_income" class="space-y-4">
                  <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt class="text-sm text-muted-foreground">{{ $t('tenants.employer') }}</dt>
                      <dd class="font-medium">{{ tenant.employer ?? '-' }}</dd>
                    </div>
                    <div>
                      <dt class="text-sm text-muted-foreground">{{ $t('tenants.employerPhone') }}</dt>
                      <dd class="font-medium">{{ tenant.employer_phone ?? '-' }}</dd>
                    </div>
                  </dl>
                  <div class="pt-4 border-t">
                    <dt class="text-sm text-muted-foreground">{{ $t('tenants.monthlyIncome') }}</dt>
                    <dd class="text-2xl font-bold text-primary">
                      {{ formatCurrency(tenant.monthly_income) }}
                    </dd>
                  </div>
                </div>
                <p v-else class="text-muted-foreground text-sm">{{ $t('tenants.noEmploymentInfo') }}</p>
              </CardContent>
            </Card>

            <!-- Documents Card -->
            <Card>
              <CardHeader class="flex flex-row items-center justify-between">
                <CardTitle class="text-lg">{{ $t('tenants.documents') }}</CardTitle>
                <Button size="sm" @click="triggerFileUpload">
                  <Upload class="w-4 h-4 mr-2" />
                  {{ $t('common.upload') }}
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
                      <Label for="docType" class="text-sm">{{ $t('tenants.documentType') }}</Label>
                      <Select v-model="selectedDocumentType">
                        <SelectTrigger class="mt-1">
                          <SelectValue :placeholder="$t('tenants.selectDocumentType')" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="dni_frente">{{ $t('tenants.dniFront') }}</SelectItem>
                            <SelectItem value="dni_dorso">{{ $t('tenants.dniBack') }}</SelectItem>
                            <SelectItem value="recibo_sueldo">{{ $t('tenants.payStub') }}</SelectItem>
                            <SelectItem value="garantia">{{ $t('tenants.guarantee') }}</SelectItem>
                            <SelectItem value="otro">{{ $t('tenants.other') }}</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      :disabled="!selectedDocumentType || documentsLoading"
                      @click="uploadSelectedFile"
                    >
                      <Loader2 v-if="documentsLoading" class="w-4 h-4 mr-2 animate-spin" />
                      {{ $t('common.upload') }}
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
                          <span>{{ formatDocDate(doc.created_at) }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        :title="$t('common.view')"
                        @click="handleView(doc)"
                      >
                        <Eye class="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        :title="$t('common.download')"
                        @click="handleDownload(doc)"
                      >
                        <Download class="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        :title="$t('common.delete')"
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
                  <p class="text-sm text-muted-foreground mb-3">{{ $t('tenants.noDocuments') }}</p>
                  <Button variant="outline" size="sm" @click="triggerFileUpload">
                    <Upload class="w-4 h-4 mr-2" />
                    {{ $t('tenants.uploadDocument') }}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <!-- Notes Card -->
            <Card v-if="tenant.notes">
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('common.notes') }}</CardTitle>
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
                <CardTitle class="text-lg">{{ $t('tenants.emergencyContact') }}</CardTitle>
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
                <p v-else class="text-muted-foreground text-sm">{{ $t('tenants.noEmergencyContact') }}</p>
              </CardContent>
            </Card>

            <!-- Metadata Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('common.details') }}</CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <div>
                  <p class="text-sm text-muted-foreground">{{ $t('common.created') }}</p>
                  <p class="font-medium">{{ formatDateTime(tenant.created_at) }}</p>
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">{{ $t('common.lastUpdated') }}</p>
                  <p class="font-medium">{{ formatDateTime(tenant.updated_at) }}</p>
                </div>
              </CardContent>
            </Card>

            <!-- Contract History -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">{{ $t('contractHistory.title') }}</CardTitle>
              </CardHeader>
              <CardContent>
                <ContractHistoryList
                  v-if="tenant"
                  entity-type="tenant"
                  :entity-id="tenant.id"
                />
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
            <AlertDialogTitle>{{ $t('tenants.deleteDocument') }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ $t('tenants.deleteDocumentConfirm', { name: documentToDelete?.file_name }) }}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{{ $t('common.cancel') }}</AlertDialogCancel>
            <AlertDialogAction
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              @click="handleDeleteDocument"
            >
              <Loader2 v-if="documentsLoading" class="w-4 h-4 mr-2 animate-spin" />
              {{ $t('common.delete') }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
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
import ContractHistoryList from '@/components/contracts/ContractHistoryList.vue'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  Loader2,
  User,
  Upload,
  Download,
  Eye,
  FileText,
  File as FileIcon,
  Image,
  X
} from 'lucide-vue-next'
import { useTenants } from '@/composables/useTenants'
import { useDocuments } from '@/composables/useDocuments'
import { useDate } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import type { Tenant, Document, DocumentType } from '@/types'

const toast = useToast()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { fetchTenantById, loading, error } = useTenants()
const { formatDate, formatDateTime } = useDate()
const { formatCurrency } = useFormatCurrency()
const {
  documents,
  loading: documentsLoading,
  fetchDocuments,
  uploadDocument,
  viewDocument,
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
function formatFileSize(bytes: number | null): string {
  return formatFileSizeUtil(bytes)
}

function formatDocDate(dateString: string): string {
  return formatDate(dateString)
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
      toast.warning(t('toast.fileTypeNotAllowed'))
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.warning(t('toast.fileTooLarge'))
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
    toast.success(t('toast.documentUploaded'))
    clearSelectedFile()
    // Refresh documents list
    await fetchDocuments('tenant', tenant.value.id)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('errors.uploadError')
    toast.error(`${t('common.error')}: ${message}`)
  }
}

async function handleDownload(doc: Document) {
  try {
    await downloadDocument(doc)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('errors.downloadError')
    toast.error(`${t('common.error')}: ${message}`)
  }
}

async function handleView(doc: Document) {
  try {
    await viewDocument(doc)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('errors.downloadError')
    toast.error(`${t('common.error')}: ${message}`)
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
    toast.success(t('toast.documentDeleted'))
    documentToDelete.value = null
    deleteDocDialogOpen.value = false
    // Refresh documents list
    await fetchDocuments('tenant', tenant.value.id)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('errors.deleteError')
    toast.error(`${t('common.error')}: ${message}`)
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
