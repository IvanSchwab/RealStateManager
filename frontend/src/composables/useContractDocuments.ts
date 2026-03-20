import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ContractDocument, ContractDocumentType } from '@/types'
import { useAuth } from './useAuth'

// Allowed MIME types and max file size
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/webp',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const BUCKET_NAME = 'contract-documents'

export interface UploadProgress {
  fileName: string
  loaded: number
  total: number
  percentage: number
}

export interface FileValidationResult {
  valid: boolean
  error?: string
}

export function useContractDocuments() {
  const documents = ref<ContractDocument[]>([])
  const loading = ref(false)
  const uploading = ref(false)
  const error = ref<string | null>(null)
  const uploadProgress = ref<UploadProgress[]>([])
  const uploadErrors = ref<string[]>([])

  const { user, organizationId } = useAuth()

  /**
   * Fetch all documents for a contract
   */
  async function fetchDocuments(contractId: string): Promise<ContractDocument[] | null> {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetch')
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('contract_documents')
        .select(`
          *,
          uploader:profiles!uploaded_by(full_name)
        `)
        .eq('contract_id', contractId)
        .eq('org_id', organizationId.value)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      documents.value = (data ?? []) as ContractDocument[]
      return documents.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch documents'
      console.error('Error fetching contract documents:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Validate a single file before upload
   */
  function validateFile(file: File): FileValidationResult {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `invalidFileType:${file.name}`,
      }
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `fileTooLarge:${file.name}`,
      }
    }

    return { valid: true }
  }

  /**
   * Upload a single document
   */
  async function uploadDocument(
    contractId: string,
    file: File,
    documentType: ContractDocumentType,
    customTypeLabel?: string
  ): Promise<ContractDocument | null> {
    if (!organizationId.value) {
      throw new Error('No organization_id available')
    }

    if (!user.value?.id) {
      throw new Error('User not authenticated')
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Generate storage path: {org_id}/{contract_id}/{uuid}-{sanitized_filename}
    const uuid = crypto.randomUUID()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${organizationId.value}/${contractId}/${uuid}-${sanitizedFileName}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`)
    }

    // Create database record
    const documentData = {
      contract_id: contractId,
      org_id: organizationId.value,
      name: file.name,
      document_type: documentType,
      custom_type_label: documentType === 'custom' ? customTypeLabel : null,
      storage_path: storagePath,
      file_size: file.size,
      uploaded_by: user.value.id,
    }

    const { data: document, error: insertError } = await supabase
      .from('contract_documents')
      .insert([documentData])
      .select(`
        *,
        uploader:profiles!uploaded_by(full_name)
      `)
      .single()

    if (insertError) {
      // Compensating action: delete the uploaded file if DB insert fails
      await supabase.storage.from(BUCKET_NAME).remove([storagePath])
      throw new Error(`Database insert failed: ${insertError.message}`)
    }

    // Add to local state
    if (document) {
      documents.value.unshift(document as ContractDocument)
    }

    return document as ContractDocument
  }

  /**
   * Upload multiple documents
   */
  async function uploadDocuments(
    contractId: string,
    files: { file: File; documentType: ContractDocumentType; customTypeLabel?: string }[]
  ): Promise<{ success: ContractDocument[]; failed: string[] }> {
    uploading.value = true
    uploadProgress.value = []
    uploadErrors.value = []

    const successful: ContractDocument[] = []
    const failed: string[] = []

    try {
      for (const { file, documentType, customTypeLabel } of files) {
        // Validate first
        const validation = validateFile(file)
        if (!validation.valid) {
          failed.push(validation.error!)
          uploadErrors.value.push(validation.error!)
          continue
        }

        // Initialize progress
        uploadProgress.value.push({
          fileName: file.name,
          loaded: 0,
          total: file.size,
          percentage: 0,
        })

        try {
          const doc = await uploadDocument(contractId, file, documentType, customTypeLabel)
          if (doc) {
            successful.push(doc)
            // Update progress to 100%
            const idx = uploadProgress.value.findIndex((p) => p.fileName === file.name)
            if (idx !== -1) {
              uploadProgress.value[idx].percentage = 100
              uploadProgress.value[idx].loaded = file.size
            }
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : 'Unknown error'
          failed.push(`uploadFailed:${file.name}:${errorMsg}`)
          uploadErrors.value.push(`uploadFailed:${file.name}`)
        }
      }

      return { success: successful, failed }
    } finally {
      uploading.value = false
      // Clear progress after a delay
      setTimeout(() => {
        uploadProgress.value = []
      }, 1000)
    }
  }

  /**
   * View document - generates signed URL and opens in new tab
   */
  async function viewDocument(doc: ContractDocument): Promise<string | null> {
    error.value = null

    try {
      const { data, error: signError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(doc.storage_path, 60)

      if (signError) throw signError

      if (!data?.signedUrl) {
        throw new Error('Failed to get signed URL')
      }

      const link = document.createElement('a')
      link.href = data.signedUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      return data.signedUrl
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to view document'
      throw e
    }
  }

  /**
   * Download a document (creates signed URL and opens in new tab)
   */
  async function downloadDocument(doc: ContractDocument): Promise<string | null> {
    console.log('[downloadDocument] called', doc.id)
    error.value = null

    try {
      console.log('[downloadDocument] calling createSignedUrl')
      // Create signed URL with 60 second expiration
      const { data, error: signError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(doc.storage_path, 60)
      console.log('[downloadDocument] createSignedUrl response', { data, signError })

      if (signError) throw signError

      if (!data?.signedUrl) {
        throw new Error('Failed to get signed URL')
      }

      const response = await fetch(data.signedUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = doc.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)

      return data.signedUrl
    } catch (e) {
      console.log('[downloadDocument] caught error', e)
      error.value = e instanceof Error ? e.message : 'Failed to download document'
      throw e
    }
  }

  /**
   * Delete a document (calls Edge Function)
   */
  async function deleteDocument(documentId: string): Promise<boolean> {
    error.value = null

    try {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      // Call the Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('delete-contract-document', {
        body: { document_id: documentId },
      })

      if (fnError) {
        throw new Error(fnError.message)
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete document')
      }

      // Remove from local state
      documents.value = documents.value.filter((d) => d.id !== documentId)

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to delete document'
      console.error('Error deleting document:', e)
      throw e
    }
  }

  /**
   * Format file size for display
   */
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return {
    documents,
    loading,
    uploading,
    error,
    uploadProgress,
    uploadErrors,
    fetchDocuments,
    validateFile,
    uploadDocument,
    uploadDocuments,
    viewDocument,
    downloadDocument,
    deleteDocument,
    formatFileSize,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
  }
}
