<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3" style="color: var(--pia-text-3)">
      <Loader2 class="w-8 h-8 animate-spin" />
      <p class="text-sm">{{ $t('tenants.loadingTenants') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-20 gap-3">
      <p class="font-medium" style="color: var(--terra)">{{ $t('tenants.errorLoading') }}</p>
      <p class="text-sm" style="color: var(--pia-text-3)">{{ error }}</p>
      <button class="pia-btn pia-btn-ghost" @click="loadTenant">{{ $t('common.retry') }}</button>
    </div>

    <!-- Not found state -->
    <div v-else-if="!tenant" class="flex flex-col items-center justify-center py-20 gap-3" style="color: var(--pia-text-3)">
      <Users class="w-10 h-10" />
      <p class="font-medium" style="color: var(--pia-text-2)">{{ $t('tenants.tenantNotFound') }}</p>
      <button class="pia-btn pia-btn-ghost" @click="goBack">
        <ArrowLeft class="w-4 h-4" />
        {{ $t('tenants.backToTenants') }}
      </button>
    </div>

    <!-- Tenant details -->
    <template v-else>
      <!-- Page header -->
      <div class="pia-page-header" style="flex-direction: column; gap: 16px; align-items: stretch">
        <!-- Back link -->
        <button class="flex items-center gap-1.5 w-fit pia-btn-back" @click="goBack">
          <ArrowLeft class="w-3.5 h-3.5" />
          <span>{{ $t('tenants.backToTenants') }}</span>
        </button>

        <!-- Title row -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <!-- Avatar -->
            <div class="tenant-detail-avatar">
              {{ getInitials(tenant.first_name, tenant.last_name) }}
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h1 style="font-size: 22px; font-weight: 600; color: var(--pia-text); letter-spacing: -0.02em; margin: 0">
                  {{ tenant.first_name }} {{ tenant.last_name }}
                </h1>
                <span class="pia-status" :class="getStatusClass(tenant.status)">
                  <span class="dot" />
                  {{ $t(`tenants.${tenant.status}`) }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-3" style="font-size: 12.5px; color: var(--pia-text-4); font-family: var(--font-mono)">
                <span v-if="tenant.dni">DNI {{ tenant.dni }}</span>
                <span v-if="tenant.cuit_cuil" class="hidden sm:inline">· CUIT {{ tenant.cuit_cuil }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button class="pia-btn pia-btn-ghost" @click="openEditDialog">
              <Pencil class="w-3.5 h-3.5" />
              {{ $t('common.edit') }}
            </button>
            <button class="pia-btn pia-btn-danger" @click="openDeleteDialog">
              <Trash2 class="w-3.5 h-3.5" />
              {{ $t('common.delete') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Content grid: 2/3 + 1/3 -->
      <div class="pia-grid pia-grid-main" style="align-items: start">
        <!-- Main column -->
        <div style="display: flex; flex-direction: column; gap: var(--gap)">

          <!-- Información personal -->
          <div class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">{{ $t('tenants.personalInfo') }}</span>
            </div>
            <div class="pia-detail-section-body">
              <dl class="pia-detail-grid">
                <div class="pia-detail-field">
                  <dt class="pia-detail-label">{{ $t('common.name') }}</dt>
                  <dd class="pia-detail-value">{{ tenant.first_name }} {{ tenant.last_name }}</dd>
                </div>
                <div class="pia-detail-field">
                  <dt class="pia-detail-label">{{ $t('tenants.dni') }}</dt>
                  <dd class="pia-detail-value" style="font-family: var(--font-mono)">{{ tenant.dni ?? '-' }}</dd>
                </div>
                <div class="pia-detail-field">
                  <dt class="pia-detail-label">{{ $t('tenants.cuitCuil') }}</dt>
                  <dd class="pia-detail-value" style="font-family: var(--font-mono)">{{ tenant.cuit_cuil ?? '-' }}</dd>
                </div>
                <div class="pia-detail-field">
                  <dt class="pia-detail-label">{{ $t('common.email') }}</dt>
                  <dd class="pia-detail-value">
                    <a v-if="tenant.email" :href="`mailto:${tenant.email}`" class="pia-detail-link">{{ tenant.email }}</a>
                    <span v-else style="color: var(--pia-text-4)">-</span>
                  </dd>
                </div>
                <div class="pia-detail-field">
                  <dt class="pia-detail-label">{{ $t('common.phone') }}</dt>
                  <dd class="pia-detail-value">
                    <a :href="`tel:${tenant.phone}`" class="pia-detail-link" style="font-family: var(--font-mono)">{{ tenant.phone }}</a>
                  </dd>
                </div>
                <div class="pia-detail-field">
                  <dt class="pia-detail-label">{{ $t('common.address') }}</dt>
                  <dd class="pia-detail-value">{{ tenant.address ?? '-' }}</dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- Información laboral -->
          <div class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">{{ $t('tenants.employmentInfo') }}</span>
            </div>
            <div class="pia-detail-section-body">
              <div v-if="tenant.employer || tenant.monthly_income">
                <dl class="pia-detail-grid">
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">{{ $t('tenants.employer') }}</dt>
                    <dd class="pia-detail-value">{{ tenant.employer ?? '-' }}</dd>
                  </div>
                  <div class="pia-detail-field">
                    <dt class="pia-detail-label">{{ $t('tenants.employerPhone') }}</dt>
                    <dd class="pia-detail-value" style="font-family: var(--font-mono)">{{ tenant.employer_phone ?? '-' }}</dd>
                  </div>
                </dl>
                <div v-if="tenant.monthly_income" class="pia-income-block">
                  <span class="pia-detail-label">{{ $t('tenants.monthlyIncome') }}</span>
                  <div class="pia-income-value">{{ formatCurrency(tenant.monthly_income) }}</div>
                </div>
              </div>
              <p v-else style="font-size: 13px; color: var(--pia-text-4)">{{ $t('tenants.noEmploymentInfo') }}</p>
            </div>
          </div>

          <!-- Documentos -->
          <div class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">{{ $t('tenants.documents') }}</span>
              <button class="pia-btn pia-btn-primary pia-btn-sm" @click="triggerFileUpload">
                <Upload class="w-3.5 h-3.5" />
                {{ $t('common.upload') }}
              </button>
            </div>
            <div class="pia-detail-section-body">
              <!-- Hidden file input -->
              <input ref="fileInputRef" type="file" accept=".pdf,.jpg,.jpeg,.png" class="hidden" @change="handleFileSelect" />

              <!-- Upload preview -->
              <div v-if="selectedFile" class="pia-upload-preview">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <FileIcon class="w-7 h-7" style="color: var(--pia-text-3)" />
                    <div>
                      <p style="font-size: 13px; font-weight: 500; color: var(--pia-text)">{{ selectedFile.name }}</p>
                      <p style="font-size: 11.5px; color: var(--pia-text-4); margin-top: 1px">{{ formatFileSize(selectedFile.size) }}</p>
                    </div>
                  </div>
                  <button class="pia-icon-btn" style="width: 28px; height: 28px" @click="clearSelectedFile">
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>
                <div class="flex items-end gap-3">
                  <div class="flex-1">
                    <Label for="docType" class="pia-detail-label" style="display: block; margin-bottom: 4px">{{ $t('tenants.documentType') }}</Label>
                    <Select v-model="selectedDocumentType">
                      <SelectTrigger>
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
                  <button
                    class="pia-btn pia-btn-primary"
                    :disabled="!selectedDocumentType || documentsLoading"
                    style="opacity: var(--btn-opacity, 1)"
                    @click="uploadSelectedFile"
                  >
                    <Loader2 v-if="documentsLoading" class="w-3.5 h-3.5 animate-spin" />
                    {{ $t('common.upload') }}
                  </button>
                </div>
              </div>

              <!-- Documents loading -->
              <div v-if="documentsLoading && !selectedFile" class="flex justify-center py-6">
                <Loader2 class="w-5 h-5 animate-spin" style="color: var(--pia-text-4)" />
              </div>

              <!-- Documents grid -->
              <div v-else-if="documents.length > 0" class="pia-doc-grid">
                <div v-for="doc in documents" :key="doc.id" class="pia-doc-card">
                  <div class="pia-doc-card-top">
                    <span class="pia-doc-ext-badge">{{ getFileExtBadge(doc) }}</span>
                    <span class="pia-doc-card-name">{{ doc.file_name }}</span>
                  </div>
                  <div class="pia-doc-card-bottom">
                    <span class="pia-doc-card-meta">
                      {{ formatFileSize(doc.file_size) }} · {{ formatDocDate(doc.created_at) }}
                    </span>
                    <div class="flex items-center gap-0.5">
                      <button class="pia-icon-btn" style="width: 26px; height: 26px" :title="$t('common.view')" @click="handleView(doc)">
                        <Eye class="w-3 h-3" />
                      </button>
                      <button class="pia-icon-btn" style="width: 26px; height: 26px" :title="$t('common.download')" @click="handleDownload(doc)">
                        <Download class="w-3 h-3" />
                      </button>
                      <button class="pia-icon-btn pia-icon-btn-danger" style="width: 26px; height: 26px" :title="$t('common.delete')" @click="confirmDeleteDocument(doc)">
                        <Trash2 class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else class="pia-empty">
                <div class="pia-empty-mark">
                  <FileText class="w-4 h-4" />
                </div>
                <div>{{ $t('tenants.noDocuments') }}</div>
                <button class="pia-btn pia-btn-ghost pia-btn-sm" @click="triggerFileUpload">
                  <Upload class="w-3.5 h-3.5" />
                  {{ $t('tenants.uploadDocument') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Notas -->
          <div v-if="tenant.notes" class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">{{ $t('common.notes') }}</span>
            </div>
            <div class="pia-detail-section-body">
              <p style="font-size: 13px; color: var(--pia-text-2); white-space: pre-wrap; line-height: 1.6">{{ tenant.notes }}</p>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div style="display: flex; flex-direction: column; gap: var(--gap)">

          <!-- Score crediticio -->
          <div class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">Score crediticio</span>
            </div>
            <div class="pia-detail-section-body">
              <div class="flex items-baseline gap-1 mb-3">
                <span class="pia-score-value">{{ tenantScore }}</span>
                <span style="font-size: 13px; color: var(--pia-text-4)">/ 100</span>
              </div>
              <div class="pia-score-bar-track">
                <div class="pia-score-bar-fill" :class="getScoreBarClass(tenantScore)" :style="{ width: tenantScore + '%' }" />
              </div>
            </div>
          </div>

          <!-- Contacto de emergencia -->
          <div class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">{{ $t('tenants.emergencyContact') }}</span>
            </div>
            <div class="pia-detail-section-body">
              <div v-if="tenant.emergency_contact_name || tenant.emergency_contact_phone" class="flex items-start gap-3">
                <div class="pia-contact-avatar">
                  <User class="w-4 h-4" style="color: var(--brand-700)" />
                </div>
                <div>
                  <p style="font-size: 13.5px; font-weight: 500; color: var(--pia-text)">{{ tenant.emergency_contact_name ?? '-' }}</p>
                  <p v-if="tenant.emergency_contact_phone" style="margin-top: 2px">
                    <a :href="`tel:${tenant.emergency_contact_phone}`" class="pia-detail-link" style="font-family: var(--font-mono); font-size: 12.5px">
                      {{ tenant.emergency_contact_phone }}
                    </a>
                  </p>
                </div>
              </div>
              <p v-else style="font-size: 13px; color: var(--pia-text-4)">{{ $t('tenants.noEmergencyContact') }}</p>
            </div>
          </div>

          

          <!-- Historial de contratos -->
          <div class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">{{ $t('contractHistory.title') }}</span>
            </div>
            <div class="pia-detail-section-body" style="padding: 0">
              <ContractHistoryList v-if="tenant" entity-type="tenant" :entity-id="tenant.id" />
            </div>
          </div>
          <!-- Detalles (metadata) -->
          <div class="pia-card" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 8px">
            <p class="pia-meta-row">
              <span class="pia-meta-label">{{ $t('common.created') }}</span>
              <span class="pia-meta-date">{{ formatDateTime(tenant.created_at) }}</span>
            </p>
            <p class="pia-meta-row">
              <span class="pia-meta-label">{{ $t('common.lastUpdated') }}</span>
              <span class="pia-meta-date">{{ formatDateTime(tenant.updated_at) }}</span>
            </p>
          </div>
        </div>
      </div>
    </template>

    <!-- Edit dialog -->
    <TenantDialog v-model:open="dialogOpen" :tenant-id="tenantId" @success="handleEditSuccess" />

    <!-- Delete dialog -->
    <DeleteTenantDialog
      v-if="tenant"
      v-model:open="deleteDialogOpen"
      :tenant-id="tenant.id"
      :tenant-name="`${tenant.last_name}, ${tenant.first_name}`"
      @confirm="handleDeleteSuccess"
    />

    <!-- Delete document dialog -->
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
  formatFileSize: formatFileSizeUtil
} = useDocuments()

const tenant = ref<Tenant | null>(null)
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const selectedDocumentType = ref<DocumentType | ''>('')
const deleteDocDialogOpen = ref(false)
const documentToDelete = ref<Document | null>(null)

const tenantId = computed(() => route.params.id as string)

const tenantScore = computed(() => {
  const t = tenant.value
  if (!t) return 0
  let score = 0
  if (t.dni) score += 20
  if (t.email) score += 15
  if (t.phone) score += 15
  if (t.employer) score += 20
  if (t.monthly_income && t.monthly_income > 0) score += 20
  if (t.cuit_cuil) score += 10
  return score
})

function getScoreBarClass(score: number): string {
  if (score >= 80) return 'score-high'
  if (score >= 50) return 'score-medium'
  return 'score-low'
}

function getInitials(first: string, last: string) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase()
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'activo': return 'ok'
    case 'inactivo': return 'draft'
    default: return 'draft'
  }
}

function formatFileSize(bytes: number | null): string {
  return formatFileSizeUtil(bytes)
}

function formatDocDate(dateString: string): string {
  return formatDate(dateString)
}

function getFileExtBadge(doc: Document): string {
  if (doc.mime_type === 'application/pdf') return 'PDF'
  if (doc.mime_type?.startsWith('image/')) {
    const ext = doc.mime_type.split('/')[1]?.toUpperCase()
    return ext === 'JPEG' ? 'JPG' : (ext || 'IMG')
  }
  return doc.file_name.split('.').pop()?.toUpperCase().slice(0, 4) || 'DOC'
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

function triggerFileUpload() {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const file = input.files[0]

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      toast.warning(t('toast.fileTypeNotAllowed'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning(t('toast.fileTooLarge'))
      return
    }

    selectedFile.value = file
    selectedDocumentType.value = ''
  }
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
    await fetchDocuments('tenant', tenant.value.id)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('errors.deleteError')
    toast.error(`${t('common.error')}: ${message}`)
  }
}

async function loadTenant() {
  const data = await fetchTenantById(tenantId.value)
  tenant.value = data

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

<style scoped>
/* On mobile the topbar is fixed (64px) but pia-content only gives 16px top padding.
   Add the missing offset directly to the page header. */
@media (max-width: 1023px) {
  .pia-page-header {
    padding-top: calc(var(--app-header-height) - 16px);
  }
}

/* Back link */
.pia-btn-back {
  font-size: 12.5px;
  color: var(--pia-text-3);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: color 0.12s;
}

.pia-btn-back:hover {
  color: var(--pia-text-2);
}

/* Tenant avatar */
.tenant-detail-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--brand-100);
  color: var(--brand-700);
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

/* Danger button */
.pia-btn-danger {
  background: var(--terra-50, #fef2f2);
  color: var(--terra);
  border: 1px solid color-mix(in oklch, var(--terra) 20%, transparent);
}

.pia-btn-danger:hover {
  background: color-mix(in oklch, var(--terra) 12%, white);
}

/* Section header */
.pia-detail-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--pia-border);
  background: var(--pia-surface-2);
}

.pia-detail-section-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pia-text-3);
}

/* Section body */
.pia-detail-section-body {
  padding: 18px;
}

/* Field grid */
.pia-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px 32px;
}

@media (max-width: 540px) {
  .pia-detail-grid {
    grid-template-columns: 1fr;
  }
}

.pia-detail-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pia-detail-label {
  font-size: 10.5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--pia-text-4);
}

