import { ref, computed } from 'vue'
import { differenceInHours } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { usePaymentNotification } from './usePaymentNotification'
import { usePayments } from './usePayments'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import type { PaymentWithDetails } from '@/types'

export interface WhatsAppPendingItem {
  paymentId: string
  tenantName: string
  propertyAddress: string
  whatsappUrl: string
}

export interface BulkNotificationResult {
  sent: number
  skipped: number
  failed: number
  total: number
  whatsappPending: WhatsAppPendingItem[]
}

export interface BulkNotificationProgress {
  sent: number
  skipped: number
  failed: number
  total: number
  current: number
  currentTenant: string
}

const NOTIFICATION_COOLDOWN_HOURS = 24

export function useBulkNotification() {
  const selectedPaymentIds = ref<Set<string>>(new Set())
  const loading = ref(false)
  const progress = ref<BulkNotificationProgress>({
    sent: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    current: 0,
    currentTenant: '',
  })

  const { sendEmailNotification, canNotifyByEmail, getTenantContact, buildWhatsAppUrl } = usePaymentNotification()
  const { formatPropertyAddress } = usePayments()
  const { fetchPaymentsByIds } = usePayments()
  const toast = useToast()
  const { t } = useI18n()

  const selectedCount = computed(() => selectedPaymentIds.value.size)

  function toggleSelection(id: string): void {
    if (selectedPaymentIds.value.has(id)) {
      selectedPaymentIds.value.delete(id)
    } else {
      selectedPaymentIds.value.add(id)
    }
    // Trigger reactivity
    selectedPaymentIds.value = new Set(selectedPaymentIds.value)
  }

  function selectAll(ids: string[]): void {
    selectedPaymentIds.value = new Set(ids)
  }

  function clearSelection(): void {
    selectedPaymentIds.value = new Set()
  }

  function isSelected(id: string): boolean {
    return selectedPaymentIds.value.has(id)
  }

  /**
   * Check if a payment should be skipped based on business rules
   */
  function shouldSkipPayment(payment: PaymentWithDetails): { skip: boolean; reason: string } {
    // Skip if already paid
    if (payment.status === 'pagado') {
      return { skip: true, reason: 'already_paid' }
    }

    // Skip if status is not pending or overdue
    if (payment.status !== 'pendiente' && payment.status !== 'vencido') {
      return { skip: true, reason: 'invalid_status' }
    }

    // Skip if notified within the last 24 hours
    if (payment.last_notified_at) {
      const lastNotified = new Date(payment.last_notified_at)
      const hoursSinceLastNotification = differenceInHours(new Date(), lastNotified)
      if (hoursSinceLastNotification < NOTIFICATION_COOLDOWN_HOURS) {
        return { skip: true, reason: 'recently_notified' }
      }
    }

    // Skip if tenant has no email
    if (!canNotifyByEmail(payment)) {
      return { skip: true, reason: 'no_email' }
    }

    return { skip: false, reason: '' }
  }

  /**
   * Update last_notified_at timestamp for a payment
   */
  async function updateLastNotifiedAt(paymentId: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('id', paymentId)

    if (error) {
      console.error('Error updating last_notified_at:', error)
    }
  }

  /**
   * Process notifications sequentially to avoid rate limiting
   */
  async function processNotifications(
    payments: PaymentWithDetails[]
  ): Promise<BulkNotificationResult> {
    const result: BulkNotificationResult = {
      sent: 0,
      skipped: 0,
      failed: 0,
      total: payments.length,
      whatsappPending: [],
    }

    progress.value = {
      sent: 0,
      skipped: 0,
      failed: 0,
      total: payments.length,
      current: 0,
      currentTenant: '',
    }

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i]
      const tenant = getTenantContact(payment)

      progress.value.current = i + 1
      progress.value.currentTenant = tenant.name || 'Inquilino desconocido'

      const { skip, reason } = shouldSkipPayment(payment)

      if (skip) {
        // Handle no_email separately - add to whatsappPending if they have WhatsApp
        if (reason === 'no_email') {
          const whatsappUrl = buildWhatsAppUrl(payment)
          if (whatsappUrl) {
            result.whatsappPending.push({
              paymentId: payment.id,
              tenantName: tenant.name || 'Inquilino desconocido',
              propertyAddress: formatPropertyAddress(payment),
              whatsappUrl,
            })
          }
        } else {
          result.skipped++
          progress.value.skipped++
        }
        continue
      }

      try {
        const notificationResult = await sendEmailNotification(payment)

        if (notificationResult.success) {
          result.sent++
          progress.value.sent++
          // Update last_notified_at after successful send
          await updateLastNotifiedAt(payment.id)
        } else {
          result.failed++
          progress.value.failed++
        }
      } catch (e) {
        console.error('Error sending notification:', e)
        result.failed++
        progress.value.failed++
      }

      // Small delay between notifications to avoid rate limiting (200ms)
      if (i < payments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return result
  }

  /**
   * Notify selected payments
   */
  async function notifySelected(paymentIds: string[]): Promise<BulkNotificationResult> {
    const emptyResult: BulkNotificationResult = { sent: 0, skipped: 0, failed: 0, total: 0, whatsappPending: [] }

    if (paymentIds.length === 0) {
      return emptyResult
    }

    loading.value = true

    try {
      const payments = await fetchPaymentsByIds(paymentIds)

      if (payments.length === 0) {
        toast.warning(t('payments.bulkNotifications.noPaymentsToNotify'))
        return emptyResult
      }

      const result = await processNotifications(payments)
      clearSelection()
      return result
    } catch (e) {
      console.error('Error in bulk notification:', e)
      toast.error(t('payments.bulkNotifications.error'))
      return emptyResult
    } finally {
      loading.value = false
    }
  }

  /**
   * Notify all pending/overdue payments in the current view
   */
  async function notifyAll(payments: PaymentWithDetails[]): Promise<BulkNotificationResult> {
    const emptyResult: BulkNotificationResult = { sent: 0, skipped: 0, failed: 0, total: 0, whatsappPending: [] }

    if (payments.length === 0) {
      return emptyResult
    }

    loading.value = true

    try {
      // Filter to only include pending or overdue payments
      const eligiblePayments = payments.filter(
        p => p.status === 'pendiente' || p.status === 'vencido'
      )

      if (eligiblePayments.length === 0) {
        toast.warning(t('payments.bulkNotifications.noPaymentsToNotify'))
        return emptyResult
      }

      const result = await processNotifications(eligiblePayments)
      clearSelection()
      return result
    } catch (e) {
      console.error('Error in bulk notification:', e)
      toast.error(t('payments.bulkNotifications.error'))
      return emptyResult
    } finally {
      loading.value = false
    }
  }

  return {
    // Selection state
    selectedPaymentIds,
    selectedCount,
    // Selection methods
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    // Notification methods
    notifySelected,
    notifyAll,
    // Loading state
    loading,
    progress,
  }
}
