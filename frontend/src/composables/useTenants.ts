import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Tenant, TenantFormData } from '@/types'

export interface TenantFilters {
    search?: string
    hasEmployer?: boolean
    minIncome?: number
    status?: 'activo' | 'inactivo' | 'all'
}

export function useTenants() {
    const tenants = ref<Tenant[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Fetch all tenants (non-deleted) with optional filters
    async function fetchTenants(filters?: TenantFilters) {
        loading.value = true
        error.value = null

        try {
            let query = supabase
                .from('tenants')
                .select('*')
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            // Apply filters
            if (filters?.search) {
                const searchTerm = `%${filters.search}%`
                query = query.or(
                    `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
                )
            }

            if (filters?.hasEmployer === true) {
                query = query.not('employer', 'is', null)
            } else if (filters?.hasEmployer === false) {
                query = query.is('employer', null)
            }

            if (filters?.minIncome !== undefined && filters.minIncome > 0) {
                query = query.gte('monthly_income', filters.minIncome)
            }

            if (filters?.status && filters.status !== 'all') {
                query = query.eq('status', filters.status)
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError

            tenants.value = data ?? []
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch tenants'
            console.error('Error fetching tenants:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    // Fetch single tenant by ID
    async function fetchTenantById(id: string) {
        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', id)
                .is('deleted_at', null)
                .single()

            if (fetchError) throw fetchError

            return data as Tenant
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch tenant'
            console.error('Error fetching tenant:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    // Create new tenant
    async function createTenant(tenantData: TenantFormData) {
        loading.value = true
        error.value = null

        try {
            const { data, error: createError } = await supabase
                .from('tenants')
                .insert([tenantData])
                .select()
                .single()

            if (createError) throw createError

            // Optimistic update
            if (data) {
                tenants.value.unshift(data)
            }

            return data as Tenant
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to create tenant'
            console.error('Error creating tenant:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Update existing tenant
    async function updateTenant(id: string, updates: Partial<TenantFormData>) {
        loading.value = true
        error.value = null

        try {
            const { data, error: updateError } = await supabase
                .from('tenants')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            // Optimistic update
            if (data) {
                const index = tenants.value.findIndex(t => t.id === id)
                if (index !== -1) {
                    tenants.value[index] = data
                }
            }

            return data as Tenant
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to update tenant'
            console.error('Error updating tenant:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    // Soft delete tenant (set deleted_at)
    async function deleteTenant(id: string) {
        loading.value = true
        error.value = null

        try {
            const { error: deleteError } = await supabase
                .from('tenants')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)

            if (deleteError) throw deleteError

            // Optimistic update - remove from list
            tenants.value = tenants.value.filter(t => t.id !== id)

            return true
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to delete tenant'
            console.error('Error deleting tenant:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    return {
        tenants,
        loading,
        error,
        fetchTenants,
        fetchTenantById,
        createTenant,
        updateTenant,
        deleteTenant,
    }
}
