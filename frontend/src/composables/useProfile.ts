import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

const loading = ref(false)
const error = ref<string | null>(null)

export function useProfile() {
  const { user, profile, loadProfile } = useAuth()

  const userId = computed(() => user.value?.id ?? null)

  /**
   * Update the current user's profile (full_name and/or avatar_url)
   * This updates the profiles table, NOT the organizations table
   */
  async function updateProfile(data: { full_name?: string; avatar_url?: string | null }) {
    if (!userId.value) {
      throw new Error('No user logged in')
    }

    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId.value)

      if (updateError) throw updateError

      // Immediately patch local state for instant UI feedback
      if (profile.value) {
        profile.value = {
          ...profile.value,
          ...data,
          updated_at: new Date().toISOString()
        }
      }

      // Also reload from DB to ensure full sync (belt and suspenders)
      await loadProfile()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar el perfil'
      console.error('Error updating profile:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Upload an avatar image to Supabase Storage
   * Avatars are stored in the 'avatars' bucket under {user_id}/
   * Returns the public URL of the uploaded avatar
   */
  async function uploadAvatar(file: File): Promise<string> {
    if (!userId.value) {
      throw new Error('No user logged in')
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Use JPG, PNG, WebP o SVG.')
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error('El archivo es demasiado grande. Maximo 2MB.')
    }

    // Generate file path with timestamp to avoid caching issues
    const ext = file.name.split('.').pop() || 'png'
    const timestamp = Date.now()
    const path = `${userId.value}/avatar_${timestamp}.${ext}`

    loading.value = true
    error.value = null

    try {
      // Delete existing avatar files for this user
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId.value)

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId.value}/${f.name}`)
        await supabase.storage.from('avatars').remove(filesToDelete)
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      return urlData.publicUrl
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al subir el avatar'
      console.error('Error uploading avatar:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Remove the current user's avatar from storage and profile
   */
  async function removeAvatar(): Promise<void> {
    if (!userId.value) {
      throw new Error('No user logged in')
    }

    loading.value = true
    error.value = null

    try {
      // Delete existing avatar files
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId.value)

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId.value}/${f.name}`)
        await supabase.storage.from('avatars').remove(filesToDelete)
      }

      // Update profile to remove avatar_url
      await updateProfile({ avatar_url: null })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar el avatar'
      console.error('Error removing avatar:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Change the current user's password
   */
  async function changePassword(newPassword: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cambiar la contrasena'
      console.error('Error changing password:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Helper: generate initials from name or email
   */
  function getInitials(name: string | null, email?: string | null): string {
    if (name) {
      return name
        .split(' ')
        .slice(0, 2)
        .map(word => word[0])
        .join('')
        .toUpperCase()
    }

    if (email) {
      return email[0].toUpperCase()
    }

    return '?'
  }

  /**
   * Helper: generate deterministic color from name or email
   */
  function getAvatarColor(name: string | null, email?: string | null): string {
    const colors = [
      '#4F46E5', // Indigo
      '#7C3AED', // Violet
      '#DB2777', // Pink
      '#DC2626', // Red
      '#D97706', // Amber
      '#059669', // Emerald
      '#0891B2', // Cyan
      '#0284C7', // Sky
    ]

    const str = name || email || ''
    if (!str) return colors[0]

    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  /**
   * Get display name: full_name if available, otherwise email prefix
   */
  const displayName = computed(() => {
    if (profile.value?.full_name) {
      return profile.value.full_name
    }
    if (profile.value?.email) {
      return profile.value.email.split('@')[0]
    }
    return 'User'
  })

  return {
    profile,
    loading,
    error,
    displayName,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    changePassword,
    getInitials,
    getAvatarColor
  }
}
