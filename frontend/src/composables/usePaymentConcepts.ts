import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { PaymentConcept } from '@/types'
import { useOrganization } from './useOrganization'

export interface ConceptFormData {
  concept_name: string
  amount: number
  is_recurring?: boolean
}

export function usePaymentConcepts() {
  const concepts = ref<PaymentConcept[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { defaultCurrency } = useOrganization()

  /**
   * Fetch all concepts for a payment
   */
  async function fetchConcepts(paymentId: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('payment_concepts')
        .select('*')
        .eq('payment_id', paymentId)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      concepts.value = data || []
      return concepts.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar conceptos'
      console.error('Error fetching concepts:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Add a concept to a payment
   * The trigger will auto-recalculate the payment total
   */
  async function addConcept(
    paymentId: string,
    conceptData: ConceptFormData
  ): Promise<PaymentConcept | null> {
    loading.value = true
    error.value = null

    try {
      const { data: concept, error: insertError } = await supabase
        .from('payment_concepts')
        .insert({
          payment_id: paymentId,
          concept_name: conceptData.concept_name,
          amount: conceptData.amount,
          is_recurring: conceptData.is_recurring || false,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Add to local state
      if (concept) {
        concepts.value.push(concept)
      }

      return concept
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al agregar concepto'
      console.error('Error adding concept:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Update a concept
   */
  async function updateConcept(
    conceptId: string,
    updates: Partial<ConceptFormData>
  ): Promise<PaymentConcept | null> {
    loading.value = true
    error.value = null

    try {
      const { data: concept, error: updateError } = await supabase
        .from('payment_concepts')
        .update(updates)
        .eq('id', conceptId)
        .select()
        .single()

      if (updateError) throw updateError

      // Update local state
      if (concept) {
        const index = concepts.value.findIndex(c => c.id === conceptId)
        if (index !== -1) {
          concepts.value[index] = concept
        }
      }

      return concept
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar concepto'
      console.error('Error updating concept:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Remove a concept from a payment
   * The trigger will auto-recalculate the payment total
   */
  async function removeConcept(conceptId: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('payment_concepts')
        .delete()
        .eq('id', conceptId)

      if (deleteError) throw deleteError

      // Remove from local state
      concepts.value = concepts.value.filter(c => c.id !== conceptId)

      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar concepto'
      console.error('Error removing concept:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Apply recurring concepts to all future payments of a contract
   */
  async function applyRecurringToFuture(
    contractId: string,
    conceptData: ConceptFormData
  ): Promise<number> {
    loading.value = true
    error.value = null

    try {
      const today = new Date().toISOString().split('T')[0]

      // Get all future pending payments for this contract
      const { data: futurePayments, error: fetchError } = await supabase
        .from('payments')
        .select('id')
        .eq('contract_id', contractId)
        .eq('status', 'pendiente')
        .gte('due_date', today)

      if (fetchError) throw fetchError
      if (!futurePayments || futurePayments.length === 0) return 0

      // Create concepts for each payment
      const conceptsToCreate = futurePayments.map(payment => ({
        payment_id: payment.id,
        concept_name: conceptData.concept_name,
        amount: conceptData.amount,
        is_recurring: true,
      }))

      const { error: insertError } = await supabase
        .from('payment_concepts')
        .insert(conceptsToCreate)

      if (insertError) throw insertError

      return futurePayments.length
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al aplicar concepto recurrente'
      console.error('Error applying recurring concept:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Remove a recurring concept from all future payments of a contract
   */
  async function removeRecurringFromFuture(
    contractId: string,
    conceptName: string
  ): Promise<number> {
    loading.value = true
    error.value = null

    try {
      const today = new Date().toISOString().split('T')[0]

      // Find all concepts matching the name in future pending payments
      const { data, error: deleteError } = await supabase
        .from('payment_concepts')
        .delete()
        .eq('concept_name', conceptName)
        .eq('is_recurring', true)
        .in(
          'payment_id',
          supabase
            .from('payments')
            .select('id')
            .eq('contract_id', contractId)
            .eq('status', 'pendiente')
            .gte('due_date', today)
        )
        .select('id')

      if (deleteError) throw deleteError

      return data?.length || 0
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar concepto recurrente'
      console.error('Error removing recurring concept:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Get the total of all concepts
   */
  function getConceptsTotal(): number {
    return concepts.value.reduce((sum, c) => sum + c.amount, 0)
  }

  /**
   * Format currency using organization's default currency preference
   */
  function formatCurrency(amount: number): string {
    const currency = defaultCurrency.value
    const locale = currency === 'USD' ? 'en-US' : 'es-AR'
    const showDecimals = currency === 'USD'

    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(amount)

    if (currency === 'USD') {
      return formatted.replace('$', 'US$ ').replace('US$  ', 'US$ ')
    }

    return formatted
  }

  return {
    concepts,
    loading,
    error,
    fetchConcepts,
    addConcept,
    updateConcept,
    removeConcept,
    applyRecurringToFuture,
    removeRecurringFromFuture,
    getConceptsTotal,
    formatCurrency,
  }
}
