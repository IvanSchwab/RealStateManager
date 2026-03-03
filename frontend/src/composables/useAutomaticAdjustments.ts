import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useInflationData } from './useInflationData'
import type {
  Contract,
  AdjustmentHistory,
  AdjustmentCalculation,
  Property,
} from '@/types'

/**
 * Contract with property relation for adjustment processing
 */
interface ContractWithProperty extends Contract {
  property: Property
}

/**
 * Adjustment counts for dashboard display
 */
export interface AdjustmentCounts {
  applied: number
  estimated: number
  pending: number
}

/**
 * Composable for automatic rent adjustment processing
 *
 * Handles:
 * - Detecting contracts that need adjustment
 * - Calculating new rent based on IPC/ICL inflation
 * - Applying adjustments to contracts and payments
 * - Managing estimated vs official adjustments
 * - Correcting estimated adjustments with official data
 */
export function useAutomaticAdjustments() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pendingAdjustments = ref<AdjustmentCalculation[]>([])
  const estimatedAdjustments = ref<AdjustmentHistory[]>([])

  const { getInflationForPeriod, formatYearMonth } = useInflationData()

  /**
   * Format currency in Argentine style
   */
  function formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '$0'
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  /**
   * Format date in DD/MM/YYYY format
   */
  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  /**
   * Get full property address string
   */
  function getPropertyAddress(property: Property | undefined): string {
    if (!property) return 'Propiedad desconocida'
    const parts = [
      property.address_street,
      property.address_number,
      property.address_floor ? `Piso ${property.address_floor}` : null,
      property.address_apartment ? `Depto ${property.address_apartment}` : null,
    ].filter(Boolean)
    return parts.join(' ')
  }

  /**
   * Calculate next adjustment date based on frequency
   */
  function calculateNextAdjustmentDate(
    currentDate: Date,
    frequency: 'trimestral' | 'semestral' | 'anual'
  ): string {
    const next = new Date(currentDate)

    switch (frequency) {
      case 'trimestral':
        next.setMonth(next.getMonth() + 3)
        break
      case 'semestral':
        next.setMonth(next.getMonth() + 6)
        break
      case 'anual':
        next.setFullYear(next.getFullYear() + 1)
        break
    }

    return next.toISOString().split('T')[0]
  }

  /**
   * Detect contracts that need adjustment
   * Checks for active contracts where next_adjustment_date <= today
   */
  async function detectPendingAdjustments(): Promise<ContractWithProperty[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data: contracts, error: fetchError } = await supabase
      .from('contracts')
      .select(`
        *,
        property:properties(*)
      `)
      .eq('status', 'activo')
      .in('adjustment_type', ['IPC', 'ICL'])
      .lte('next_adjustment_date', today)
      .is('deleted_at', null)

    if (fetchError) {
      console.error('Error fetching contracts for adjustment:', fetchError)
      return []
    }

    return (contracts || []) as ContractWithProperty[]
  }

  /**
   * Calculate adjusted rent for a single contract
   */
  async function calculateAdjustedRent(
    contract: ContractWithProperty
  ): Promise<AdjustmentCalculation> {
    // Determine the period to calculate inflation for
    const startDate = contract.last_adjustment_date
      ? new Date(contract.last_adjustment_date)
      : new Date(contract.start_date)

    const endDate = new Date()
    const indexType = contract.adjustment_type as 'IPC' | 'ICL'

    // Get inflation data for the period
    const inflationData = await getInflationForPeriod(startDate, endDate, indexType)

    // Calculate new rent amount
    const newRent = Math.round(contract.current_rent_amount * (1 + inflationData.accumulated / 100))

    return {
      contractId: contract.id,
      propertyAddress: getPropertyAddress(contract.property),
      previousAmount: contract.current_rent_amount,
      newAmount: newRent,
      percentage: inflationData.accumulated,
      isEstimated: inflationData.isEstimated,
      inflationPeriod: inflationData.periodLabel,
      indexUsed: indexType,
    }
  }

  /**
   * Apply a single adjustment to a contract
   * Updates contract, future payments, and records in adjustment_history
   */
  async function applyAdjustment(
    calculation: AdjustmentCalculation,
    contract: ContractWithProperty
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const effectivePeriod = formatYearMonth(new Date())

    // Calculate next adjustment date
    const nextDate = calculateNextAdjustmentDate(
      new Date(),
      contract.adjustment_period as 'trimestral' | 'semestral' | 'anual'
    )

    // 1. Update contract with new rent amount
    const { error: contractError } = await supabase
      .from('contracts')
      .update({
        current_rent_amount: calculation.newAmount,
        last_adjustment_date: today,
        next_adjustment_date: nextDate,
      })
      .eq('id', calculation.contractId)

    if (contractError) {
      throw new Error(`Error actualizando contrato: ${contractError.message}`)
    }

    // 2. Update future pending payments with new rent amount
    // Only payments with due_date >= today and status != 'pagado'
    const { error: paymentsError } = await supabase
      .from('payments')
      .update({
        rent_amount: calculation.newAmount,
        expected_amount: calculation.newAmount,
      })
      .eq('contract_id', calculation.contractId)
      .gte('due_date', today)
      .neq('status', 'pagado')

    if (paymentsError) {
      console.warn('Error updating payments (non-critical):', paymentsError)
    }

    // 3. Record in adjustment_history
    const { error: historyError } = await supabase
      .from('adjustment_history')
      .insert({
        contract_id: calculation.contractId,
        executed_at: new Date().toISOString(),
        effective_from_period: effectivePeriod,
        adjustment_type: calculation.indexUsed,
        index_value_used: calculation.percentage,
        previous_amount: calculation.previousAmount,
        new_amount: calculation.newAmount,
        source: 'automatico',
        is_estimated: calculation.isEstimated,
        inflation_period: calculation.inflationPeriod,
        notes: calculation.isEstimated
          ? 'Ajuste con datos estimados - pendiente de corrección'
          : null,
      })

    if (historyError) {
      throw new Error(`Error registrando historial: ${historyError.message}`)
    }
  }

  /**
   * Process all pending automatic adjustments
   * Returns array of successfully applied adjustments
   */
  async function processAutomaticAdjustments(): Promise<AdjustmentCalculation[]> {
    loading.value = true
    error.value = null
    const results: AdjustmentCalculation[] = []

    try {
      const contracts = await detectPendingAdjustments()

      for (const contract of contracts) {
        try {
          const calculation = await calculateAdjustedRent(contract)
          await applyAdjustment(calculation, contract)
          results.push(calculation)
        } catch (err) {
          console.error(`Error processing contract ${contract.id}:`, err)
          // Continue with other contracts
        }
      }

      pendingAdjustments.value = []
      return results
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error procesando ajustes'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get adjustment counts for dashboard display
   */
  async function getAdjustmentCounts(): Promise<AdjustmentCounts> {
    const today = new Date()
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const firstOfMonthStr = firstOfMonth.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    // Count applied adjustments this month
    const { count: appliedCount } = await supabase
      .from('adjustment_history')
      .select('*', { count: 'exact', head: true })
      .gte('executed_at', firstOfMonthStr)
      .eq('source', 'automatico')

    // Count estimated adjustments pending correction
    const { count: estimatedCount } = await supabase
      .from('adjustment_history')
      .select('*', { count: 'exact', head: true })
      .eq('is_estimated', true)
      .is('corrected_by_id', null)

    // Count contracts pending adjustment
    const { count: pendingCount } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'activo')
      .in('adjustment_type', ['IPC', 'ICL'])
      .lte('next_adjustment_date', todayStr)
      .is('deleted_at', null)

    return {
      applied: appliedCount || 0,
      estimated: estimatedCount || 0,
      pending: pendingCount || 0,
    }
  }

  /**
   * Get estimated adjustments that can be corrected with official data
   */
  async function getEstimatedAdjustments(): Promise<AdjustmentHistory[]> {
    const { data, error: fetchError } = await supabase
      .from('adjustment_history')
      .select(`
        *,
        contract:contracts(
          *,
          property:properties(*)
        )
      `)
      .eq('is_estimated', true)
      .is('corrected_by_id', null)
      .order('executed_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching estimated adjustments:', fetchError)
      return []
    }

    estimatedAdjustments.value = (data || []) as AdjustmentHistory[]
    return estimatedAdjustments.value
  }

  /**
   * Correct an estimated adjustment with official data
   */
  async function correctEstimatedAdjustment(
    adjustmentId: string,
    officialPercentage: number
  ): Promise<AdjustmentHistory | null> {
    loading.value = true
    error.value = null

    try {
      // Get the original estimated adjustment
      const { data: original, error: fetchError } = await supabase
        .from('adjustment_history')
        .select('*')
        .eq('id', adjustmentId)
        .single()

      if (fetchError || !original) {
        throw new Error('Ajuste no encontrado')
      }

      // Calculate corrected amount
      const correctedAmount = Math.round(
        original.previous_amount * (1 + officialPercentage / 100)
      )

      const today = new Date().toISOString().split('T')[0]
      const effectivePeriod = formatYearMonth(new Date())

      // Update contract with corrected amount
      const { error: contractError } = await supabase
        .from('contracts')
        .update({ current_rent_amount: correctedAmount })
        .eq('id', original.contract_id)

      if (contractError) {
        throw new Error(`Error actualizando contrato: ${contractError.message}`)
      }

      // Update future pending payments
      const { error: paymentsError } = await supabase
        .from('payments')
        .update({
          rent_amount: correctedAmount,
          expected_amount: correctedAmount,
        })
        .eq('contract_id', original.contract_id)
        .gte('due_date', today)
        .neq('status', 'pagado')

      if (paymentsError) {
        console.warn('Error updating payments (non-critical):', paymentsError)
      }

      // Create correction record
      const { data: correction, error: insertError } = await supabase
        .from('adjustment_history')
        .insert({
          contract_id: original.contract_id,
          executed_at: new Date().toISOString(),
          effective_from_period: effectivePeriod,
          adjustment_type: original.adjustment_type,
          index_value_used: officialPercentage,
          previous_amount: original.new_amount,
          new_amount: correctedAmount,
          source: 'manual',
          is_estimated: false,
          inflation_period: original.inflation_period,
          notes: `Corrección de ajuste estimado. IPC oficial: ${officialPercentage.toFixed(2)}%`,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Error creando registro de corrección: ${insertError.message}`)
      }

      // Link correction to original
      const { error: linkError } = await supabase
        .from('adjustment_history')
        .update({ corrected_by_id: correction.id })
        .eq('id', adjustmentId)

      if (linkError) {
        console.warn('Error linking correction (non-critical):', linkError)
      }

      // Refresh the list
      await getEstimatedAdjustments()

      return correction as AdjustmentHistory
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error corrigiendo ajuste'
      error.value = message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Mark an estimated adjustment as not requiring correction
   * (User chooses to keep the estimated value)
   */
  async function keepEstimatedAdjustment(adjustmentId: string): Promise<void> {
    const { error: updateError } = await supabase
      .from('adjustment_history')
      .update({
        is_estimated: false,
        notes: 'Ajuste estimado confirmado por el usuario',
      })
      .eq('id', adjustmentId)

    if (updateError) {
      throw new Error(`Error actualizando ajuste: ${updateError.message}`)
    }

    // Refresh the list
    await getEstimatedAdjustments()
  }

  /**
   * Get adjustment history for display
   */
  async function getAdjustmentHistory(limit: number = 20): Promise<AdjustmentHistory[]> {
    const { data, error: fetchError } = await supabase
      .from('adjustment_history')
      .select(`
        *,
        contract:contracts(
          *,
          property:properties(*)
        )
      `)
      .order('executed_at', { ascending: false })
      .limit(limit)

    if (fetchError) {
      console.error('Error fetching adjustment history:', fetchError)
      return []
    }

    return (data || []) as AdjustmentHistory[]
  }

  /**
   * Check if automatic adjustment processing should run
   * Returns true if today is between day 1-5 of the month
   */
  function shouldProcessAutomatically(): boolean {
    const dayOfMonth = new Date().getDate()
    return dayOfMonth >= 1 && dayOfMonth <= 5
  }

  return {
    loading,
    error,
    pendingAdjustments,
    estimatedAdjustments,
    formatCurrency,
    formatDate,
    getPropertyAddress,
    detectPendingAdjustments,
    calculateAdjustedRent,
    applyAdjustment,
    processAutomaticAdjustments,
    getAdjustmentCounts,
    getEstimatedAdjustments,
    correctEstimatedAdjustment,
    keepEstimatedAdjustment,
    getAdjustmentHistory,
    shouldProcessAutomatically,
    calculateNextAdjustmentDate,
  }
}
