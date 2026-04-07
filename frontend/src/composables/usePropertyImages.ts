import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const BUCKET_NAME = 'contract-documents'
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface PropertyImage {
    id: string
    entity_id: string
    file_name: string
    storage_path: string
    url: string // Signed URL for authenticated access (1 hour expiry)
    created_at: string
    // Backward-compatible aliases
    name: string
    createdAt: Date
}

export interface UploadProgress {
    fileName: string
    loaded: number
    total: number
    percentage: number
}

// Convert DB row to PropertyImage (URL will be set separately via signed URL)
function toPropertyImage(
    doc: {
        id: string
        entity_id: string
        file_name: string
        storage_path: string
        created_at: string
    },
    signedUrl: string = ''
): PropertyImage {
    return {
        id: doc.id,
        entity_id: doc.entity_id,
        file_name: doc.file_name,
        storage_path: doc.storage_path,
        url: signedUrl,
        created_at: doc.created_at,
        // Backward-compatible aliases
        name: doc.file_name,
        createdAt: new Date(doc.created_at),
    }
}

// Generate signed URL for a storage path (1 hour expiry)
async function getSignedUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, 3600) // 1 hour
    if (error) {
        console.warn('Failed to create signed URL:', error)
        return ''
    }
    return data?.signedUrl ?? ''
}

