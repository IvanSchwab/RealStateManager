import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

const BUCKET_NAME = 'property-images'
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface PropertyImage {
  name: string
  path: string
  url: string
  createdAt: Date
}

export interface UploadProgress {
  fileName: string
  loaded: number
  total: number
  percentage: number
}

export function usePropertyImages() {
  const images = ref<PropertyImage[]>([])
  const loading = ref(false)
  const uploading = ref(false)
  const error = ref<string | null>(null)
  const uploadProgress = ref<UploadProgress[]>([])

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

  async function fetchImages(propertyId: string): Promise<PropertyImage[]> {
    loading.value = true
    error.value = null

    try {
      const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(propertyId, {
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (listError) throw listError

      if (!files || files.length === 0) {
        images.value = []
        return []
      }

      // Filter out .emptyFolderPlaceholder and generate signed URLs
      const validFiles = files.filter((f) => !f.name.startsWith('.'))

      const imagePromises = validFiles.map(async (file) => {
        const filePath = `${propertyId}/${file.name}`

        const { data: urlData } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(filePath, 3600) // 1 hour expiry

        return {
          name: file.name,
          path: filePath,
          url: urlData?.signedUrl ?? '',
          createdAt: new Date(file.created_at),
        }
      })

      const resolvedImages = await Promise.all(imagePromises)
      images.value = resolvedImages.filter((img) => img.url)
      return images.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar imágenes'
      console.error('Error fetching property images:', e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function uploadImages(
    propertyId: string,
    files: File[]
  ): Promise<{ success: PropertyImage[]; failed: string[] }> {
    uploading.value = true
    error.value = null
    uploadProgress.value = []

    const successful: PropertyImage[] = []
    const failed: string[] = []

    try {
      // Validate all files first
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

        const timestamp = Date.now()
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `${propertyId}/${timestamp}-${sanitizedFileName}`

        try {
          const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) throw uploadError

          // Update progress to 100%
          const progressIndex = uploadProgress.value.findIndex(
            (p) => p.fileName === file.name
          )
          if (progressIndex !== -1) {
            uploadProgress.value[progressIndex].loaded = file.size
            uploadProgress.value[progressIndex].percentage = 100
          }

          // Get signed URL for the uploaded image
          const { data: urlData } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(filePath, 3600)

          if (urlData?.signedUrl) {
            const newImage: PropertyImage = {
              name: sanitizedFileName,
              path: filePath,
              url: urlData.signedUrl,
              createdAt: new Date(),
            }
            successful.push(newImage)
            images.value.unshift(newImage)
          }
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

  async function deleteImage(imagePath: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([imagePath])

      if (deleteError) throw deleteError

      // Remove from local state
      images.value = images.value.filter((img) => img.path !== imagePath)

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar imagen'
      console.error('Error deleting image:', e)
      return false
    } finally {
      loading.value = false
    }
  }

  async function refreshImageUrl(image: PropertyImage): Promise<string | null> {
    try {
      const { data } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(image.path, 3600)

      if (data?.signedUrl) {
        // Update in local state
        const index = images.value.findIndex((img) => img.path === image.path)
        if (index !== -1) {
          images.value[index].url = data.signedUrl
        }
        return data.signedUrl
      }
      return null
    } catch (e) {
      console.error('Error refreshing image URL:', e)
      return null
    }
  }

  return {
    images,
    loading,
    uploading,
    error,
    uploadProgress,
    fetchImages,
    uploadImages,
    deleteImage,
    refreshImageUrl,
    validateFile,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE,
  }
}
