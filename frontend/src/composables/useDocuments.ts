import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Document, DocumentEntityType, DocumentType } from '@/types'
import { useAuthStore } from '@/stores/auth'

// Allowed MIME types and max file size
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface UploadProgress {
    loaded: number
    total: number
    percentage: number
}

export function useDocuments() {
    const documents = ref<Document[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const uploadProgress = ref<UploadProgress | null>(null)

    // Fetch documents for a specific entity
    async function fetchDocuments(entityType: DocumentEntityType, entityId: string) {
        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('documents')
                .select('*')
                .eq('entity_type', entityType)
                .eq('entity_id', entityId)
                .order('created_at', { ascending: false })

            if (fetchError) throw fetchError

            documents.value = data ?? []
            return data as Document[]
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch documents'
            console.error('Error fetching documents:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    // Validate file before upload
    function validateFile(file: File): { valid: boolean; error?: string } {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return {
                valid: false,
                error: `File type not allowed. Allowed types: PDF, JPG, PNG`
            }
        }

        if (file.size > MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `File too large. Maximum size: 5MB`
            }
        }

        return { valid: true }
    }

    // Upload document to Storage and create record in documents table
    async function uploadDocument(
        file: File,
        entityType: DocumentEntityType,
        entityId: string,
        documentType: DocumentType
    ): Promise<Document | null> {
        loading.value = true
        error.value = null
        uploadProgress.value = null

        try {
            // Validate file
            const validation = validateFile(file)
            if (!validation.valid) {
                throw new Error(validation.error)
            }

            // Get current user ID for storage path
            const authStore = useAuthStore()
            const userId = authStore.user?.id
            if (!userId) {
                throw new Error('User not authenticated')
            }

            // Build storage path: {user_id}/{entity_type}s/{entity_id}/{timestamp}_{filename}
            const timestamp = Date.now()
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const storagePath = `${userId}/${entityType}s/${entityId}/${timestamp}_${sanitizedFileName}`

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) throw uploadError

            // Create record in documents table
            const documentData = {
                entity_type: entityType,
                entity_id: entityId,
                document_type: documentType,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                storage_path: storagePath,
                uploaded_by: userId
            }

            const { data: document, error: insertError } = await supabase
                .from('documents')
                .insert([documentData])
                .select()
                .single()

            if (insertError) {
                // If DB insert fails, try to delete the uploaded file
                await supabase.storage.from('documents').remove([storagePath])
                throw insertError
            }

            // Optimistic update
            if (document) {
                documents.value.unshift(document)
            }

            return document as Document
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to upload document'
            console.error('Error uploading document:', e)
            throw e
        } finally {
            loading.value = false
            uploadProgress.value = null
        }
    }

    // Download document - generates signed URL and triggers download
    async function downloadDocument(document: Document): Promise<string | null> {
        loading.value = true
        error.value = null

        try {
            // Create signed URL with 60 second expiration
            const { data, error: signError } = await supabase.storage
                .from('documents')
                .createSignedUrl(document.storage_path, 60)

            if (signError) throw signError

            if (data?.signedUrl) {
                // Trigger download
                const link = window.document.createElement('a')
                link.href = data.signedUrl
                link.download = document.file_name
                link.target = '_blank'
                window.document.body.appendChild(link)
                link.click()
                window.document.body.removeChild(link)
                return data.signedUrl
            }

            return null
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to download document'
            console.error('Error downloading document:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Get preview URL for images
    async function getPreviewUrl(document: Document): Promise<string | null> {
        try {
            // Only generate preview for images
            if (!document.mime_type?.startsWith('image/')) {
                return null
            }

            const { data, error: signError } = await supabase.storage
                .from('documents')
                .createSignedUrl(document.storage_path, 300) // 5 minutes for preview

            if (signError) throw signError

            return data?.signedUrl ?? null
        } catch (e) {
            console.error('Error generating preview URL:', e)
            return null
        }
    }

    // Delete document from Storage and DB
    async function deleteDocument(documentId: string): Promise<boolean> {
        loading.value = true
        error.value = null

        try {
            // First get the document to get storage path
            const docToDelete = documents.value.find(d => d.id === documentId)
            if (!docToDelete) {
                // Fetch from DB if not in local state
                const { data, error: fetchError } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('id', documentId)
                    .single()

                if (fetchError) throw fetchError
                if (!data) throw new Error('Document not found')

                // Delete from Storage first
                const { error: storageError } = await supabase.storage
                    .from('documents')
                    .remove([data.storage_path])

                if (storageError) {
                    console.warn('Failed to delete from storage:', storageError)
                    // Continue with DB deletion even if storage fails
                }
            } else {
                // Delete from Storage first
                const { error: storageError } = await supabase.storage
                    .from('documents')
                    .remove([docToDelete.storage_path])

                if (storageError) {
                    console.warn('Failed to delete from storage:', storageError)
                    // Continue with DB deletion even if storage fails
                }
            }

            // Delete from database
            const { error: deleteError } = await supabase
                .from('documents')
                .delete()
                .eq('id', documentId)

            if (deleteError) throw deleteError

            // Optimistic update - remove from list
            documents.value = documents.value.filter(d => d.id !== documentId)

            return true
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to delete document'
            console.error('Error deleting document:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Get document type label for display
    function getDocumentTypeLabel(type: DocumentType): string {
        const labels: Record<DocumentType, string> = {
            dni_frente: 'DNI (Frente)',
            dni_dorso: 'DNI (Dorso)',
            recibo_sueldo: 'Recibo de Sueldo',
            contrato_firmado: 'Contrato Firmado',
            comprobante_pago: 'Comprobante de Pago',
            inventario: 'Inventario',
            foto_propiedad: 'Foto de Propiedad',
            garantia: 'Garantía',
            otro: 'Otro'
        }
        return labels[type] || type
    }

    // Format file size for display
    function formatFileSize(bytes: number | null): string {
        if (!bytes) return '-'
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return {
        documents,
        loading,
        error,
        uploadProgress,
        fetchDocuments,
        uploadDocument,
        downloadDocument,
        getPreviewUrl,
        deleteDocument,
        validateFile,
        getDocumentTypeLabel,
        formatFileSize,
        ALLOWED_MIME_TYPES,
        MAX_FILE_SIZE
    }
}