export function usePropertyImages() {
    const images = ref<PropertyImage[]>([])
    const loading = ref(false)
    const uploading = ref(false)
    const error = ref<string | null>(null)
    const uploadProgress = ref<UploadProgress[]>([])
    const { organizationId, user } = useAuth()

    function validateFile(file: File): { valid: boolean; error?: string } {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return {
                valid: false,
                error: `Formato no permitido: ${file.name}. Use JPG, PNG o WebP.`,
            }
        }

        if (file.size > MAX_FILE_SIZE) {
            return {
                valid: false,
                error: `Archivo muy grande: ${file.name}. Máximo 5MB.`,
            }
        }

        return { valid: true }
    }

    // Fetch property images from the documents table (polymorphic)
    async function fetchPropertyImages(propertyId: string): Promise<PropertyImage[]> {
        if (!organizationId.value) {
            console.warn('No organization_id available, skipping fetch')
            return []
        }

        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('documents')
                .select('id, entity_id, file_name, storage_path, created_at')
                .eq('entity_type', 'property')
                .eq('entity_id', propertyId)
                .eq('document_type', 'foto_propiedad')
                .eq('organization_id', organizationId.value)
                .order('created_at', { ascending: true })

            if (fetchError) throw fetchError

            // Generate signed URLs for all images in parallel
            const propertyImages: PropertyImage[] = await Promise.all(
                (data ?? []).map(async (doc) => {
                    const signedUrl = await getSignedUrl(doc.storage_path)
                    return toPropertyImage(doc, signedUrl)
                })
            )

            images.value = propertyImages
            return propertyImages
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar imágenes'
            console.error('Error fetching property images:', e)
            return []
        } finally {
            loading.value = false
        }
    }

    // Backward-compatible alias for fetchPropertyImages
    async function fetchImages(propertyId: string): Promise<PropertyImage[]> {
        return fetchPropertyImages(propertyId)
    }

    // Upload a single property image to Storage and insert record in documents table
    async function uploadPropertyImage(
        propertyId: string,
        file: File
    ): Promise<PropertyImage | null> {
        if (!organizationId.value || !user.value?.id) {
            error.value = 'No organization or user available'
            return null
        }

        const validation = validateFile(file)
        if (!validation.valid) {
            error.value = validation.error ?? 'Invalid file'
            return null
        }

        uploading.value = true
        error.value = null

        try {
            const userId = user.value.id
            const uuid = crypto.randomUUID()
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const storagePath = `${organizationId.value}/properties/${propertyId}/photos/${uuid}-${sanitizedFileName}`

            // 1. Upload to Storage bucket
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                })

            if (uploadError) throw uploadError

            // 2. Get signed URL for the uploaded file
            const signedUrl = await getSignedUrl(storagePath)

            // 3. Insert record in documents table
            const { data: docData, error: insertError } = await supabase
                .from('documents')
                .insert({
                    organization_id: organizationId.value,
                    entity_type: 'property',
                    entity_id: propertyId,
                    document_type: 'foto_propiedad',
                    file_name: sanitizedFileName,
                    storage_path: storagePath,
                    file_size: file.size,
                    mime_type: file.type,
                    uploaded_by: userId,
                })
                .select('id, entity_id, file_name, storage_path, created_at')
                .single()

            if (insertError) {
                // Rollback: delete from storage if DB insert fails
                await supabase.storage.from(BUCKET_NAME).remove([storagePath])
                throw insertError
            }

            const newImage = toPropertyImage(docData, signedUrl)
            images.value.push(newImage)
            return newImage
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al subir imagen'
            console.error('Error uploading property image:', e)
            return null
        } finally {
            uploading.value = false
        }
    }

    // Backward-compatible method: upload multiple images
    async function uploadImages(
        propertyId: string,
        files: File[]
    ): Promise<{ success: PropertyImage[]; failed: string[] }> {
        if (!organizationId.value || !user.value?.id) {
            return { success: [], failed: ['No organization or user available'] }
        }

        uploading.value = true
        error.value = null
        uploadProgress.value = []

        const successful: PropertyImage[] = []
        const failed: string[] = []

        try {
            for (const file of files) {
                const validation = validateFile(file)
                if (!validation.valid) {
                    failed.push(validation.error!)
                    continue
                }

                // Initialize progress for this file
                uploadProgress.value.push({
                    fileName: file.name,
                    loaded: 0,
                    total: file.size,
                    percentage: 0,
                })

                const userId = user.value!.id
                const uuid = crypto.randomUUID()
                const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                const storagePath = `${organizationId.value}/properties/${propertyId}/photos/${uuid}-${sanitizedFileName}`

                try {
                    const { error: uploadError } = await supabase.storage
                        .from(BUCKET_NAME)
                        .upload(storagePath, file, {
                            cacheControl: '3600',
                            upsert: false,
                        })

                    if (uploadError) throw uploadError

                    // Update progress to 50%
                    const progressIndex = uploadProgress.value.findIndex(
                        (p) => p.fileName === file.name
                    )
                    if (progressIndex !== -1) {
                        uploadProgress.value[progressIndex].loaded = file.size / 2
                        uploadProgress.value[progressIndex].percentage = 50
                    }

                    // Get signed URL for the uploaded file
                    const signedUrl = await getSignedUrl(storagePath)

                    const { data: docData, error: insertError } = await supabase
                        .from('documents')
                        .insert({
                            organization_id: organizationId.value,
                            entity_type: 'property',
                            entity_id: propertyId,
                            document_type: 'foto_propiedad',
                            file_name: sanitizedFileName,
                            storage_path: storagePath,
                            file_size: file.size,
                            mime_type: file.type,
                            uploaded_by: userId,
                        })
                        .select('id, entity_id, file_name, storage_path, created_at')
                        .single()

                    if (insertError) {
                        await supabase.storage.from(BUCKET_NAME).remove([storagePath])
                        throw insertError
                    }

                    // Update progress to 100%
                    if (progressIndex !== -1) {
                        uploadProgress.value[progressIndex].loaded = file.size
                        uploadProgress.value[progressIndex].percentage = 100
                    }

                    const newImage = toPropertyImage(docData, signedUrl)
                    successful.push(newImage)
                    images.value.push(newImage)
                } catch (uploadErr) {
                    failed.push(
                        `Error al subir ${file.name}: ${uploadErr instanceof Error ? uploadErr.message : 'Error desconocido'}`
                    )
                }
            }

            return { success: successful, failed }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al subir imágenes'
            console.error('Error uploading images:', e)
            return { success: successful, failed }
        } finally {
            uploading.value = false
            uploadProgress.value = []
        }
    }

    // Delete a property image from Storage and documents table
    async function deletePropertyImage(documentId: string): Promise<boolean> {
        loading.value = true
        error.value = null

        try {
            // Find the image to get the storage_path for deletion
            const imageToDelete = images.value.find(img => img.id === documentId)
            let storagePath: string | null = null

            if (imageToDelete) {
                storagePath = imageToDelete.storage_path
            } else {
                // Fetch from DB if not in local state
                const { data, error: fetchError } = await supabase
                    .from('documents')
                    .select('storage_path')
                    .eq('id', documentId)
                    .single()

                if (fetchError) throw fetchError
                storagePath = data?.storage_path ?? null
            }

            // 1. Delete from Storage if we have a path
            if (storagePath) {
                const { error: storageError } = await supabase.storage
                    .from(BUCKET_NAME)
                    .remove([storagePath])

                if (storageError) {
                    console.warn('Storage deletion failed:', storageError)
                    // Continue to delete from DB even if storage fails
                }
            }

            // 2. Delete from documents table
            const { error: deleteError } = await supabase
                .from('documents')
                .delete()
                .eq('id', documentId)

            if (deleteError) throw deleteError

            // Remove from local state
            images.value = images.value.filter(img => img.id !== documentId)

            return true
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al eliminar imagen'
            console.error('Error deleting property image:', e)
            return false
        } finally {
            loading.value = false
        }
    }

    // Backward-compatible alias: accepts image ID
    async function deleteImage(imageId: string): Promise<boolean> {
        return deletePropertyImage(imageId)
    }

    return {
        images,
        loading,
        uploading,
        error,
        uploadProgress,
        // New API
        fetchPropertyImages,
        uploadPropertyImage,
        deletePropertyImage,
        // Backward-compatible aliases
        fetchImages,
        uploadImages,
        deleteImage,
        // Utilities
        validateFile,
        ALLOWED_MIME_TYPES,
        MAX_FILE_SIZE,
    }
}
