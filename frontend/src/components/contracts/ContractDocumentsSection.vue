<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">{{ $t('contractDocuments.title') }}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- Upload Zone -->
      <div
        class="border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer"
        :class="[
          isOverDropZone
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30',
        ]"
        @click="openFileDialog"
        @dragenter.prevent="isOverDropZone = true"
        @dragleave.prevent="isOverDropZone = false"
        @dragover.prevent
        @drop.prevent="handleDropEvent"
      >
        <input
          ref="fileInputRef"
          type="file"
          multiple
          :accept="acceptedFileTypes"
          class="hidden"
          @change="handleFileSelect"
        />

        <div v-if="uploading" class="space-y-3">
          <Loader2 class="w-8 h-8 mx-auto animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">{{ $t('contractDocuments.uploading') }}</p>
          <div class="space-y-2">
            <div
              v-for="progress in uploadProgress"
              :key="progress.fileName"
              class="text-left"
            >
              <div class="flex justify-between text-xs text-muted-foreground mb-1">
                <span class="truncate max-w-[200px]">{{ progress.fileName }}</span>
                <span>{{ progress.percentage }}%</span>
              </div>
              <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary transition-all duration-300"
                  :style="{ width: `${progress.percentage}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <template v-else>
          <Upload class="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p class="text-sm font-medium">
            {{ $t('contractDocuments.dropOrClick') }}
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ $t('contractDocuments.acceptedFormats') }}
          </p>
        </template>
      </div>

      <!-- Upload Errors -->
      <div
        v-if="uploadErrors.length > 0"
        class="bg-destructive/10 border border-destructive/20 rounded-lg p-3"
      >
        <p
          v-for="(err, index) in uploadErrors"
          :key="index"
          class="text-sm text-destructive"
        >
          {{ formatUploadError(err) }}
        </p>
      </div>

      <!-- Document Type Selector Dialog -->
      <AlertDialog v-model:open="showDocTypeDialog">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{{ $t('contractDocuments.selectDocType') }}</AlertDialogTitle>
            <AlertDialogDescription>
              {{ $t('contractDocuments.selectDocTypeDesc', { count: pendingFiles.length }) }}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <Label for="docType">{{ $t('contractDocuments.documentType') }}</Label>
              <Select v-model="selectedDocType">
                <SelectTrigger>
                  <SelectValue :placeholder="$t('contractDocuments.selectType')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dni">{{ $t('contractDocuments.types.dni') }}</SelectItem>
                  <SelectItem value="payslip">{{ $t('contractDocuments.types.payslip') }}</SelectItem>
                  <SelectItem value="guarantor_doc">{{ $t('contractDocuments.types.guarantor_doc') }}</SelectItem>
                  <SelectItem value="custom">{{ $t('contractDocuments.types.custom') }}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div v-if="selectedDocType === 'custom'" class="space-y-2">
              <Label for="customLabel">{{ $t('contractDocuments.customLabel') }}</Label>
              <Input
                id="customLabel"
                v-model="customTypeLabel"
                :placeholder="$t('contractDocuments.customLabelPlaceholder')"
              />
            </div>

            <div v-if="pendingFiles.length > 0" class="space-y-1">
              <p class="text-sm text-muted-foreground">{{ $t('contractDocuments.filesToUpload') }}:</p>
              <ul class="text-sm text-foreground">
                <li v-for="file in pendingFiles" :key="file.name" class="truncate">
                  {{ file.name }} ({{ formatFileSize(file.size) }})
                </li>
              </ul>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel @click="cancelUpload">
              {{ $t('common.cancel') }}
            </AlertDialogCancel>
            <AlertDialogAction
              :disabled="!selectedDocType || (selectedDocType === 'custom' && !customTypeLabel)"
              @click="confirmUpload"
            >
              {{ $t('common.upload') }}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <!-- Loading State -->
      <div v-if="isFetching && documents.length === 0" class="py-8">
        <div class="space-y-3">
          <Skeleton class="h-12 w-full" />
          <Skeleton class="h-12 w-full" />
          <Skeleton class="h-12 w-full" />
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="fetchError"
        class="py-8 text-center bg-destructive/10 border border-destructive/20 rounded-lg"
      >
        <AlertTriangle class="w-10 h-10 mx-auto text-destructive mb-3" />
        <p class="text-sm text-destructive font-medium mb-2">
          {{ $t('contractDocuments.errorLoading') }}
        </p>
        <p class="text-xs text-destructive/80 mb-3">{{ fetchError }}</p>
        <Button variant="outline" size="sm" @click="loadDocuments">
          {{ $t('common.retry') }}
        </Button>
      </div>

      <!-- Empty State -->
      <div v-else-if="documents.length === 0 && !isFetching" class="py-8 text-center">
        <FileText class="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p class="text-sm text-muted-foreground">
          {{ $t('contractDocuments.noDocuments') }}
        </p>
      </div>

      <!-- Documents List -->
      <div v-else-if="documents.length > 0" class="space-y-2">
        <div
          v-for="doc in documents"
          :key="doc.id"
          class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="flex-shrink-0">
              <FileIcon :mime-type="getMimeType(doc.name)" class="w-8 h-8" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate" :title="doc.name">
                {{ doc.name }}
              </p>
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" class="text-xs">
                  {{ getDocumentTypeLabel(doc.document_type, doc.custom_type_label) }}
                </Badge>
                <span>{{ formatFileSize(doc.file_size) }}</span>
                <span>{{ formatDate(doc.created_at) }}</span>
                <span v-if="doc.uploader?.full_name" class="hidden sm:inline">
                  {{ doc.uploader.full_name }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              :title="$t('common.view')"
              @click="viewDocument(doc)"
            >
              <Eye class="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              :disabled="downloadingIds[doc.id]"
              @click="handleDownload(doc)"
              :title="$t('common.download')"
            >
              <Loader2 v-if="downloadingIds[doc.id]" class="w-4 h-4 animate-spin" />
              <Download v-else class="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="text-destructive hover:text-destructive"
              @click="openDeleteDialog(doc)"
              :title="$t('common.delete')"
            >
              <Trash2 class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Dialog -->
      <DeleteContractDocumentDialog
        v-if="documentToDelete"
        v-model:open="showDeleteDialog"
        :document="documentToDelete"
        @confirm="handleDeleteConfirm"
        @cancel="cancelDelete"
      />
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
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
import {
  Upload,
  Download,
  Eye,
  Trash2,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-vue-next'
import FileIcon from '@/components/common/FileIcon.vue'
import DeleteContractDocumentDialog from './DeleteContractDocumentDialog.vue'
import { useContractDocuments } from '@/composables/useContractDocuments'
import { useDate } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'
import type { ContractDocument, ContractDocumentType } from '@/types'

const props = defineProps<{
  contractId: string
}>()

const { t } = useI18n()
const { formatDate } = useDate()
const toast = useToast()

const {
  documents,
  uploading,
  error,
  uploadProgress,
  uploadErrors,
  fetchDocuments,
  uploadDocuments,
  viewDocument,
  downloadDocument,
  formatFileSize,
  ALLOWED_MIME_TYPES,
} = useContractDocuments()

// Local state
const fileInputRef = ref<HTMLInputElement | null>(null)
const isOverDropZone = ref(false)
const showDocTypeDialog = ref(false)
const pendingFiles = ref<File[]>([])
const selectedDocType = ref<ContractDocumentType | ''>('')
const customTypeLabel = ref('')
const showDeleteDialog = ref(false)
const documentToDelete = ref<ContractDocument | null>(null)
const fetchError = ref<string | null>(null)
const downloadingIds = ref<Record<string, boolean>>({})
const isFetching = ref(false)

// Computed
const acceptedFileTypes = computed(() => {
  return '.pdf,.jpg,.jpeg,.png,.webp'
})

// Methods
function openFileDialog() {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    handleFiles(Array.from(input.files))
  }
  // Reset the input so the same file can be selected again
  input.value = ''
}

function handleDropEvent(event: DragEvent) {
  isOverDropZone.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    handleFiles(Array.from(files))
  }
}