.pia-detail-value {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--pia-text);
}

.pia-detail-link {
  color: var(--brand-700);
  text-decoration: none;
  transition: opacity 0.12s;
}

.pia-detail-link:hover {
  text-decoration: underline;
}

/* Income block */
.pia-income-block {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid var(--pia-border);
}

.pia-income-value {
  font-size: 26px;
  font-weight: 600;
  color: var(--brand-700);
  letter-spacing: -0.02em;
  margin-top: 4px;
}

/* Document rows */
.pia-doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--pia-border);
  border-radius: var(--pia-radius-sm);
  gap: 12px;
  transition: background 0.12s;
}

.pia-doc-row:hover {
  background: var(--pia-surface-2);
}

.pia-doc-icon-wrap {
  width: 32px;
  height: 32px;
  background: var(--pia-surface-2);
  border-radius: 6px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.pia-doc-type-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 7px;
  background: var(--pia-surface-2);
  border: 1px solid var(--pia-border);
  border-radius: 20px;
  color: var(--pia-text-3);
}

/* Danger icon button */
.pia-icon-btn-danger {
  color: var(--terra) !important;
}

.pia-icon-btn-danger:hover {
  background: var(--terra-50, #fef2f2) !important;
}

/* Upload preview */
.pia-upload-preview {
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid var(--pia-border);
  border-radius: var(--pia-radius-sm);
  background: var(--pia-surface-2);
}

/* Emergency contact avatar */
.pia-contact-avatar {
  width: 36px;
  height: 36px;
  background: var(--brand-50);
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

/* Status badge variants */
.pia-status.draft {
  background: var(--pia-surface-2);
  color: var(--pia-text-3);
}

.pia-status.draft .dot {
  background: var(--pia-text-4);
}

/* Metadata rows */
.pia-meta-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  font-size: 12.5px;
}

.pia-meta-label {
  color: var(--pia-text-3);
  font-weight: 400;
  flex-shrink: 0;
}

.pia-meta-date {
  color: var(--pia-text);
  font-weight: 500;
}

/* Score card */
.pia-score-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--brand-700);
  letter-spacing: -0.03em;
  line-height: 1;
}

