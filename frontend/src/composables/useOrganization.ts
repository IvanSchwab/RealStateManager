import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Organization, OrganizationSettings, DateFormat, CurrencyCode } from '@/types'
import { useAuth } from './useAuth'

// Shared state across all instances
const organization = ref<Organization | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Default values for organization settings
const DEFAULT_DATE_FORMAT: DateFormat = 'DD/MM/YYYY'
const DEFAULT_CURRENCY: CurrencyCode = 'ARS'

export function useOrganization() {
  const { organizationId, profile } = useAuth()

  const isAdmin = computed(() => profile.value?.role === 'admin')

  // Reactive settings with defaults
  const dateFormat = computed<DateFormat>(() =>
    organization.value?.settings?.date_format ?? DEFAULT_DATE_FORMAT
  )

  const defaultCurrency = computed<CurrencyCode>(() =>
    organization.value?.settings?.default_currency ?? DEFAULT_CURRENCY
  )

  async function fetchOrganization() {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetch')
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId.value)
        .single()

      if (fetchError) throw fetchError

      organization.value = data
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar la organizacion'
      console.error('Error fetching organization:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateOrganization(data: { name?: string; logo_url?: string | null }) {
    if (!organizationId.value) {
      throw new Error('No organization_id available')
    }

    if (!isAdmin.value) {
      throw new Error('Solo los administradores pueden modificar la organizacion')
    }

    loading.value = true
    error.value = null

    try {
      const { data: updated, error: updateError } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', organizationId.value)
        .select()
        .single()

      if (updateError) throw updateError

      organization.value = updated
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar la organizacion'
      console.error('Error updating organization:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function uploadLogo(file: File): Promise<string> {
    if (!organizationId.value) {
      throw new Error('No organization_id available')
    }

    if (!isAdmin.value) {
      throw new Error('Solo los administradores pueden subir el logo')
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
    const path = `${organizationId.value}/logo_${timestamp}.${ext}`

    loading.value = true
    error.value = null

    try {
      // Delete existing logo files for this org
      const { data: existingFiles } = await supabase.storage
        .from('org-logos')
        .list(organizationId.value)

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${organizationId.value}/${f.name}`)
        await supabase.storage.from('org-logos').remove(filesToDelete)
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('org-logos')
        .getPublicUrl(path)

      return urlData.publicUrl
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al subir el logo'
      console.error('Error uploading logo:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  async function removeLogo(): Promise<void> {
    if (!organizationId.value) {
      throw new Error('No organization_id available')
    }

    if (!isAdmin.value) {
      throw new Error('Solo los administradores pueden eliminar el logo')
    }

    loading.value = true
    error.value = null

    try {
      // Delete existing logo files
      const { data: existingFiles } = await supabase.storage
        .from('org-logos')
        .list(organizationId.value)

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${organizationId.value}/${f.name}`)
        await supabase.storage.from('org-logos').remove(filesToDelete)
      }

      // Update organization to remove logo_url
      await updateOrganization({ logo_url: null })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar el logo'
      console.error('Error removing logo:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // Helper: generate initials from org name
  function getInitials(name: string): string {
    if (!name) return ''
    return name
      .split(' ')
      .slice(0, 2)
      .map(word => word[0])
      .join('')
      .toUpperCase()
  }

  async function updateSettings(newSettings: Partial<OrganizationSettings>) {
    if (!organizationId.value) {
      throw new Error('No organization_id available')
    }

    if (!isAdmin.value) {
      throw new Error('Solo los administradores pueden modificar la configuracion')
    }

    loading.value = true
    error.value = null

    try {
      // Merge new settings with existing settings
      const currentSettings = organization.value?.settings ?? {}
      const mergedSettings = { ...currentSettings, ...newSettings }

      const { data: updated, error: updateError } = await supabase
        .from('organizations')
        .update({ settings: mergedSettings })
        .eq('id', organizationId.value)
        .select()
        .single()

      if (updateError) throw updateError

      organization.value = updated
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar la configuracion'
      console.error('Error updating organization settings:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // Helper: generate deterministic color from org name
  function getAvatarColor(name: string): string {
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

    if (!name) return colors[0]

    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return {
    organization,
    loading,
    error,
    isAdmin,
    dateFormat,
    defaultCurrency,
    fetchOrganization,
    updateOrganization,
    updateSettings,
    uploadLogo,
    removeLogo,
    getInitials,
    getAvatarColor
  }
}
