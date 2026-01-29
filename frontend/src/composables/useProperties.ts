import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Property } from '@/types'

export function useProperties() {
    const properties = ref<Property[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Fetch all properties (non-deleted)
    async function fetchProperties() {
        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('properties')
                .select(`
          *,
          owner:owners(id, full_name, email)
        `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            if (fetchError) throw fetchError

            properties.value = data ?? []
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch properties'
            console.error('Error fetching properties:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    // Fetch single property by ID
    async function fetchPropertyById(id: string) {
        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('properties')
                .select(`
          *,
          owner:owners(id, full_name, email)
        `)
                .eq('id', id)
                .is('deleted_at', null)
                .single()

            if (fetchError) throw fetchError

            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch property'
            console.error('Error fetching property:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    // Create new property
    async function createProperty(propertyData: Partial<Property>) {
        loading.value = true
        error.value = null

        try {
            const { data, error: createError } = await supabase
                .from('properties')
                .insert([propertyData])
                .select()
                .single()

            if (createError) throw createError

            // Optimistic update
            if (data) {
                properties.value.unshift(data)
            }

            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to create property'
            console.error('Error creating property:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Update existing property
    async function updateProperty(id: string, updates: Partial<Property>) {
        loading.value = true
        error.value = null

        try {
            const { data, error: updateError } = await supabase
                .from('properties')
                .update(updates)
                .eq('id', id)
                .select(`
          *,
          owner:owners(id, full_name, email)
        `)
                .single()

            if (updateError) throw updateError

            // Optimistic update
            if (data) {
                const index = properties.value.findIndex(p => p.id === id)
                if (index !== -1) {
                    properties.value[index] = data
                }
            }

            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to update property'
            console.error('Error updating property:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Soft delete property (set deleted_at)
    async function deleteProperty(id: string) {
        loading.value = true
        error.value = null

        try {
            const { error: deleteError } = await supabase
                .from('properties')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (deleteError) throw deleteError

            // Optimistic update - remove from list
            properties.value = properties.value.filter(p => p.id !== id)

            return true
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to delete property'
            console.error('Error deleting property:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    return {
        properties,
        loading,
        error,
        fetchProperties,
        fetchPropertyById,
        createProperty,
        updateProperty,
        deleteProperty,
    }
}
