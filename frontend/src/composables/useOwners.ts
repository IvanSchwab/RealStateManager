import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Owner, OwnerFormData, OwnerWithProperties } from '@/types'

export interface OwnerFilters {
    search?: string
    hasProperties?: boolean
}

export function useOwners() {
    const owners = ref<Owner[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Fetch all owners (non-deleted) with optional filters
    async function fetchOwners(filters?: OwnerFilters) {
        loading.value = true
        error.value = null

        try {
            let query = supabase
                .from('owners')
                .select('*')
                .is('deleted_at', null)
                .order('full_name', { ascending: true })

            // Apply search filter
            if (filters?.search) {
                const searchTerm = `%${filters.search}%`
                query = query.or(
                    `full_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
                )
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError

            // If we need to filter by hasProperties, we need to do it client-side
            // after fetching property counts
            let result = data ?? []

            if (filters?.hasProperties !== undefined) {
                // Fetch property counts for each owner
                const ownerIds = result.map(o => o.id)
                if (ownerIds.length > 0) {
                    const { data: propertyCounts } = await supabase
                        .from('properties')
                        .select('owner_id')
                        .in('owner_id', ownerIds)
                        .is('deleted_at', null)

                    const ownerPropertyCount = new Map<string, number>()
                    propertyCounts?.forEach(p => {
                        const count = ownerPropertyCount.get(p.owner_id) || 0
                        ownerPropertyCount.set(p.owner_id, count + 1)
                    })

                    if (filters.hasProperties === true) {
                        result = result.filter(o => (ownerPropertyCount.get(o.id) || 0) > 0)
                    } else {
                        result = result.filter(o => (ownerPropertyCount.get(o.id) || 0) === 0)
                    }
                }
            }

            owners.value = result
            return result
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar propietarios'
            console.error('Error fetching owners:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    // Fetch single owner by ID with properties
    async function fetchOwnerById(id: string): Promise<OwnerWithProperties | null> {
        loading.value = true
        error.value = null

        try {
            const { data: ownerData, error: fetchError } = await supabase
                .from('owners')
                .select('*')
                .eq('id', id)
                .is('deleted_at', null)
                .single()

            if (fetchError) throw fetchError

            // Fetch owner's properties
            const { data: propertiesData } = await supabase
                .from('properties')
                .select('*')
                .eq('owner_id', id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            const owner: OwnerWithProperties = {
                ...ownerData,
                properties: propertiesData ?? [],
                property_count: propertiesData?.length ?? 0
            }

            return owner
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar propietario'
            console.error('Error fetching owner:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    // Get property count for an owner (useful for delete warning)
    async function getOwnerPropertyCount(ownerId: string): Promise<number> {
        try {
            const { count, error: countError } = await supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', ownerId)
                .is('deleted_at', null)

            if (countError) throw countError
            return count ?? 0
        } catch (e) {
            console.error('Error getting property count:', e)
            return 0
        }
    }

    // Create new owner
    async function createOwner(ownerData: OwnerFormData): Promise<Owner> {
        loading.value = true
        error.value = null

        try {
            const { data, error: createError } = await supabase
                .from('owners')
                .insert([ownerData])
                .select()
                .single()

            if (createError) throw createError

            // Optimistic update
            if (data) {
                owners.value.unshift(data)
            }

            return data as Owner
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al crear propietario'
            console.error('Error creating owner:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Update existing owner
    async function updateOwner(id: string, updates: Partial<OwnerFormData>): Promise<Owner> {
        loading.value = true
        error.value = null

        try {
            const { data, error: updateError } = await supabase
                .from('owners')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            // Optimistic update
            if (data) {
                const index = owners.value.findIndex(o => o.id === id)
                if (index !== -1) {
                    owners.value[index] = data
                }
            }

            return data as Owner
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al actualizar propietario'
            console.error('Error updating owner:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Soft delete owner (set deleted_at)
    async function deleteOwner(id: string): Promise<boolean> {
        loading.value = true
        error.value = null

        try {
            const { error: deleteError } = await supabase
                .from('owners')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (deleteError) throw deleteError

            // Optimistic update - remove from list
            owners.value = owners.value.filter(o => o.id !== id)

            return true
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al eliminar propietario'
            console.error('Error deleting owner:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    return {
        owners,
        loading,
        error,
        fetchOwners,
        fetchOwnerById,
        getOwnerPropertyCount,
        createOwner,
        updateOwner,
        deleteOwner,
    }
}
