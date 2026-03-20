import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { ContractWithRelations, ContractDisplayStatus, Contract } from '@/types'
import { useAuth } from './useAuth'

export type ContractHistoryEntityType = 'tenant' | 'owner' | 'property'

export interface ContractHistoryItem {
  id: string
  propertyAddress: string
  tenantNames: string
  tenantCount: number
  startDate: string
  endDate: string
  monthlyRent: number
  status: ContractDisplayStatus
}

export function useContractHistory() {
  const contracts = ref<ContractHistoryItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { organizationId } = useAuth()

  /**
   * Calculate the display status of a contract based on dates and status
   */
  function calculateDisplayStatus(contract: Contract): ContractDisplayStatus {
    if (contract.deleted_at || contract.status === 'rescindido') {
      return 'cancelled'
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const endDate = new Date(contract.end_date)
    endDate.setHours(0, 0, 0, 0)

    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'expired'
    if (diffDays <= 60) return 'expiring_soon'
    return 'active'
  }

  /**
   * Format property address for display
   */
  function formatPropertyAddress(property: {
    address_street: string
    address_number?: string | null
    address_floor?: string | null
    address_apartment?: string | null
    address_city: string
  }): string {
    let address = property.address_street
    if (property.address_number) address += ` ${property.address_number}`
    if (property.address_floor) address += `, Piso ${property.address_floor}`
    if (property.address_apartment) address += `, Depto ${property.address_apartment}`
    address += `, ${property.address_city}`
    return address
  }

  /**
   * Get tenant display name(s) from contract
   */
  function formatTenantNames(tenants: Array<{
    role: string
    tenant?: { first_name: string; last_name: string } | null
  }>): { names: string; count: number } {
    const titulares = tenants.filter(t => t.role === 'titular')
    const count = tenants.length

    if (titulares.length === 0) {
      return { names: '-', count: 0 }
    }

    const primaryTenant = titulares[0]?.tenant
    if (!primaryTenant) {
      return { names: '-', count: 0 }
    }

    const primaryName = `${primaryTenant.last_name}, ${primaryTenant.first_name}`
    return { names: primaryName, count }
  }

  /**
   * Transform raw contract data to ContractHistoryItem
   */
  function transformContract(contract: ContractWithRelations): ContractHistoryItem {
    const { names, count } = formatTenantNames(contract.tenants || [])

    return {
      id: contract.id,
      propertyAddress: contract.property
        ? formatPropertyAddress(contract.property)
        : '-',
      tenantNames: names,
      tenantCount: count,
      startDate: contract.start_date,
      endDate: contract.end_date,
      monthlyRent: contract.current_rent_amount,
      status: calculateDisplayStatus(contract),
    }
  }

  /**
   * Fetch contracts for a tenant
   * Uses contract_tenants join table to find contracts where tenant_id = entityId
   */
  async function fetchContractsForTenant(tenantId: string): Promise<ContractHistoryItem[]> {
    // First, get contract IDs from the junction table
    const { data: contractTenants, error: junctionError } = await supabase
      .from('contract_tenants')
      .select('contract_id')
      .eq('tenant_id', tenantId)

    if (junctionError) throw junctionError
    if (!contractTenants || contractTenants.length === 0) return []

    const contractIds = contractTenants.map(ct => ct.contract_id)

    // Fetch the contracts with relations
    const { data, error: fetchError } = await supabase
      .from('contracts')
      .select(`
        *,
        property:properties(
          id, name, property_type,
          address_street, address_number, address_floor, address_apartment,
          address_city, address_state
        ),
        tenants:contract_tenants(
          contract_id, tenant_id, role,
          tenant:tenants(id, first_name, last_name)
        )
      `)
      .in('id', contractIds)
      .eq('organization_id', organizationId.value!)
      .order('start_date', { ascending: false })

    if (fetchError) throw fetchError

    return (data ?? []).map(transformContract)
  }

  /**
   * Fetch contracts for an owner
   * Joins through properties table: contracts where property.owner_id = entityId
   */
  async function fetchContractsForOwner(ownerId: string): Promise<ContractHistoryItem[]> {
    // First, get property IDs owned by this owner
    const { data: properties, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('organization_id', organizationId.value!)
      .is('deleted_at', null)

    if (propError) throw propError
    if (!properties || properties.length === 0) return []

    const propertyIds = properties.map(p => p.id)

    // Fetch contracts for these properties
    const { data, error: fetchError } = await supabase
      .from('contracts')
      .select(`
        *,
        property:properties(
          id, name, property_type,
          address_street, address_number, address_floor, address_apartment,
          address_city, address_state
        ),
        tenants:contract_tenants(
          contract_id, tenant_id, role,
          tenant:tenants(id, first_name, last_name)
        )
      `)
      .in('property_id', propertyIds)
      .eq('organization_id', organizationId.value!)
      .order('start_date', { ascending: false })

    if (fetchError) throw fetchError

    return (data ?? []).map(transformContract)
  }

  /**
   * Fetch contracts for a property
   * Direct filter by property_id = entityId
   */
  async function fetchContractsForProperty(propertyId: string): Promise<ContractHistoryItem[]> {
    const { data, error: fetchError } = await supabase
      .from('contracts')
      .select(`
        *,
        property:properties(
          id, name, property_type,
          address_street, address_number, address_floor, address_apartment,
          address_city, address_state
        ),
        tenants:contract_tenants(
          contract_id, tenant_id, role,
          tenant:tenants(id, first_name, last_name)
        )
      `)
      .eq('property_id', propertyId)
      .eq('organization_id', organizationId.value!)
      .order('start_date', { ascending: false })

    if (fetchError) throw fetchError

    return (data ?? []).map(transformContract)
  }

  /**
   * Fetch contract history for an entity
   */
  async function fetchContractHistory(
    entityType: ContractHistoryEntityType,
    entityId: string
  ): Promise<ContractHistoryItem[] | null> {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetch')
      return null
    }

    loading.value = true
    error.value = null

    try {
      let result: ContractHistoryItem[]

      switch (entityType) {
        case 'tenant':
          result = await fetchContractsForTenant(entityId)
          break
        case 'owner':
          result = await fetchContractsForOwner(entityId)
          break
        case 'property':
          result = await fetchContractsForProperty(entityId)
          break
        default:
          throw new Error(`Unknown entity type: ${entityType}`)
      }

      contracts.value = result
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar historial de contratos'
      console.error('Error fetching contract history:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    contracts,
    loading,
    error,
    fetchContractHistory,
    calculateDisplayStatus,
  }
}