.pia-score-bar-track {
  height: 6px;
  background: var(--pia-border);
  border-radius: 3px;
  overflow: hidden;
}

.pia-score-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

.score-high { background: var(--brand-600); }
.score-medium { background: var(--amber-500); }
.score-low { background: var(--terra); }

/* Document card grid */
.pia-doc-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

@media (max-width: 560px) {
  .pia-doc-grid {
    grid-template-columns: 1fr;
  }
}

.pia-doc-card {
  border: 1px solid var(--pia-border);
  border-radius: var(--pia-radius-sm);
  overflow: hidden;
  transition: border-color 0.12s;
}

.pia-doc-card:hover {
  border-color: var(--pia-border-strong);
}

.pia-doc-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px 8px;
}

.pia-doc-ext-badge {
  font-size: 10px;
  font-weight: 700;
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
  padding: 3px 6px;
  background: var(--pia-surface-2);
  border: 1px solid var(--pia-border);
  border-radius: 4px;
  color: var(--pia-text-3);
  flex-shrink: 0;
}

.pia-doc-card-name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--pia-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pia-doc-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 8px 12px;
  border-top: 1px solid var(--pia-border);
  background: var(--pia-surface-2);
}

.pia-doc-card-meta {
  font-size: 11px;
  color: var(--pia-text-4);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
