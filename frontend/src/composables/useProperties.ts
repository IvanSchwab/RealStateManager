import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Property, PropertyType, PropertyStatus, PropertyPurpose } from '@/types'
import { useAuth } from './useAuth'

export interface PropertiesFilters {
    search?: string
    type?: PropertyType | 'all'
    status?: PropertyStatus | 'all'
    purpose?: PropertyPurpose | 'all'
}

export interface PaginationParams {
    page: number
    pageSize: number
}

export interface FetchPropertiesResult {
    data: Property[]
    totalCount: number
}

export function useProperties() {
    const properties = ref<Property[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const { organizationId } = useAuth()

    // Fetch all properties (non-deleted) with server-side filters and pagination
    async function fetchProperties(
        filters?: PropertiesFilters,
        pagination?: PaginationParams
    ): Promise<FetchPropertiesResult | null> {
        if (!organizationId.value) {
            console.warn('No organization_id available, skipping fetch')
            return null
        }

        loading.value = true
        error.value = null

        try {
            // Start building the query
            let query = supabase
                .from('properties')
                .select(`
                    *,
                    owner:owners(id, full_name, email)
                `, { count: 'exact' })
                .eq('organization_id', organizationId.value)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            // Apply server-side filters
            if (filters?.search) {
                const searchTerm = `%${filters.search}%`
                query = query.or(
                    `name.ilike.${searchTerm},address_street.ilike.${searchTerm},address_city.ilike.${searchTerm}`
                )
            }

            if (filters?.type && filters.type !== 'all') {
                query = query.eq('property_type', filters.type)
            }

            if (filters?.status && filters.status !== 'all') {
                query = query.eq('status', filters.status)
            }

            if (filters?.purpose && filters.purpose !== 'all') {
                query = query.eq('purpose', filters.purpose)
            }

            // Apply pagination using .range()
            if (pagination) {
                const from = (pagination.page - 1) * pagination.pageSize
                const to = from + pagination.pageSize - 1
                query = query.range(from, to)
            }

            const { data, error: fetchError, count } = await query

            if (fetchError) throw fetchError

            properties.value = data ?? []
            return {
                data: data ?? [],
                totalCount: count ?? 0,
            }
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
        if (!organizationId.value) {
            console.warn('No organization_id available, skipping fetch')
            return null
        }

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
                .eq('organization_id', organizationId.value)
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
        if (!organizationId.value) {
            throw new Error('No organization_id available, cannot create property')
        }

        loading.value = true
        error.value = null

        try {
            const { data, error: createError } = await supabase
                .from('properties')
                .insert([{
                    ...propertyData,
                    organization_id: organizationId.value,
                }])
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
        if (!organizationId.value) {
            throw new Error('No organization_id available, cannot update property')
        }

        loading.value = true
        error.value = null

        try {
            const { data, error: updateError } = await supabase
                .from('properties')
                .update({
                    ...updates,
                    organization_id: organizationId.value,
                })
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
