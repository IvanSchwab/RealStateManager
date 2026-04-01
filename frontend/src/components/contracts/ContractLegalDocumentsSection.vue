<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">{{ $t('contracts.legalDocuments.title') }}</CardTitle>
      <CardDescription>
        {{ $t('contracts.legalDocuments.description') }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <!-- Loading State -->
      <div v-if="loading" class="py-8">
        <div class="space-y-3">
          <Skeleton class="h-12 w-full" />
          <Skeleton class="h-12 w-full" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="documents.length === 0" class="py-8 text-center">
        <FileText class="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p class="text-sm text-muted-foreground">
          {{ $t('contracts.legalDocuments.noDocuments') }}
        </p>
      </div>

      <!-- Documents List -->
      <div v-else class="space-y-2">
        <div
          v-for="doc in documents"
          :key="doc.id"
          class="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <Badge :variant="getDocumentTypeBadgeVariant(doc.document_type)">
              {{ $t(`contracts.legalDocuments.types.${doc.document_type}`) }}
            </Badge>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate" :title="doc.file_name">
                {{ doc.file_name }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ formatDate(doc.generated_at) }}
              </p>
            </div>
          </div>
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
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, FileText, Loader2 } from 'lucide-vue-next'
import { supabase } from '@/lib/supabase'
import { useDate } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'
import type { ContractLegalDocument } from '@/types'

const props = defineProps<{
  contractId: string
  organizationId: string
}>()

const { t } = useI18n()
const { formatDateTime } = useDate()
const toast = useToast()

// State
const documents = ref<ContractLegalDocument[]>([])
const loading = ref(false)
const downloadingIds = ref<Record<string, boolean>>({})

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  return formatDateTime(dateStr)
}

/**
 * Get badge variant for document type
 */
function getDocumentTypeBadgeVariant(type: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (type) {
    case 'contrato':
      return 'default'
    case 'rescision':
      return 'destructive'
    case 'prorroga':
      return 'secondary'
    case 'renovacion':
      return 'outline'
    default:
      return 'secondary'
  }
}

/**
 * Fetch legal documents for this contract
 */
async function fetchDocuments() {
  if (!props.contractId) return

  loading.value = true
  try {
    const { data, error } = await supabase
      .from('contract_legal_documents')
      .select('*')
      .eq('contract_id', props.contractId)
      .is('deleted_at', null)
      .order('generated_at', { ascending: false })

    if (error) {
      console.warn('Error fetching legal documents:', error.message)
      return
    }

    documents.value = (data ?? []) as ContractLegalDocument[]
  } catch (e) {
    console.warn('Error fetching legal documents:', e)
  } finally {
    loading.value = false
  }
}

/**
 * Download a legal document using signed URL
 */
async function handleDownload(doc: ContractLegalDocument) {
  if (downloadingIds.value[doc.id]) return

  downloadingIds.value[doc.id] = true
  try {
    const { data, error } = await supabase.storage
      .from('contract-documents')
      .createSignedUrl(doc.storage_path, 60)

    if (error) {
      console.warn('Error creating signed URL:', error.message)
      toast.error(t('errors.downloadError'))
      return
    }

    if (!data?.signedUrl) {
      toast.error(t('errors.downloadError'))
      return
    }

    // Fetch and download as blob to preserve filename
    const response = await fetch(data.signedUrl)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = doc.file_name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch (e) {
    console.warn('Error downloading legal document:', e)
    toast.error(t('errors.downloadError'))
  } finally {
    downloadingIds.value[doc.id] = false
  }
}

onMounted(() => {
  fetchDocuments()
})
</script>
