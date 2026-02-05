import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
    Contract,
    ContractWithRelations,
    ContractFormData,
    ContractType,
    ContractStatus,
    ContractDisplayStatus,
    AdjustmentPeriod,
    Guarantor,
} from '@/types'

export interface ContractFilters {
    search?: string
    status?: ContractDisplayStatus | 'all'
    contract_type?: ContractType | 'all'
    property_id?: string
}

export function useContracts() {
    const contracts = ref<ContractWithRelations[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    /**
     * Calculate the display status of a contract based on dates and deleted_at
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
     * Calculate end date based on start date and duration in months
     */
    function calculateEndDate(startDate: string, durationMonths: number): string {
        const start = new Date(startDate)
        const end = new Date(start)
        end.setMonth(end.getMonth() + durationMonths)
        return end.toISOString().split('T')[0]
    }

    /**
     * Calculate the next adjustment date based on start date and frequency
     */
    function calculateNextAdjustmentDate(
        startDate: string,
        frequency: AdjustmentPeriod
    ): string {
        const start = new Date(startDate)
        const monthsToAdd: Record<AdjustmentPeriod, number> = {
            trimestral: 3,
            semestral: 6,
            anual: 12,
        }

        const nextDate = new Date(start)
        nextDate.setMonth(nextDate.getMonth() + monthsToAdd[frequency])
        return nextDate.toISOString().split('T')[0]
    }

    /**
     * Fetch all contracts with relations
     */
    async function fetchContracts(filters?: ContractFilters) {
        loading.value = true
        error.value = null

        try {
            let query = supabase
                .from('contracts')
                .select(`
                    *,
                    property:properties(
                        id, name, property_type,
                        address_street, address_number, address_floor, address_apartment,
                        address_city, address_state, status
                    ),
                    tenants:contract_tenants(
                        contract_id, tenant_id, role, created_at,
                        tenant:tenants(id, first_name, last_name, email, phone)
                    )
                `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            // Filter by property_id if specified
            if (filters?.property_id) {
                query = query.eq('property_id', filters.property_id)
            }

            // Filter by contract_type
            if (filters?.contract_type && filters.contract_type !== 'all') {
                query = query.eq('contract_type', filters.contract_type)
            }

            const { data, error: fetchError } = await query

            if (fetchError) throw fetchError

            // Transform and filter results
            let result = (data ?? []) as ContractWithRelations[]

            // Client-side filtering for search (across property address and tenant name)
            if (filters?.search) {
                const searchLower = filters.search.toLowerCase()
                result = result.filter(contract => {
                    // Search in property address
                    const propertyAddress = contract.property
                        ? `${contract.property.address_street} ${contract.property.address_number || ''}`
                        : ''
                    if (propertyAddress.toLowerCase().includes(searchLower)) return true

                    // Search in tenant names
                    const tenantNames = contract.tenants
                        ?.map(ct => `${ct.tenant?.first_name} ${ct.tenant?.last_name}`)
                        .join(' ') ?? ''
                    if (tenantNames.toLowerCase().includes(searchLower)) return true

                    return false
                })
            }

            // Client-side filtering for display status
            if (filters?.status && filters.status !== 'all') {
                result = result.filter(contract => {
                    const displayStatus = calculateDisplayStatus(contract)
                    return displayStatus === filters.status
                })
            }

            contracts.value = result
            return result
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar contratos'
            console.error('Error fetching contracts:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    /**
     * Fetch a single contract by ID with all relations
     */
    async function fetchContractById(id: string): Promise<ContractWithRelations | null> {
        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('contracts')
                .select(`
                    *,
                    property:properties(
                        id, name, property_type,
                        address_street, address_number, address_floor, address_apartment,
                        address_city, address_state, address_zip_code, status,
                        bedrooms, bathrooms, square_meters, description
                    ),
                    tenants:contract_tenants(
                        contract_id, tenant_id, role, created_at,
                        tenant:tenants(id, first_name, last_name, email, phone, dni, cuit_cuil, address)
                    )
                `)
                .eq('id', id)
                .is('deleted_at', null)
                .single()

            if (fetchError) throw fetchError

            return data as ContractWithRelations
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cargar contrato'
            console.error('Error fetching contract:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    /**
     * Create a new contract with tenants
     * This performs multiple operations that should ideally be transactional
     */
    async function createContract(formData: ContractFormData): Promise<Contract | null> {
        loading.value = true
        error.value = null

        try {
            // Calculate derived fields
            const endDate = calculateEndDate(formData.start_date, formData.duration_months)
            const nextAdjustmentDate = formData.adjustment_type !== 'ninguno' && formData.adjustment_period
                ? calculateNextAdjustmentDate(formData.start_date, formData.adjustment_period)
                : null

            // Prepare contract data for insertion
            const contractData = {
                property_id: formData.property_id,
                contract_type: formData.contract_type,
                base_rent_amount: formData.base_rent_amount,
                current_rent_amount: formData.base_rent_amount, // Initial = base
                deposit_amount: formData.deposit_amount,
                start_date: formData.start_date,
                end_date: endDate,
                first_payment_date: formData.first_payment_date,
                payment_due_day: formData.payment_due_day,
                adjustment_type: formData.adjustment_type,
                adjustment_period: formData.adjustment_period,
                next_adjustment_date: nextAdjustmentDate,
                late_payment_interest_rate: formData.late_payment_interest_rate,
                early_termination_penalty_months: formData.early_termination_penalty_months,
                non_return_penalty_rate: formData.non_return_penalty_rate,
                insurance_required: formData.insurance_required,
                guarantors: formData.guarantors as unknown as Guarantor[],
                notes: formData.notes || null,
                status: 'activo' as ContractStatus,
            }

            // 1. Insert contract
            const { data: contract, error: contractError } = await supabase
                .from('contracts')
                .insert([contractData])
                .select()
                .single()

            if (contractError) throw contractError
            if (!contract) throw new Error('No se pudo crear el contrato')

            // 2. Insert contract_tenants (titular)
            const tenantEntries = [
                {
                    contract_id: contract.id,
                    tenant_id: formData.titular_id,
                    role: 'titular' as const,
                },
            ]

            // Add co-titulares
            for (const coTitularId of formData.co_titular_ids) {
                tenantEntries.push({
                    contract_id: contract.id,
                    tenant_id: coTitularId,
                    role: 'co_titular' as const,
                })
            }

            const { error: tenantsError } = await supabase
                .from('contract_tenants')
                .insert(tenantEntries)

            if (tenantsError) {
                // Rollback: delete the contract if tenant insertion fails
                await supabase.from('contracts').delete().eq('id', contract.id)
                throw tenantsError
            }

            // 3. Update property status to 'alquilada'
            const { error: propertyError } = await supabase
                .from('properties')
                .update({ status: 'alquilada' })
                .eq('id', formData.property_id)

            if (propertyError) {
                console.warn('Failed to update property status:', propertyError)
                // Don't throw - contract is created, property status can be updated manually
            }

            // Refetch to get full relations
            const fullContract = await fetchContractById(contract.id)
            if (fullContract) {
                contracts.value.unshift(fullContract)
            }

            return contract as Contract
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al crear contrato'
            console.error('Error creating contract:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    /**
     * Update an existing contract
     */
    async function updateContract(
        id: string,
        formData: Partial<ContractFormData>
    ): Promise<Contract | null> {
        loading.value = true
        error.value = null

        try {
            // Build update object
            const updates: Record<string, unknown> = {}

            // Direct field mappings
            if (formData.contract_type !== undefined) updates.contract_type = formData.contract_type
            if (formData.base_rent_amount !== undefined) {
                updates.base_rent_amount = formData.base_rent_amount
                updates.current_rent_amount = formData.base_rent_amount
            }
            if (formData.deposit_amount !== undefined) updates.deposit_amount = formData.deposit_amount
            if (formData.first_payment_date !== undefined) updates.first_payment_date = formData.first_payment_date
            if (formData.payment_due_day !== undefined) updates.payment_due_day = formData.payment_due_day
            if (formData.adjustment_type !== undefined) updates.adjustment_type = formData.adjustment_type
            if (formData.adjustment_period !== undefined) updates.adjustment_period = formData.adjustment_period
            if (formData.late_payment_interest_rate !== undefined) updates.late_payment_interest_rate = formData.late_payment_interest_rate
            if (formData.early_termination_penalty_months !== undefined) updates.early_termination_penalty_months = formData.early_termination_penalty_months
            if (formData.non_return_penalty_rate !== undefined) updates.non_return_penalty_rate = formData.non_return_penalty_rate
            if (formData.insurance_required !== undefined) updates.insurance_required = formData.insurance_required
            if (formData.guarantors !== undefined) updates.guarantors = formData.guarantors
            if (formData.notes !== undefined) updates.notes = formData.notes || null

            // Recalculate dates if duration changed
            if (formData.start_date && formData.duration_months) {
                updates.start_date = formData.start_date
                updates.end_date = calculateEndDate(formData.start_date, formData.duration_months)
            }

            // Recalculate next adjustment date if relevant fields changed
            if (formData.adjustment_type && formData.adjustment_period && formData.start_date) {
                if (formData.adjustment_type !== 'ninguno') {
                    updates.next_adjustment_date = calculateNextAdjustmentDate(
                        formData.start_date,
                        formData.adjustment_period
                    )
                } else {
                    updates.next_adjustment_date = null
                }
            }

            // 1. Update contract
            const { data: contract, error: updateError } = await supabase
                .from('contracts')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (updateError) throw updateError

            // 2. Update tenants if changed
            if (formData.titular_id || formData.co_titular_ids) {
                // Remove existing tenant associations
                await supabase
                    .from('contract_tenants')
                    .delete()
                    .eq('contract_id', id)

                // Re-insert with new data
                const tenantEntries = []

                if (formData.titular_id) {
                    tenantEntries.push({
                        contract_id: id,
                        tenant_id: formData.titular_id,
                        role: 'titular' as const,
                    })
                }

                if (formData.co_titular_ids) {
                    for (const coTitularId of formData.co_titular_ids) {
                        tenantEntries.push({
                            contract_id: id,
                            tenant_id: coTitularId,
                            role: 'co_titular' as const,
                        })
                    }
                }

                if (tenantEntries.length > 0) {
                    const { error: tenantsError } = await supabase
                        .from('contract_tenants')
                        .insert(tenantEntries)

                    if (tenantsError) {
                        console.warn('Failed to update contract tenants:', tenantsError)
                    }
                }
            }

            // Update local state
            const fullContract = await fetchContractById(id)
            if (fullContract) {
                const index = contracts.value.findIndex(c => c.id === id)
                if (index !== -1) {
                    contracts.value[index] = fullContract
                }
            }

            return contract as Contract
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al actualizar contrato'
            console.error('Error updating contract:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    /**
     * Cancel a contract (soft delete and optionally update property status)
     */
    async function cancelContract(
        id: string,
        updatePropertyStatus: boolean = true
    ): Promise<boolean> {
        loading.value = true
        error.value = null

        try {
            // Get the contract first to know the property_id
            const contract = contracts.value.find(c => c.id === id)
                ?? await fetchContractById(id)

            // 1. Update contract status to rescindido and set deleted_at
            const { error: cancelError } = await supabase
                .from('contracts')
                .update({
                    status: 'rescindido' as ContractStatus,
                    deleted_at: new Date().toISOString(),
                })
                .eq('id', id)

            if (cancelError) throw cancelError

            // 2. Optionally update property status to disponible
            if (updatePropertyStatus && contract?.property_id) {
                const { error: propertyError } = await supabase
                    .from('properties')
                    .update({ status: 'disponible' })
                    .eq('id', contract.property_id)

                if (propertyError) {
                    console.warn('Failed to update property status:', propertyError)
                }
            }

            // Remove from local state
            contracts.value = contracts.value.filter(c => c.id !== id)

            return true
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al cancelar contrato'
            console.error('Error cancelling contract:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    /**
     * Get the titular tenant from a contract
     */
    function getTitular(contract: ContractWithRelations) {
        return contract.tenants?.find(ct => ct.role === 'titular')?.tenant ?? null
    }

    /**
     * Get co-titulares from a contract
     */
    function getCoTitulares(contract: ContractWithRelations) {
        return contract.tenants
            ?.filter(ct => ct.role === 'co_titular')
            .map(ct => ct.tenant)
            .filter(Boolean) ?? []
    }

    /**
     * Format property address for display
     */
    function formatPropertyAddress(contract: ContractWithRelations): string {
        const p = contract.property
        if (!p) return 'Sin dirección'

        let address = p.address_street
        if (p.address_number) address += ` ${p.address_number}`
        if (p.address_floor) address += `, Piso ${p.address_floor}`
        if (p.address_apartment) address += `, Depto ${p.address_apartment}`
        return address
    }

    return {
        contracts,
        loading,
        error,
        fetchContracts,
        fetchContractById,
        createContract,
        updateContract,
        cancelContract,
        calculateDisplayStatus,
        calculateEndDate,
        calculateNextAdjustmentDate,
        getTitular,
        getCoTitulares,
        formatPropertyAddress,
    }
}
