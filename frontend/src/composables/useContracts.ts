import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
    Contract,
    ContractWithRelations,
    ContractFormData,
    ContractType,
    ContractStatus,
    ContractDisplayStatus,
    ContractTenantRole,
    AdjustmentPeriod,
    Guarantor,
} from '@/types'
import { useAuth } from './useAuth'
import { useContractPDF } from './useContractPDF'

export interface ContractFilters {
    search?: string
    status?: ContractDisplayStatus | 'all'
    contract_type?: ContractType | 'all'
    property_id?: string
}

export interface PaginationParams {
    page: number
    pageSize: number
}

export interface FetchContractsResult {
    data: ContractWithRelations[]
    totalCount: number
}

export interface CancelContractParams {
    id: string
    updatePropertyStatus: boolean
    effectiveDate: string        // ISO date string
    reason: 'incumplimiento_pago' | 'acuerdo_mutuo' | 'otro'
    notes?: string
    penaltyAmount?: number
    customReason?: string
}

export function useContracts() {
    const contracts = ref<ContractWithRelations[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)
    const { organizationId } = useAuth()
    const { generatePDF, generateRescisionPDF, generateExtensionPDF, saveLegalDocument } = useContractPDF()

    /**
     * Calculate the display status of a contract based on dates and deleted_at
     */
    function calculateDisplayStatus(contract: Contract): ContractDisplayStatus {
        // Explicit status checks first
        if (contract.status === 'vencido') return 'expired'
        if (contract.status === 'renovado') return 'renewed'
        if (contract.status === 'borrador') return 'draft'

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
     * Fetch all contracts with relations and server-side pagination
     * Search and status filters are now handled server-side
     */
    async function fetchContracts(
        filters?: ContractFilters,
        pagination?: PaginationParams
    ): Promise<FetchContractsResult | null> {
        if (!organizationId.value) {
            console.warn('No organization_id available, skipping fetch')
            return null
        }

        loading.value = true
        error.value = null

        try {
            // For search filter, we need to find matching contract IDs first
            // because we search across multiple related tables
            let contractIdsFromSearch: string[] | null = null

            if (filters?.search) {
                const searchTerm = `%${filters.search}%`

                // Run both search queries in parallel
                const [propertyResult, tenantResult] = await Promise.all([
                    // Search in properties (address_street, address_number)
                    supabase
                        .from('contracts')
                        .select('id, property:properties!inner(address_street, address_number)')
                        .eq('organization_id', organizationId.value)
                        .is('deleted_at', null)
                        .or(`address_street.ilike.${searchTerm},address_number.ilike.${searchTerm}`, { referencedTable: 'properties' }),

                    // Search in tenants (first_name, last_name) via contract_tenants
                    supabase
                        .from('contract_tenants')
                        .select('contract_id, tenant:tenants!inner(first_name, last_name)')
                        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`, { referencedTable: 'tenants' }),
                ])

                // Combine unique contract IDs from both searches
                const propertyContractIds = propertyResult.data?.map(c => c.id) ?? []
                const tenantContractIds = tenantResult.data?.map(ct => ct.contract_id) ?? []
                contractIdsFromSearch = [...new Set([...propertyContractIds, ...tenantContractIds])]

                // If no matches found, return empty result
                if (contractIdsFromSearch.length === 0) {
                    contracts.value = []
                    return { data: [], totalCount: 0 }
                }
            }

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
                `, { count: 'exact' })
                .eq('organization_id', organizationId.value)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })

            // Apply search filter using contract IDs
            if (contractIdsFromSearch !== null) {
                query = query.in('id', contractIdsFromSearch)
            }

            // Filter by property_id if specified (server-side)
            if (filters?.property_id) {
                query = query.eq('property_id', filters.property_id)
            }

            // Filter by contract_type (server-side)
            if (filters?.contract_type && filters.contract_type !== 'all') {
                query = query.eq('contract_type', filters.contract_type)
            }

            // Apply status filter server-side using date calculations
            if (filters?.status && filters.status !== 'all') {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const todayStr = today.toISOString().split('T')[0]

                const sixtyDaysFromNow = new Date(today)
                sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
                const sixtyDaysStr = sixtyDaysFromNow.toISOString().split('T')[0]

                switch (filters.status) {
                    case 'cancelled':
                        // Contracts with status 'rescindido'
                        query = query.eq('status', 'rescindido')
                        break
                    case 'expired':
                        // end_date < today AND not cancelled
                        query = query
                            .lt('end_date', todayStr)
                            .neq('status', 'rescindido')
                        break
                    case 'expiring_soon':
                        // end_date >= today AND end_date <= today + 60 days AND not cancelled
                        query = query
                            .gte('end_date', todayStr)
                            .lte('end_date', sixtyDaysStr)
                            .neq('status', 'rescindido')
                        break
                    case 'active':
                        // end_date > today + 60 days AND not cancelled
                        query = query
                            .gt('end_date', sixtyDaysStr)
                            .neq('status', 'rescindido')
                        break
                }
            }

            // Apply server-side pagination
            if (pagination) {
                const from = (pagination.page - 1) * pagination.pageSize
                const to = from + pagination.pageSize - 1
                query = query.range(from, to)
            }

            const { data, error: fetchError, count } = await query

            if (fetchError) throw fetchError

            const result = (data ?? []) as ContractWithRelations[]
            contracts.value = result
            return {
                data: result,
                totalCount: count ?? 0,
            }
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
        if (!organizationId.value) {
            console.warn('No organization_id available, skipping fetch')
            return null
        }

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
                        bedrooms, bathrooms, square_meters, description,
                        owner:owners(id, full_name, email, phone, address, cuit_cuil)
                    ),
                    tenants:contract_tenants(
                        contract_id, tenant_id, role, created_at,
                        tenant:tenants(id, first_name, last_name, email, phone, dni, cuit_cuil, address)
                    )
                `)
                .eq('id', id)
                .eq('organization_id', organizationId.value)
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
        if (!organizationId.value) {
            throw new Error('No organization_id available, cannot create contract')
        }

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
                organization_id: organizationId.value,
            }

            // 1. Insert contract
            const { data: contract, error: contractError } = await supabase
                .from('contracts')
                .insert([contractData])
                .select()
                .single()

            if (contractError) throw contractError
            if (!contract) throw new Error('No se pudo crear el contrato')

            // 2. Insert contract_tenants (titular) - no organization_id needed for junction table
            const tenantEntries: { contract_id: string; tenant_id: string; role: ContractTenantRole }[] = [
                {
                    contract_id: contract.id,
                    tenant_id: formData.titular_id,
                    role: 'titular',
                },
            ]

            // Add co-titulares
            for (const coTitularId of formData.co_titular_ids) {
                tenantEntries.push({
                    contract_id: contract.id,
                    tenant_id: coTitularId,
                    role: 'co_titular',
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
        if (!organizationId.value) {
            throw new Error('No organization_id available, cannot update contract')
        }

        loading.value = true
        error.value = null

        try {
            // Build update object
            const updates: Record<string, unknown> = {
                organization_id: organizationId.value,
            }

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

            // 2. Update tenants if changed - no organization_id needed for junction table
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
     * Cancel a contract and record the cancellation event
     * Returns the rescission PDF blob and fileName for download
     */
    async function cancelContract(params: CancelContractParams): Promise<{ blob: Blob; fileName: string }> {
        const { id, updatePropertyStatus, effectiveDate, reason, notes, penaltyAmount, customReason } = params

        loading.value = true
        error.value = null

        try {
            // Get the contract first to know the property_id
            const contract = contracts.value.find(c => c.id === id)
                ?? await fetchContractById(id)

            if (!contract) {
                throw new Error('No se pudo encontrar el contrato')
            }

            // 1. Generate and save rescission PDF before updating status
            const rescisionBlob = await generateRescisionPDF(
                contract,
                reason,
                customReason || '',
                effectiveDate
            )

            const titular = contract.tenants?.find(ct => ct.role === 'titular')?.tenant
            const titularName = titular
                ? `${titular.first_name}_${titular.last_name}`.replace(/[^a-zA-Z0-9]/g, '_')
                : 'Inquilino'
            const dateStr = effectiveDate.replace(/-/g, '')
            const fileName = `Rescision_${titularName}_${dateStr}.pdf`

            const savedDocument = await saveLegalDocument({
                contractId: id,
                organizationId: contract.organization_id,
                documentType: 'rescision',
                blob: rescisionBlob,
                fileName,
            })

            if (!savedDocument) {
                throw new Error('Error al guardar el documento de rescisión')
            }

            // 2. Update contract status and end_date to effective rescission date
            const { error: cancelError } = await supabase
                .from('contracts')
                .update({
                    status: 'rescindido' as ContractStatus,
                    end_date: effectiveDate,
                })
                .eq('id', id)

            if (cancelError) throw cancelError

            // 3. Insert contract_events record
            const { error: eventError } = await supabase
                .from('contract_events')
                .insert({
                    contract_id: id,
                    organization_id: organizationId.value,
                    event_type: 'cancelled',
                    event_date: new Date().toISOString().split('T')[0],
                    effective_date: effectiveDate,
                    notes: notes,
                    metadata: {
                        reason,
                        penalty_amount: penaltyAmount ?? 0,
                        ...(reason === 'otro' && customReason ? { custom_reason: customReason } : {}),
                    },
                })

            if (eventError) {
                console.warn('Failed to insert contract event:', eventError)
            }

            // 4. Optionally update property status to disponible
            if (updatePropertyStatus && contract?.property_id) {
                const { error: propertyError } = await supabase
                    .from('properties')
                    .update({ status: 'disponible' })
                    .eq('id', contract.property_id)

                if (propertyError) {
                    console.warn('Failed to update property status:', propertyError)
                }
            }

            // 5. Update the contract status and end_date in place in the reactive array
            const index = contracts.value.findIndex(c => c.id === id)
            if (index !== -1) {
                contracts.value[index] = {
                    ...contracts.value[index],
                    status: 'rescindido' as ContractStatus,
                    end_date: effectiveDate,
                }
            }

            return { blob: rescisionBlob, fileName }
        } catch (e) {
            // Check for Postgres check constraint violation (e.g., end_date < start_date)
            const pgError = e as { code?: string }
            if (pgError.code === '23514') {
                const dateError = new Error('La fecha de rescisión no puede ser anterior a la fecha de inicio del contrato.')
                error.value = dateError.message
                console.error('Error cancelling contract:', e)
                throw dateError
            }
            error.value = e instanceof Error ? e.message : 'Error al cancelar contrato'
            console.error('Error cancelling contract:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    /**
     * Extend (prórroga) a contract by updating its end date
     * Optionally updates the monthly rent amount
     */
    async function extendContract(params: {
        contractId: string
        organizationId: string
        newEndDate: string
        newMonthlyAmount?: number
        notes?: string
        contract: ContractWithRelations
    }): Promise<{ blob: Blob; fileName: string }> {
        const { contractId, organizationId, newEndDate, newMonthlyAmount, notes, contract } = params

        loading.value = true
        error.value = null

        try {
            // 1. Generate and save extension PDF before updating DB
            const extensionBlob = await generateExtensionPDF(
                contract,
                newEndDate,
                newMonthlyAmount,
                notes
            )

            const titular = contract.tenants?.find(ct => ct.role === 'titular')?.tenant
            const titularName = titular
                ? `${titular.first_name}_${titular.last_name}`.replace(/[^a-zA-Z0-9]/g, '_')
                : 'Inquilino'
            const dateStr = newEndDate.replace(/-/g, '')
            const fileName = `Prorroga_${titularName}_${dateStr}.pdf`

            const savedDocument = await saveLegalDocument({
                contractId,
                organizationId,
                documentType: 'prorroga',
                blob: extensionBlob,
                fileName,
            })

            if (!savedDocument) {
                throw new Error('Error al guardar el documento de prórroga')
            }

            // 2. Update contract end_date (and current_rent_amount if provided)
            const updates: Record<string, unknown> = {
                end_date: newEndDate,
            }
            if (newMonthlyAmount !== undefined && newMonthlyAmount > 0) {
                updates.current_rent_amount = newMonthlyAmount
            }

            const { error: updateError } = await supabase
                .from('contracts')
                .update(updates)
                .eq('id', contractId)

            if (updateError) throw updateError

            // 3. Insert contract_events record
            const metadata: Record<string, unknown> = {
                old_end_date: contract.end_date,
                new_end_date: newEndDate,
            }
            if (newMonthlyAmount !== undefined && newMonthlyAmount > 0) {
                metadata.new_monthly_amount = newMonthlyAmount
            }
            if (notes) {
                metadata.notes = notes
            }

            const { error: eventError } = await supabase
                .from('contract_events')
                .insert({
                    contract_id: contractId,
                    organization_id: organizationId,
                    event_type: 'extended',
                    event_date: new Date().toISOString().split('T')[0],
                    effective_date: newEndDate,
                    notes: notes || null,
                    metadata,
                })

            if (eventError) throw eventError

            // 4. Update the contract reactively in the local contracts array
            const index = contracts.value.findIndex(c => c.id === contractId)
            if (index !== -1) {
                contracts.value[index] = {
                    ...contracts.value[index],
                    end_date: newEndDate,
                    ...(newMonthlyAmount !== undefined && newMonthlyAmount > 0
                        ? { current_rent_amount: newMonthlyAmount }
                        : {}),
                }
            }

            return { blob: extensionBlob, fileName }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al prorrogar contrato'
            console.error('Error extending contract:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    /**
     * Renew a contract by updating it with new dates and amount
     * Saves the previous PDF as historical record
     */
    async function renewContract(params: {
        originalContractId: string
        organizationId: string
        newStartDate: string
        newEndDate: string
        newMonthlyAmount: number
        notes?: string
        originalContract: ContractWithRelations
    }): Promise<{ blob: Blob; fileName: string }> {
        const {
            originalContractId,
            organizationId,
            newStartDate,
            newEndDate,
            newMonthlyAmount,
            notes,
            originalContract,
        } = params

        loading.value = true
        error.value = null

        try {
            // 1. UPDATE existing contract with new dates and amount
            const { error: updateError } = await supabase
                .from('contracts')
                .update({
                    start_date: newStartDate,
                    end_date: newEndDate,
                    current_rent_amount: newMonthlyAmount,
                    base_rent_amount: newMonthlyAmount,
                })
                .eq('id', originalContractId)

            if (updateError) throw updateError

            // 2. INSERT contract_events with renewal metadata
            const { error: eventError } = await supabase
                .from('contract_events')
                .insert({
                    contract_id: originalContractId,
                    organization_id: organizationId,
                    event_type: 'renewed',
                    event_date: new Date().toISOString().split('T')[0],
                    effective_date: newStartDate,
                    notes: notes || null,
                    metadata: {
                        old_start_date: originalContract.start_date,
                        old_end_date: originalContract.end_date,
                        old_amount: originalContract.current_rent_amount,
                        new_start_date: newStartDate,
                        new_end_date: newEndDate,
                        new_amount: newMonthlyAmount,
                        ...(notes ? { notes } : {}),
                    },
                })

            if (eventError) {
                console.warn('Failed to insert renewal event:', eventError)
            }

            // 3. Generate PDF for the updated contract and save as legal document
            const updatedContract = await fetchContractById(originalContractId)
            if (!updatedContract) {
                throw new Error('No se pudo obtener el contrato actualizado')
            }

            const pdfBlob = await generatePDF(updatedContract)

            const titular = updatedContract.tenants?.find(ct => ct.role === 'titular')?.tenant
            const titularName = titular
                ? `${titular.first_name}_${titular.last_name}`.replace(/[^a-zA-Z0-9]/g, '_')
                : 'Inquilino'
            const dateStr = newStartDate.replace(/-/g, '')
            const fileName = `Renovacion_${titularName}_${dateStr}.pdf`

            const savedDocument = await saveLegalDocument({
                contractId: originalContractId,
                organizationId,
                documentType: 'renovacion',
                blob: pdfBlob,
                fileName,
            })

            if (!savedDocument) {
                throw new Error('Error al guardar el documento de renovación')
            }

            // 4. Update local state with new values
            const index = contracts.value.findIndex(c => c.id === originalContractId)
            if (index !== -1) {
                contracts.value[index] = {
                    ...contracts.value[index],
                    start_date: newStartDate,
                    end_date: newEndDate,
                    current_rent_amount: newMonthlyAmount,
                    base_rent_amount: newMonthlyAmount,
                }
            }

            return { blob: pdfBlob, fileName }
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al renovar contrato'
            console.error('Error renewing contract:', e)
            throw e
        } finally {
            loading.value = false
        }
    }

    /**
     * Expire overdue contracts by calling the database RPC function
     * Returns the count of updated contracts
     */
    async function expireOverdueContracts(): Promise<number> {
        loading.value = true
        error.value = null

        try {
            const { data, error: rpcError } = await supabase
                .rpc('expire_overdue_contracts')

            if (rpcError) throw rpcError

            return data ?? 0
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Error al expirar contratos vencidos'
            console.error('Error expiring overdue contracts:', e)
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
        extendContract,
        renewContract,
        expireOverdueContracts,
        calculateDisplayStatus,
        calculateEndDate,
        calculateNextAdjustmentDate,
        getTitular,
        getCoTitulares,
        formatPropertyAddress,
    }
}