function handleFiles(files: File[]) {
  // Filter out invalid file types
  const validFiles = files.filter((file) => {
    return ALLOWED_MIME_TYPES.includes(file.type)
  })

  if (validFiles.length === 0) {
    uploadErrors.value = ['invalidFileType']
    return
  }

  pendingFiles.value = validFiles
  selectedDocType.value = ''
  customTypeLabel.value = ''
  showDocTypeDialog.value = true
}

function cancelUpload() {
  pendingFiles.value = []
  selectedDocType.value = ''
  customTypeLabel.value = ''
  showDocTypeDialog.value = false
}

async function confirmUpload() {
  if (!selectedDocType.value) return

  showDocTypeDialog.value = false

  const filesToUpload = pendingFiles.value.map((file) => ({
    file,
    documentType: selectedDocType.value as ContractDocumentType,
    customTypeLabel: selectedDocType.value === 'custom' ? customTypeLabel.value : undefined,
  }))

  const result = await uploadDocuments(props.contractId, filesToUpload)

  if (result.success.length > 0) {
    toast.success(t('contractDocuments.uploadSuccess', { count: result.success.length }))
  }

  pendingFiles.value = []
  selectedDocType.value = ''
  customTypeLabel.value = ''
}

async function handleDownload(doc: ContractDocument) {
  console.log('[handleDownload] called', doc.id)
  console.log('[handleDownload] downloadingIds state', JSON.stringify(downloadingIds.value))
  if (downloadingIds.value[doc.id]) {
    console.log('[handleDownload] BLOCKED by guard', doc.id)
    return
  }
  downloadingIds.value[doc.id] = true
  console.log('[handleDownload] set to true', JSON.stringify(downloadingIds.value))
  try {
    await downloadDocument(doc)
    console.log('[handleDownload] downloadDocument resolved')
  } catch (e) {
    console.log('[handleDownload] downloadDocument threw', e)
    toast.error(t('errors.downloadError'))
  } finally {
    console.log('[handleDownload] finally block executing')
    downloadingIds.value[doc.id] = false
    console.log('[handleDownload] set to false', JSON.stringify(downloadingIds.value))
  }
}

