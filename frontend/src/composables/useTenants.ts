import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Tenant, TenantFormData, TenantStatus, Property, ContractStatus } from '@/types'
import { useAuth } from './useAuth'

// Extended tenant with contract and property info
export type TenantDisplayStatus = 'activo' | 'moroso' | 'sin_contrato'

export interface TenantWithContract extends Tenant {
    active_contract?: {
        id: string
        status: ContractStatus
        start_date: string
        property?: Pick<Property, 'id' | 'address_street' | 'address_number'>
    } | null
    has_overdue_payments?: boolean
    display_status: TenantDisplayStatus
    score: number
}

export interface TenantFilters {
    search?: string
    hasEmployer?: boolean | 'all'
    minIncome?: number
    status?: TenantStatus | 'all'
    displayStatus?: TenantDisplayStatus | 'all'
}

export interface PaginationParams {
    page: number
    pageSize: number
}

export interface FetchTenantsResult {
    data: TenantWithContract[]
    totalCount: number
    counts: {
        all: number
        activo: number
        moroso: number
        sin_contrato: number
    }
}

// Calculate tenant score based on profile completeness
function calculateScore(tenant: Tenant): number {
    let score = 0
    if (tenant.dni) score += 20
    if (tenant.email) score += 15
    if (tenant.phone) score += 15
    if (tenant.employer) score += 20
    if (tenant.monthly_income && tenant.monthly_income > 0) score += 20
    if (tenant.cuit_cuil) score += 10
    return score
}

export function useTenants() {
    const tenants = ref<TenantWithContract[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const { organizationId } = useAuth()

    // Fetch all tenants with contract info, filters and pagination
    async function fetchTenants(
        filters?: TenantFilters,
        pagination?: PaginationParams
    ): Promise<FetchTenantsResult | null> {
        if (!organizationId.value) {
            console.warn('No organization_id available, skipping fetch')
            return null
        }

        loading.value = true
        error.value = null

        try {
            // First, get all tenants with basic filters (without displayStatus filter)
            let query = supabase
                .from('tenants')
                .select('*', { count: 'exact' })
                .eq('organization_id', organizationId.value)
                .is('deleted_at', null)
                .order('last_name', { ascending: true })

            // Apply search filter
            if (filters?.search) {
                const searchTerm = `%${filters.search}%`
                query = query.or(
                    `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm},dni.ilike.${searchTerm}`
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

            const { data: tenantsData, error: fetchError } = await query

            if (fetchError) throw fetchError

            if (!tenantsData || tenantsData.length === 0) {
                tenants.value = []
                return { data: [], totalCount: 0, counts: { all: 0, activo: 0, moroso: 0, sin_contrato: 0 } }
            }

            const tenantIds = tenantsData.map(t => t.id)

            // Get active contracts for these tenants
            const { data: contractTenants } = await supabase
                .from('contract_tenants')
                .select(`
                    tenant_id,
                    contract:contracts!inner(
                        id,
                        status,
                        start_date,
                        property:properties(id, address_street, address_number)
                    )
                `)
                .in('tenant_id', tenantIds)
                .eq('contracts.status', 'activo')

            // Get overdue payments for these tenants
            const { data: overduePayments } = await supabase
                .from('payments')
                .select('contract:contracts!inner(tenants:contract_tenants(tenant_id))')
                .eq('status', 'vencido')
                .in('contracts.tenants.tenant_id', tenantIds)

            // Build a map of tenant_id -> active contract
            const contractMap = new Map<string, TenantWithContract['active_contract']>()
            if (contractTenants) {
                for (const ct of contractTenants) {
                    const contract = ct.contract as unknown as {
                        id: string
                        status: ContractStatus
                        start_date: string
                        property: { id: string; address_street: string; address_number: string } | null
                    }
                    if (contract) {
                        contractMap.set(ct.tenant_id, {
                            id: contract.id,
                            status: contract.status,
                            start_date: contract.start_date,
                            property: contract.property || undefined,
                        })
                    }
                }
            }

            // Build a set of tenant_ids with overdue payments
            const overdueSet = new Set<string>()
            if (overduePayments) {
                for (const p of overduePayments) {
                    const contract = p.contract as unknown as { tenants: { tenant_id: string }[] }
                    if (contract?.tenants) {
                        for (const t of contract.tenants) {
                            overdueSet.add(t.tenant_id)
                        }
                    }
                }
            }

            // Transform tenants with contract info and calculate display status
            const enrichedTenants: TenantWithContract[] = tenantsData.map(tenant => {
                const activeContract = contractMap.get(tenant.id) || null
                const hasOverdue = overdueSet.has(tenant.id)

                let displayStatus: TenantDisplayStatus
                if (hasOverdue) {
                    displayStatus = 'moroso'
                } else if (!activeContract) {
                    displayStatus = 'sin_contrato'
                } else {
                    displayStatus = 'activo'
                }

                return {
                    ...tenant,
                    active_contract: activeContract,
                    has_overdue_payments: hasOverdue,
                    display_status: displayStatus,
                    score: calculateScore(tenant),
                }
            })

            // Calculate counts before filtering by displayStatus
            const counts = {
                all: enrichedTenants.length,
                activo: enrichedTenants.filter(t => t.display_status === 'activo').length,
                moroso: enrichedTenants.filter(t => t.display_status === 'moroso').length,
                sin_contrato: enrichedTenants.filter(t => t.display_status === 'sin_contrato').length,
            }

            // Apply displayStatus filter
            let filtered = enrichedTenants
            if (filters?.displayStatus && filters.displayStatus !== 'all') {
                filtered = enrichedTenants.filter(t => t.display_status === filters.displayStatus)
            }

            // Apply pagination
            let paginated = filtered
            if (pagination) {
                const from = (pagination.page - 1) * pagination.pageSize
                const to = from + pagination.pageSize
                paginated = filtered.slice(from, to)
            }

            tenants.value = paginated
            return {
                data: paginated,
                totalCount: filtered.length,
                counts,
            }
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
        if (!organizationId.value) {
            console.warn('No organization_id available, skipping fetch')
            return null
        }

        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', id)
                .eq('organization_id', organizationId.value)
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
        if (!organizationId.value) {
            throw new Error('No organization_id available, cannot create tenant')
        }

        loading.value = true
        error.value = null

        try {
            const { data, error: createError } = await supabase
                .from('tenants')
                .insert([{
                    ...tenantData,
                    organization_id: organizationId.value,
                }])
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
        if (!organizationId.value) {
            throw new Error('No organization_id available, cannot update tenant')
        }

        loading.value = true
        error.value = null

        try {
            const { data, error: updateError } = await supabase
                .from('tenants')
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
