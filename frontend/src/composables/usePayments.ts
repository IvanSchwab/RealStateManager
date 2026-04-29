import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  Payment,
  PaymentWithDetails,
  PaymentStatus,
  PaymentMethod,
  Contract,
} from '@/types'
import { useAuth } from './useAuth'
import { useDate } from './useDate'
import { useFormatCurrency } from './useFormatCurrency'
import { normalize } from '@/utils/normalize'

export interface PaymentFilters {
  search?: string
  status?: PaymentStatus | 'all'
  contractId?: string
  propertyId?: string
  month?: number
  year?: number
}

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface FetchPaymentsResult {
  data: PaymentWithDetails[]
  totalCount: number
}

export interface RegisterPaymentData {
  paid_date: string
  paid_amount: number
  payment_method: PaymentMethod
  notes?: string
}

export interface RecurringConcept {
  concept_name: string
  amount: number
}

export function usePayments() {
  const payments = ref<PaymentWithDetails[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { organizationId } = useAuth()
  const { formatCurrency } = useFormatCurrency()
  const { dateLocale } = useDate()

  /**
   * Format date using organization's date format preference
   */
  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString(dateLocale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  /**
   * Get month name in Spanish
   */
  function getMonthName(month: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ]
    return months[month - 1] || ''
  }

  /**
   * Get period label (e.g., "Febrero 2026")
   */
  function getPeriodLabel(payment: Payment): string {
    return `${getMonthName(payment.period_month)} ${payment.period_year}`
  }

  /**
   * Calculate payment due date for a given month/year and due_day setting
   */
  function calculateDueDate(year: number, month: number, dueDay: number): string {
    // Get last day of the month
    const lastDay = new Date(year, month, 0).getDate()

    // 0 or null means last day of month
    const day = dueDay === 0 || dueDay > lastDay ? lastDay : dueDay

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  /**
   * Fetch all payments with filters and server-side pagination
   * Search filter is now handled server-side
   */
  async function fetchPayments(
    filters?: PaymentFilters,
    pagination?: PaginationParams
  ): Promise<FetchPaymentsResult | null> {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetch')
      return null
    }

    loading.value = true
    error.value = null

    try {
      // For search filter, we need to find matching payment IDs first
      // because we search across multiple related tables
      let paymentIdsFromSearch: string[] | null = null

      if (filters?.search) {
        const tokens = normalize(filters.search).split(/\s+/).filter(Boolean)

        // Pre-filter by ASCII-safe fields only (reference_number, property address)
        // Tenant name matching is handled client-side to support accented names
        let referenceQuery = supabase
          .from('payments')
          .select('id')
          .eq('organization_id', organizationId.value)
        for (const token of tokens) {
          referenceQuery = referenceQuery.ilike('reference_number', `%${token}%`)
        }

        let propertyContractsQuery = supabase
          .from('contracts')
          .select('id, property:properties!inner(address_street, address_number)')
          .eq('organization_id', organizationId.value)
          .is('deleted_at', null)
        for (const token of tokens) {
          const term = `%${token}%`
          propertyContractsQuery = propertyContractsQuery.or(
            `address_street.ilike.${term},address_number.ilike.${term}`,
            { referencedTable: 'properties' }
          )
        }

        const [referenceResult, propertyContractsResult] = await Promise.all([
          referenceQuery,
          propertyContractsQuery,
        ])

        const propertyContractIds = [...new Set(propertyContractsResult.data?.map(c => c.id) ?? [])]

        let contractPaymentIds: string[] = []
        if (propertyContractIds.length > 0) {
          const { data: contractPayments } = await supabase
            .from('payments')
            .select('id')
            .eq('organization_id', organizationId.value)
            .in('contract_id', propertyContractIds)
          contractPaymentIds = contractPayments?.map(p => p.id) ?? []
        }

        const referencePaymentIds = referenceResult.data?.map(p => p.id) ?? []
        const asciiMatchedIds = [...new Set([...referencePaymentIds, ...contractPaymentIds])]

        // Only narrow the main query when ASCII pre-filters found matches.
        // If empty, paymentIdsFromSearch stays null so all payments are fetched
        // and the client-side filter handles tenant name matching.
        if (asciiMatchedIds.length > 0) {
          paymentIdsFromSearch = asciiMatchedIds
        }
      }

      let query = supabase
        .from('payments')
        .select(`
          *,
          contract:contracts!inner(
            *,
            property:properties(
              id, name, property_type,
              address_street, address_number, address_floor, address_apartment,
              address_city, address_state, status,
              owner:owners(id, full_name, email, phone, cuit_cuil)
            ),
            tenants:contract_tenants(
              contract_id, tenant_id, role,
              tenant:tenants(id, first_name, last_name, email, phone, dni)
            )
          ),
          concepts:payment_concepts(*)
        `, { count: 'exact' })
        .eq('organization_id', organizationId.value)
        .is('contract.deleted_at', null)
        .order('due_date', { ascending: false })

      // Apply search filter using payment IDs
      if (paymentIdsFromSearch !== null) {
        query = query.in('id', paymentIdsFromSearch)
      }

      // Filter by contract ID (server-side)
      if (filters?.contractId) {
        query = query.eq('contract_id', filters.contractId)
      }

      // Filter by status (server-side)
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // Filter by month/year (server-side)
      if (filters?.month) {
        query = query.eq('period_month', filters.month)
      }
      if (filters?.year) {
        query = query.eq('period_year', filters.year)
      }

      // Filter by property ID (via contract, server-side)
      if (filters?.propertyId) {
        query = query.eq('contract.property_id', filters.propertyId)
      }

      // Apply server-side pagination
      if (pagination) {
        const from = (pagination.page - 1) * pagination.pageSize
        const to = from + pagination.pageSize - 1
        query = query.range(from, to)
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      // Transform tenant data structure
      let result = (data ?? []).map(payment => ({
        ...payment,
        contract: {
          ...payment.contract,
          tenants: payment.contract.tenants?.map((ct: { tenant: unknown }) => ({
            ...ct,
            tenant: ct.tenant,
          })),
        },
      })) as PaymentWithDetails[]

      // Client-side accent-insensitive secondary filter
      if (filters?.search) {
        const tokens = normalize(filters.search).split(/\s+/).filter(Boolean)
        result = result.filter(payment =>
          tokens.every(token =>
            normalize(payment.reference_number ?? '').includes(token) ||
            normalize(payment.contract?.property?.address_street ?? '').includes(token) ||
            normalize(payment.contract?.property?.address_number ?? '').includes(token) ||
            (payment.contract?.tenants ?? []).some(ct =>
              normalize(ct.tenant?.first_name ?? '').includes(token) ||
              normalize(ct.tenant?.last_name ?? '').includes(token)
            )
          )
        )
      }

      payments.value = result
      return {
        data: result,
        totalCount: count ?? 0,
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar pagos'
      console.error('Error fetching payments:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single payment by ID
   */
  async function fetchPaymentById(id: string): Promise<PaymentWithDetails | null> {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetch')
      return null
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          contract:contracts(
            *,
            property:properties(
              id, name, property_type,
              address_street, address_number, address_floor, address_apartment,
              address_city, address_state, status,
              owner:owners(id, full_name, email, phone, cuit_cuil, address)
            ),
            tenants:contract_tenants(
              contract_id, tenant_id, role,
              tenant:tenants(id, first_name, last_name, email, phone, dni, cuit_cuil, address)
            )
          ),
          concepts:payment_concepts(*)
        `)
        .eq('id', id)
        .eq('organization_id', organizationId.value)
        .single()

      if (fetchError) throw fetchError

      // Transform tenant data
      const payment = {
        ...data,
        contract: {
          ...data.contract,
          tenants: data.contract.tenants?.map((ct: { tenant: unknown }) => ({
            ...ct,
            tenant: ct.tenant,
          })),
        },
      } as PaymentWithDetails

      return payment
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar pago'
      console.error('Error fetching payment:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Generate all payments for a contract
   */
  async function generatePaymentsForContract(
    contractId: string,
    recurringConcepts?: RecurringConcept[]
  ): Promise<Payment[] | null> {
    if (!organizationId.value) {
      throw new Error('No organization_id available, cannot generate payments')
    }

    loading.value = true
    error.value = null

    try {
      // Fetch contract details
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .eq('organization_id', organizationId.value)
        .single()

      if (contractError) throw contractError
      if (!contract) throw new Error('Contrato no encontrado')

      const startDate = new Date(contract.start_date)
      const endDate = new Date(contract.end_date)
      const paymentsToCreate: Partial<Payment & { organization_id: string }>[] = []

      // Calculate concepts total for initial total_amount
      const conceptsTotal = recurringConcepts?.reduce((sum, c) => sum + c.amount, 0) || 0

      // Generate monthly payments
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const month = currentDate.getMonth() + 1
        const year = currentDate.getFullYear()
        const dueDate = calculateDueDate(year, month, contract.payment_due_day || 0)

        paymentsToCreate.push({
          contract_id: contractId,
          period_month: month,
          period_year: year,
          due_date: dueDate,
          rent_amount: contract.current_rent_amount,
          total_amount: contract.current_rent_amount + conceptsTotal,
          expected_amount: contract.current_rent_amount + conceptsTotal,
          status: 'pendiente',
          organization_id: organizationId.value,
        })

        // Move to next month
        currentDate.setMonth(currentDate.getMonth() + 1)
      }

      // Insert payments
      const { data: createdPayments, error: insertError } = await supabase
        .from('payments')
        .insert(paymentsToCreate)
        .select()

      if (insertError) throw insertError
      if (!createdPayments) throw new Error('No se pudieron crear los pagos')

      // Add recurring concepts if provided - no organization_id needed for payment_concepts
      if (recurringConcepts && recurringConcepts.length > 0) {
        const conceptsToCreate = createdPayments.flatMap(payment =>
          recurringConcepts.map(concept => ({
            payment_id: payment.id,
            concept_name: concept.concept_name,
            amount: concept.amount,
            is_recurring: true,
          }))
        )

        const { error: conceptsError } = await supabase
          .from('payment_concepts')
          .insert(conceptsToCreate)

        if (conceptsError) {
          console.warn('Error adding recurring concepts:', conceptsError)
        }
      }

      return createdPayments as Payment[]
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al generar pagos'
      console.error('Error generating payments:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Register a payment (mark as paid)
   * Requires exact amount match (no partial payments allowed per user preference)
   */
  async function registerPayment(
    paymentId: string,
    paymentData: RegisterPaymentData
  ): Promise<Payment | null> {
    loading.value = true
    error.value = null

    try {
      // Fetch current payment to validate amount
      const { data: currentPayment, error: fetchError } = await supabase
        .from('payments')
        .select('total_amount, expected_amount')
        .eq('id', paymentId)
        .single()

      if (fetchError) throw fetchError
      if (!currentPayment) throw new Error('Pago no encontrado')

      const expectedTotal = currentPayment.total_amount || currentPayment.expected_amount

      // Validate exact amount match
      if (paymentData.paid_amount !== expectedTotal) {
        throw new Error(
          `El monto pagado (${formatCurrency(paymentData.paid_amount)}) debe ser igual al total (${formatCurrency(expectedTotal)})`
        )
      }

      // Generate receipt number
      const receiptNumber = await generateReceiptNumber(new Date(paymentData.paid_date))

      // Update payment
      const { data: payment, error: updateError } = await supabase
        .from('payments')
        .update({
          payment_date: paymentData.paid_date,
          actual_amount: paymentData.paid_amount,
          payment_method: paymentData.payment_method,
          reference_number: receiptNumber,
          notes: paymentData.notes || null,
          status: 'pagado',
        })
        .eq('id', paymentId)
        .select()
        .single()

      if (updateError) throw updateError

      // Update local state
      const index = payments.value.findIndex(p => p.id === paymentId)
      if (index !== -1) {
        payments.value[index] = {
          ...payments.value[index],
          ...payment,
        }
      }

      return payment as Payment
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al registrar pago'
      console.error('Error registering payment:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Generate next receipt number (format: REC-YYYYMM-XXXX)
   */
  async function generateReceiptNumber(date: Date = new Date()): Promise<string> {
    if (!organizationId.value) {
      throw new Error('No organization_id available')
    }

    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
    const prefix = `REC-${yearMonth}-`

    // Get the highest existing receipt number for this month within the organization
    const { data, error: queryError } = await supabase
      .from('payments')
      .select('reference_number')
      .eq('organization_id', organizationId.value)
      .like('reference_number', `${prefix}%`)
      .order('reference_number', { ascending: false })
      .limit(1)

    if (queryError) {
      console.warn('Error querying receipt numbers:', queryError)
    }

    let nextSeq = 1
    if (data && data.length > 0 && data[0].reference_number) {
      const lastNumber = data[0].reference_number
      const lastSeq = parseInt(lastNumber.substring(prefix.length), 10)
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`
  }

  /**
   * Update overdue payments status
   */
  async function updateOverduePayments(): Promise<number> {
    if (!organizationId.value) {
      return 0
    }

    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error: updateError } = await supabase
        .from('payments')
        .update({ status: 'vencido' })
        .eq('organization_id', organizationId.value)
        .eq('status', 'pendiente')
        .lt('due_date', today)
        .select('id')

      if (updateError) throw updateError

      const updatedCount = data?.length || 0

      // Update local state
      if (updatedCount > 0) {
        const updatedIds = new Set(data?.map(p => p.id))
        payments.value = payments.value.map(p => {
          if (updatedIds.has(p.id)) {
            return { ...p, status: 'vencido' as PaymentStatus }
          }
          return p
        })
      }

      return updatedCount
    } catch (e) {
      console.error('Error updating overdue payments:', e)
      return 0
    }
  }

  /**
   * Apply rent adjustment to future payments
   */
  async function applyRentAdjustment(
    contractId: string,
    newAmount: number,
    effectiveDate: string,
    percentage?: number,
    notes?: string
  ): Promise<boolean> {
    if (!organizationId.value) {
      throw new Error('No organization_id available')
    }

    loading.value = true
    error.value = null

    try {
      // Get current contract
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('current_rent_amount, adjustment_type')
        .eq('id', contractId)
        .eq('organization_id', organizationId.value)
        .single()

      if (contractError) throw contractError
      if (!contract) throw new Error('Contrato no encontrado')

      // Create adjustment history record
      const { error: historyError } = await supabase
        .from('adjustment_history')
        .insert({
          contract_id: contractId,
          adjustment_date: effectiveDate,
          effective_from_period: effectiveDate.substring(0, 7), // YYYY-MM
          adjustment_type: contract.adjustment_type || 'manual',
          previous_amount: contract.current_rent_amount,
          new_amount: newAmount,
          index_value_used: percentage ? 1 + percentage / 100 : null,
          source: 'manual',
          notes,
          organization_id: organizationId.value,
        })

      if (historyError) throw historyError

      // Update contract monthly rent
      const { error: updateContractError } = await supabase
        .from('contracts')
        .update({
          current_rent_amount: newAmount,
          last_adjustment_date: effectiveDate,
        })
        .eq('id', contractId)

      if (updateContractError) throw updateContractError

      // Update future payments
      const { data: futurePayments, error: futureError } = await supabase
        .from('payments')
        .select('id, rent_amount, concepts:payment_concepts(amount)')
        .eq('contract_id', contractId)
        .eq('status', 'pendiente')
        .gte('due_date', effectiveDate)

      if (futureError) throw futureError

      if (futurePayments) {
        for (const payment of futurePayments) {
          const conceptsTotal = payment.concepts?.reduce(
            (sum: number, c: { amount: number }) => sum + c.amount,
            0
          ) || 0

          await supabase
            .from('payments')
            .update({
              rent_amount: newAmount,
              total_amount: newAmount + conceptsTotal,
              expected_amount: newAmount + conceptsTotal,
            })
            .eq('id', payment.id)
        }
      }

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al aplicar ajuste'
      console.error('Error applying rent adjustment:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Get payments summary for a contract
   */
  async function getPaymentsSummary(contractId: string): Promise<{
    total: number
    paid: number
    pending: number
    overdue: number
    totalAmount: number
    paidAmount: number
  }> {
    if (!organizationId.value) {
      return {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        totalAmount: 0,
        paidAmount: 0,
      }
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select('status, total_amount, actual_amount')
        .eq('contract_id', contractId)
        .eq('organization_id', organizationId.value)

      if (fetchError) throw fetchError

      const payments = data || []

      return {
        total: payments.length,
        paid: payments.filter(p => p.status === 'pagado').length,
        pending: payments.filter(p => p.status === 'pendiente').length,
        overdue: payments.filter(p => p.status === 'vencido').length,
        totalAmount: payments.reduce((sum, p) => sum + (p.total_amount || 0), 0),
        paidAmount: payments.reduce((sum, p) => sum + (p.actual_amount || 0), 0),
      }
    } catch (e) {
      console.error('Error getting payments summary:', e)
      return {
        total: 0,
        paid: 0,
        pending: 0,
        overdue: 0,
        totalAmount: 0,
        paidAmount: 0,
      }
    }
  }

  /**
   * Get monthly summary for a specific month/year
   */
  function getMonthSummary(paymentsData: PaymentWithDetails[], month: number, year: number): {
    totalToCollect: number
    collected: number
    pending: number
    overdue: number
    paidCount: number
    pendingCount: number
    overdueCount: number
    totalCount: number
  } {
    const monthPayments = paymentsData.filter(
      p => p.period_month === month && p.period_year === year
    )

    const paid = monthPayments.filter(p => p.status === 'pagado')
    const pendingPayments = monthPayments.filter(p => p.status === 'pendiente')
    const overduePayments = monthPayments.filter(p => p.status === 'vencido')

    return {
      totalToCollect: monthPayments.reduce((sum, p) => sum + (p.total_amount || p.expected_amount || 0), 0),
      collected: paid.reduce((sum, p) => sum + (p.actual_amount || 0), 0),
      pending: pendingPayments.reduce((sum, p) => sum + (p.total_amount || p.expected_amount || 0), 0),
      overdue: overduePayments.reduce((sum, p) => sum + (p.total_amount || p.expected_amount || 0), 0),
      paidCount: paid.length,
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      totalCount: monthPayments.length,
    }
  }

  /**
   * Get payment history for a contract (all payments ordered by period)
   */
  async function getPaymentHistory(contractId: string): Promise<PaymentWithDetails[]> {
    if (!organizationId.value) {
      return []
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          contract:contracts(
            *,
            property:properties(
              id, name, property_type,
              address_street, address_number, address_floor, address_apartment,
              address_city, address_state, status,
              owner:owners(id, full_name, email, phone, cuit_cuil)
            ),
            tenants:contract_tenants(
              contract_id, tenant_id, role,
              tenant:tenants(id, first_name, last_name, email, phone, dni)
            )
          ),
          concepts:payment_concepts(*)
        `)
        .eq('contract_id', contractId)
        .eq('organization_id', organizationId.value)
        .order('period_year', { ascending: true })
        .order('period_month', { ascending: true })

      if (fetchError) throw fetchError

      // Transform tenant data
      return (data ?? []).map(payment => ({
        ...payment,
        contract: {
          ...payment.contract,
          tenants: payment.contract.tenants?.map((ct: { tenant: unknown }) => ({
            ...ct,
            tenant: ct.tenant,
          })),
        },
      })) as PaymentWithDetails[]
    } catch (e) {
      console.error('Error fetching payment history:', e)
      return []
    }
  }

  /**
   * Calculate days overdue for a payment
   */
  function getDaysOverdue(payment: Payment): number {
    if (payment.status !== 'vencido') return 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dueDate = new Date(payment.due_date)
    dueDate.setHours(0, 0, 0, 0)

    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays > 0 ? diffDays : 0
  }

  /**
   * Check if a payment is overdue
   */
  function isOverdue(payment: Payment): boolean {
    return payment.status === 'vencido'
  }

  /**
   * Get contract progress (current month vs total months)
   */
  function getContractProgress(payment: PaymentWithDetails): { current: number; total: number } {
    if (!payment.contract) return { current: 0, total: 0 }

    const startDate = new Date(payment.contract.start_date)
    const endDate = new Date(payment.contract.end_date)
    const paymentDate = new Date(payment.due_date)

    const totalMonths = monthsBetween(startDate, endDate) + 1
    const currentMonth = monthsBetween(startDate, paymentDate) + 1

    return { current: currentMonth, total: totalMonths }
  }

  /**
   * Calculate months between two dates
   */
  function monthsBetween(date1: Date, date2: Date): number {
    const months = (date2.getFullYear() - date1.getFullYear()) * 12
    return months + date2.getMonth() - date1.getMonth()
  }

  /**
   * Fetch multiple payments by IDs
   */
  async function fetchPaymentsByIds(ids: string[]): Promise<PaymentWithDetails[]> {
    if (ids.length === 0 || !organizationId.value) return []

    try {
      const { data, error: fetchError } = await supabase
        .from('payments')
        .select(`
          *,
          contract:contracts(
            *,
            property:properties(
              id, name, property_type,
              address_street, address_number, address_floor, address_apartment,
              address_city, address_state, status,
              owner:owners(id, full_name, email, phone, cuit_cuil, address)
            ),
            tenants:contract_tenants(
              contract_id, tenant_id, role,
              tenant:tenants(id, first_name, last_name, email, phone, dni, cuit_cuil, address)
            )
          ),
          concepts:payment_concepts(*)
        `)
        .eq('organization_id', organizationId.value)
        .in('id', ids)

      if (fetchError) throw fetchError

      // Transform tenant data
      return (data ?? []).map(payment => ({
        ...payment,
        contract: {
          ...payment.contract,
          tenants: payment.contract.tenants?.map((ct: { tenant: unknown }) => ({
            ...ct,
            tenant: ct.tenant,
          })),
        },
      })) as PaymentWithDetails[]
    } catch (e) {
      console.error('Error fetching payments by IDs:', e)
      return []
    }
  }

  /**
   * Check if a contract needs rent adjustment
   */
  function needsAdjustment(contract: Contract): boolean {
    if (!contract.next_adjustment_date || contract.adjustment_type === 'ninguno') {
      return false
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const nextAdjustment = new Date(contract.next_adjustment_date)
    nextAdjustment.setHours(0, 0, 0, 0)

    return nextAdjustment <= today
  }

  /**
   * Get the titular tenant from payment contract
   */
  function getTitular(payment: PaymentWithDetails) {
    return payment.contract?.tenants?.find(ct => ct.role === 'titular')?.tenant ?? null
  }

  /**
   * Format property address from payment
   */
  function formatPropertyAddress(payment: PaymentWithDetails): string {
    const p = payment.contract?.property
    if (!p) return 'Sin dirección'

    let address = p.address_street
    if (p.address_number) address += ` ${p.address_number}`
    if (p.address_floor) address += `, Piso ${p.address_floor}`
    if (p.address_apartment) address += `, Depto ${p.address_apartment}`
    return address
  }

  /**
   * Get status badge variant for UI
   */
  function getStatusBadgeVariant(status: PaymentStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'pagado':
        return 'default' // green via class override
      case 'pendiente':
        return 'secondary' // blue via class override
      case 'vencido':
        return 'destructive' // red
      case 'pago_parcial':
        return 'outline' // yellow via class override
      default:
        return 'secondary'
    }
  }

  /**
   * Get status label in Spanish
   */
  function getStatusLabel(status: PaymentStatus): string {
    const labels: Record<PaymentStatus, string> = {
      pendiente: 'Pendiente',
      pagado: 'Pagado',
      vencido: 'Vencido',
      pago_parcial: 'Pago Parcial',
    }
    return labels[status] || status
  }

  /**
   * Get payment method label in Spanish
   */
  function getPaymentMethodLabel(method: PaymentMethod | null): string {
    if (!method) return '-'
    const labels: Record<PaymentMethod, string> = {
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
      cheque: 'Cheque',
      tarjeta: 'Tarjeta',
      deposito: 'Depósito',
    }
    return labels[method] || method
  }

  return {
    payments,
    loading,
    error,
    // CRUD operations
    fetchPayments,
    fetchPaymentById,
    fetchPaymentsByIds,
    generatePaymentsForContract,
    registerPayment,
    updateOverduePayments,
    applyRentAdjustment,
    getPaymentsSummary,
    getPaymentHistory,
    generateReceiptNumber,
    // Summary helpers
    getMonthSummary,
    // Utilities
    formatCurrency,
    formatDate,
    getMonthName,
    getPeriodLabel,
    calculateDueDate,
    needsAdjustment,
    getTitular,
    formatPropertyAddress,
    getStatusBadgeVariant,
    getStatusLabel,
    getPaymentMethodLabel,
    getDaysOverdue,
    isOverdue,
    getContractProgress,
  }
}