function openDeleteDialog(doc: ContractDocument) {
  documentToDelete.value = doc
  showDeleteDialog.value = true
}

function cancelDelete() {
  documentToDelete.value = null
  showDeleteDialog.value = false
}

async function handleDeleteConfirm() {
  showDeleteDialog.value = false
  documentToDelete.value = null
}

function getDocumentTypeLabel(type: ContractDocumentType, customLabel: string | null): string {
  if (type === 'custom' && customLabel) {
    return customLabel
  }
  return t(`contractDocuments.types.${type}`)
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

function formatUploadError(error: string): string {
  if (error === 'invalidFileType') {
    return t('contractDocuments.errors.invalidFileType')
  }
  if (error.startsWith('invalidFileType:')) {
    const fileName = error.split(':')[1]
    return t('contractDocuments.errors.invalidFileTypeNamed', { name: fileName })
  }
  if (error.startsWith('fileTooLarge:')) {
    const fileName = error.split(':')[1]
    return t('contractDocuments.errors.fileTooLarge', { name: fileName })
  }
  if (error.startsWith('uploadFailed:')) {
    const fileName = error.split(':')[1]
    return t('contractDocuments.errors.uploadFailed', { name: fileName })
  }
  return error
}

async function loadDocuments() {
  fetchError.value = null
  isFetching.value = true
  try {
    const result = await fetchDocuments(props.contractId)
    if (result === null && error.value) {
      fetchError.value = error.value
    }
  } finally {
    isFetching.value = false
  }
}

onMounted(() => {
  loadDocuments()
})
</script>
