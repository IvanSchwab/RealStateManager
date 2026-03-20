<template>
  <AlertDialog :open="open" @update:open="$emit('update:open', $event)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t('contractDocuments.deleteTitle') }}</AlertDialogTitle>
        <AlertDialogDescription class="space-y-4">
          <p>{{ $t('contractDocuments.deleteConfirm', { name: document.name }) }}</p>

          <div class="p-3 bg-muted rounded-lg">
            <div class="flex items-center gap-3">
              <FileIcon :mime-type="getMimeType(document.name)" class="w-8 h-8" />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ document.name }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ getDocumentTypeLabel(document.document_type, document.custom_type_label) }}
                  &middot;
                  {{ formatFileSize(document.file_size) }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex items-start space-x-2 p-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg">
            <AlertTriangle class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-yellow-700 dark:text-yellow-300">
              <p class="font-medium">{{ $t('common.warning') }}</p>
              <p>{{ $t('contractDocuments.deleteWarning') }}</p>
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="$emit('cancel')">
          {{ $t('common.cancel') }}
        </AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          :disabled="isDeleting"
          @click="handleDelete"
        >
          <Loader2 v-if="isDeleting" class="w-4 h-4 mr-2 animate-spin" />
          {{ $t('common.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
import { AlertTriangle, Loader2 } from 'lucide-vue-next'
import FileIcon from '@/components/common/FileIcon.vue'
import { useContractDocuments } from '@/composables/useContractDocuments'
import { useToast } from '@/composables/useToast'
import type { ContractDocument, ContractDocumentType } from '@/types'

const props = defineProps<{
  open: boolean
  document: ContractDocument
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const { deleteDocument, formatFileSize } = useContractDocuments()
const toast = useToast()

const isDeleting = ref(false)

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

function getDocumentTypeLabel(type: ContractDocumentType, customLabel: string | null): string {
  if (type === 'custom' && customLabel) {
    return customLabel
  }
  return t(`contractDocuments.types.${type}`)
}

async function handleDelete() {
  isDeleting.value = true
  try {
    await deleteDocument(props.document.id)
    toast.success(t('contractDocuments.deleteSuccess'))
    emit('confirm')
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('contractDocuments.deleteError')
    toast.error(`${t('common.error')}: ${message}`)
  } finally {
    isDeleting.value = false
  }
}
</script>
