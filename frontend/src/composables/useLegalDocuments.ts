import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

// ============================================
// TypeScript Interfaces
// ============================================

export type LegalDocumentType = 'corretaje' | 'boleto_compraventa' | 'entrega_llaves'

export interface LegalDocument {
  id: string
  organization_id: string
  property_id: string
  property_name?: string
  document_type: LegalDocumentType
  metadata: Record<string, unknown>
  pdf_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateLegalDocumentPayload {
  property_id: string
  document_type: LegalDocumentType
  metadata: Record<string, unknown>
  pdf_url?: string
}

// Storage configuration
const BUCKET_NAME = 'contract-documents'

// ============================================
// Pinia Store Definition
// ============================================

export const useLegalDocuments = defineStore('legalDocuments', () => {
  // State
  const documents = ref<LegalDocument[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Auth composable for organization context
  const { organizationId, user } = useAuth()

  // Computed
  const hasDocuments = computed(() => documents.value.length > 0)

  /**
   * Fetch legal documents for the current organization with optional filters.
   * Joins property name for display purposes.
   */
  async function fetchDocuments(filters?: {
    property_id?: string
    document_type?: LegalDocumentType
  }): Promise<LegalDocument[] | null> {
    if (!organizationId.value) {
      console.warn('[useLegalDocuments] No organization_id available, skipping fetch')
      return null
    }

    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('legal_documents')
        .select(`
          *,
          property:properties!property_id(name)
        `)
        .eq('organization_id', organizationId.value)
        .order('created_at', { ascending: false })

      // Apply optional filters
      if (filters?.property_id) {
        query = query.eq('property_id', filters.property_id)
      }
      if (filters?.document_type) {
        query = query.eq('document_type', filters.document_type)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      // Transform data to include property_name at top level
      const transformedData: LegalDocument[] = (data ?? []).map((doc: any) => ({
        id: doc.id,
        organization_id: doc.organization_id,
        property_id: doc.property_id,
        property_name: doc.property?.name ?? undefined,
        document_type: doc.document_type,
        metadata: doc.metadata,
        pdf_url: doc.pdf_url,
        created_by: doc.created_by,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      }))

      documents.value = transformedData
      return transformedData
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al obtener documentos legales'
      console.error('[useLegalDocuments] Error fetching documents:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a new legal document record.
   * Returns the created document or null on error.
   */
  async function createDocument(
    payload: CreateLegalDocumentPayload
  ): Promise<LegalDocument | null> {
    if (!organizationId.value) {
      error.value = 'No organization_id available'
      console.error('[useLegalDocuments] No organization_id available, cannot create document')
      return null
    }

    loading.value = true
    error.value = null

    try {
      const documentData = {
        organization_id: organizationId.value,
        property_id: payload.property_id,
        document_type: payload.document_type,
        metadata: payload.metadata,
        pdf_url: payload.pdf_url ?? null,
        created_by: user.value?.id ?? null,
      }

      const { data, error: insertError } = await supabase
        .from('legal_documents')
        .insert([documentData])
        .select(`
          *,
          property:properties!property_id(name)
        `)
        .single()

      if (insertError) throw insertError

      // Transform to include property_name
      const createdDoc: LegalDocument = {
        id: data.id,
        organization_id: data.organization_id,
        property_id: data.property_id,
        property_name: data.property?.name ?? undefined,
        document_type: data.document_type,
        metadata: data.metadata,
        pdf_url: data.pdf_url,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      // Optimistic update: add to beginning of list
      documents.value.unshift(createdDoc)

      return createdDoc
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al crear documento legal'
      console.error('[useLegalDocuments] Error creating document:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a legal document and its associated PDF from storage.
   * Returns true on success, false on error.
   */
  async function deleteDocument(id: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      // First, get the document to retrieve the PDF URL for storage deletion
      const docToDelete = documents.value.find(d => d.id === id)
      let pdfUrl: string | null = null

      if (docToDelete) {
        pdfUrl = docToDelete.pdf_url
      } else {
        // Fetch from DB if not in local state
        const { data, error: fetchError } = await supabase
          .from('legal_documents')
          .select('pdf_url')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError
        pdfUrl = data?.pdf_url ?? null
      }

      // Delete PDF from storage if it exists
      if (pdfUrl) {
        // Extract storage path from URL
        // pdf_url format: {org_id}/properties/{property_id}/legal/{uuid}-{filename}
        const storagePath = extractStoragePath(pdfUrl)
        if (storagePath) {
          const { error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([storagePath])

          if (storageError) {
            console.warn('[useLegalDocuments] Failed to delete PDF from storage:', storageError.message)
            // Continue with DB deletion even if storage fails
          }
        }
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('legal_documents')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Optimistic update: remove from list
      documents.value = documents.value.filter(d => d.id !== id)

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar documento legal'
      console.error('[useLegalDocuments] Error deleting document:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Get legal documents filtered by property ID.
   * Uses local state if available, otherwise fetches from database.
   */
  async function getLegalDocumentsByProperty(
    property_id: string
  ): Promise<LegalDocument[]> {
    // Check if we have documents in local state for this property
    const localDocs = documents.value.filter(d => d.property_id === property_id)

    // If we have local data, return it
    if (localDocs.length > 0) {
      return localDocs
    }

    // Otherwise, fetch from database
    const fetched = await fetchDocuments({ property_id })
    return fetched ?? []
  }

  /**
   * Update a legal document's pdf_url after PDF generation.
   * Used internally by useLegalDocumentPDF.
   */
  async function updateDocumentPdfUrl(
    id: string,
    pdfUrl: string
  ): Promise<boolean> {
    try {
      const { error: updateError } = await supabase
        .from('legal_documents')
        .update({ pdf_url: pdfUrl })
        .eq('id', id)

      if (updateError) throw updateError

      // Update local state
      const docIndex = documents.value.findIndex(d => d.id === id)
      if (docIndex !== -1) {
        documents.value[docIndex].pdf_url = pdfUrl
      }

      return true
    } catch (e) {
      console.error('[useLegalDocuments] Error updating pdf_url:', e)
      return false
    }
  }

  /**
   * Clear local document state.
   * Useful when switching organizations or logging out.
   */
  function clearDocuments(): void {
    documents.value = []
    error.value = null
  }

  /**
   * Extract storage path from a full URL or path string.
   * Handles both full URLs and relative paths.
   */
  function extractStoragePath(urlOrPath: string): string | null {
    if (!urlOrPath) return null

    // If it's already a storage path (not a full URL), return as-is
    if (!urlOrPath.startsWith('http')) {
      return urlOrPath
    }

    // Extract path from full Supabase storage URL
    // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const match = urlOrPath.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)/)
    if (match) {
      return decodeURIComponent(match[1])
    }

    return null
  }

  return {
    // State
    documents,
    loading,
    error,
    // Computed
    hasDocuments,
    // Actions
    fetchDocuments,
    createDocument,
    deleteDocument,
    getLegalDocumentsByProperty,
    updateDocumentPdfUrl,
    clearDocuments,
  }
})
