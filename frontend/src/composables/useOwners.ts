import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Owner, OwnerFormData, OwnerWithProperties } from '@/types'
import { useAuth } from './useAuth'

export interface OwnerFilters {
    search?: string
    hasProperties?: boolean | 'all'
}

export interface PaginationParams {
    page: number
    pageSize: number
}

export interface FetchOwnersResult {
    data: Owner[]
    totalCount: number
}

export function useOwners() {
    const owners = ref<Owner[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const { organizationId } = useAuth()

    // Fetch all owners (non-deleted) with server-side filters and pagination
    async function fetchOwners(
        filters?: OwnerFilters,
        pagination?: PaginationParams
    ): Promise<FetchOwnersResult | null> {
        if (!organizationId.value) {
            console.warn('No organization_id available, skipping fetch')
            return null
        }

        loading.value = true
        error.value = null

        try {
            const needsPropertyFilter = filters?.hasProperties !== undefined && filters.hasProperties !== 'all'

            // If filtering by hasProperties, first get the set of owner IDs that have properties
            let ownerIdsWithProperties: Set<string> | null = null
            if (needsPropertyFilter) {
                const { data: propertyOwners, error: propError } = await supabase
                    .from('properties')
                    .select('owner_id')
                    .eq('organization_id', organizationId.value)
                    .is('deleted_at', null)
                    .not('owner_id', 'is', null)

                if (propError) throw propError

                ownerIdsWithProperties = new Set(propertyOwners?.map(p => p.owner_id) ?? [])
            }

            let query = supabase
                .from('owners')
                .select('*', { count: 'exact' })
                .eq('organization_id', organizationId.value)
                .is('deleted_at', null)
                .order('full_name', { ascending: true })

            // Apply search filter server-side
            if (filters?.search) {
                const searchTerm = `%${filters.search}%`
                query = query.or(
                    `full_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
                )
            }

            // Apply hasProperties filter server-side using IN/NOT IN
            if (needsPropertyFilter && ownerIdsWithProperties) {
                const ownerIdsArray = Array.from(ownerIdsWithProperties)

                if (filters?.hasProperties === true) {
                    // Owners WITH properties - must be in the set
                    if (ownerIdsArray.length === 0) {
                        // No owners have properties, return empty result
                        owners.value = []
                        return { data: [], totalCount: 0 }
                    }
                    query = query.in('id', ownerIdsArray)
                } else if (filters?.hasProperties === false) {
                    // Owners WITHOUT properties - must NOT be in the set
                    if (ownerIdsArray.length > 0) {
                        query = query.not('id', 'in', `(${ownerIdsArray.join(',')})`)
                    }
                    // If ownerIdsArray is empty, all owners have no properties, no filter needed
                }
            }

            // Apply pagination using .range()
            if (pagination) {
                const from = (pagination.page - 1) * pagination.pageSize
                const to = from + pagination.pageSize - 1
                query = query.range(from, to)
            }

            const { data, error: fetchError, count } = await query

            if (fetchError) throw fetchError

            owners.value = data ?? []
            return {
                data: data ?? [],
                totalCount: count ?? 0,
            }
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
        if (!organizationId.value) {
            console.warn('No organization_id available, skipping fetch')
            return null
        }

        loading.value = true
        error.value = null

        try {
            const { data: ownerData, error: fetchError } = await supabase
                .from('owners')
                .select('*')
                .eq('id', id)
                .eq('organization_id', organizationId.value)
                .is('deleted_at', null)
                .single()

            if (fetchError) throw fetchError

            // Fetch owner's properties
            const { data: propertiesData } = await supabase
                .from('properties')
                .select('*')
                .eq('owner_id', id)
                .eq('organization_id', organizationId.value)
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
        if (!organizationId.value) {
            return 0
        }

        try {
            const { count, error: countError } = await supabase
                .from('properties')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', ownerId)
                .eq('organization_id', organizationId.value)
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
        if (!organizationId.value) {
            throw new Error('No organization_id available, cannot create owner')
        }

        loading.value = true
        error.value = null

        try {
            const { data, error: createError } = await supabase
                .from('owners')
                .insert([{
                    ...ownerData,
                    organization_id: organizationId.value,
                }])
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
        if (!organizationId.value) {
            throw new Error('No organization_id available, cannot update owner')
        }

        loading.value = true
        error.value = null

        try {
            const { data, error: updateError } = await supabase
                .from('owners')
                .update({
                    ...updates,
                    organization_id: organizationId.value,
                })
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

    // Soft delete owner and cascade to properties (set deleted_at)
    async function deleteOwner(id: string): Promise<{ deletedPropertiesCount: number }> {
        if (!organizationId.value) {
            throw new Error('No organization_id available, cannot delete owner')
        }

        loading.value = true
        error.value = null

        try {
            const { data: cascadeResult, error: cascadeError } = await supabase
                .rpc('cascade_soft_delete_owner_properties', {
                    p_owner_id: id,
                    p_organization_id: organizationId.value
                })

            if (cascadeError) throw cascadeError

            const deletedPropertiesCount = cascadeResult ?? 0

            // Optimistic update
            owners.value = owners.value.filter(o => o.id !== id)

            return { deletedPropertiesCount }
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
