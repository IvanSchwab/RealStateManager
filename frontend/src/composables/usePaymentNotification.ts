import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { usePayments } from './usePayments'
import { useToast } from './useToast'
import { useI18n } from 'vue-i18n'
import type { PaymentWithDetails } from '@/types'

interface AdditionalConcept {
  name: string
  amount: number
}

interface PaymentNotificationPayload {
  to: string
  tenantName: string
  propertyAddress: string
  period: string
  amount: number
  dueDate: string
  replyTo?: string
  // New fields for detailed breakdown
  baseRent: number
  additionalConcepts: AdditionalConcept[]
  contractMonth: number
  contractDurationMonths: number
}

interface NotificationResult {
  success: boolean
  error?: string
}

export function usePaymentNotification() {
  const sending = ref(false)
  const error = ref<string | null>(null)

  const { getTitular, formatPropertyAddress, getPeriodLabel } = usePayments()
  const toast = useToast()
  const { t } = useI18n()

  /**
   * Get tenant contact info from a payment
   */
  function getTenantContact(payment: PaymentWithDetails): {
    name: string
    email: string | null
    phone: string | null
  } {
    const titular = getTitular(payment)
    if (!titular) {
      return { name: '', email: null, phone: null }
    }
    return {
      name: `${titular.first_name} ${titular.last_name}`,
      email: titular.email,
      phone: titular.phone,
    }
  }

  /**
   * Check if a payment can be notified by email
   */
  function canNotifyByEmail(payment: PaymentWithDetails): boolean {
    const { email } = getTenantContact(payment)
    return !!email && payment.status !== 'pagado'
  }

  /**
   * Check if a payment can be notified by WhatsApp
   */
  function canNotifyByWhatsApp(payment: PaymentWithDetails): boolean {
    const { phone } = getTenantContact(payment)
    return !!phone && payment.status !== 'pagado'
  }

  /**
   * Format phone number for WhatsApp link
   * Removes spaces, dashes, and adds Argentina country code if needed
   */
  function formatPhoneForWhatsApp(phone: string): string {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '')

    // If starts with 0, remove it (Argentine local format)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }

    // If doesn't start with country code, add Argentina's (+54)
    if (!cleaned.startsWith('54')) {
      cleaned = '54' + cleaned
    }

    return cleaned
  }

  /**
   * Build WhatsApp message for a payment
   */
  function buildWhatsAppMessage(payment: PaymentWithDetails): string {
    const { name } = getTenantContact(payment)
    const property = formatPropertyAddress(payment)
    const period = getPeriodLabel(payment)
    const amount = payment.total_amount || payment.expected_amount || 0
    const dueDate = payment.due_date

    // Format amount in ARS
    const formattedAmount = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)

    // Format due date
    const formattedDueDate = new Date(dueDate + 'T00:00:00').toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    const message = `Hola ${name},

Le informamos que se encuentra disponible el siguiente pago de alquiler:

*Propiedad:* ${property}
*Período:* ${period}
*Monto:* ${formattedAmount}
*Vencimiento:* ${formattedDueDate}

Si ya realizó el pago, por favor ignore este mensaje.

Saludos.`

    return encodeURIComponent(message)
  }

  /**
   * Build WhatsApp URL for a payment
   */
  function buildWhatsAppUrl(payment: PaymentWithDetails): string | null {
    const { phone } = getTenantContact(payment)
    if (!phone) {
      return null
    }

    const formattedPhone = formatPhoneForWhatsApp(phone)
    const message = buildWhatsAppMessage(payment)
    return `https://wa.me/${formattedPhone}?text=${message}`
  }

  /**
   * Open WhatsApp with pre-filled message
   */
  function openWhatsApp(payment: PaymentWithDetails): void {
    const url = buildWhatsAppUrl(payment)
    if (!url) {
      toast.error(t('payments.notifications.noPhone'))
      return
    }

    window.open(url, '_blank')
  }

  /**
   * Send email notification for a payment
   */
  /**
   * Calculate contract month number from start date and payment period
   */
  function calculateContractMonth(payment: PaymentWithDetails): number {
    const contract = payment.contract
    if (!contract?.start_date) return 1

    const startDate = new Date(contract.start_date)
    const startYear = startDate.getFullYear()
    const startMonth = startDate.getMonth() + 1 // 1-indexed

    // Calculate months elapsed since contract start
    const monthsElapsed = (payment.period_year - startYear) * 12 + (payment.period_month - startMonth)
    return Math.max(1, monthsElapsed + 1) // +1 because first month is month 1
  }

  /**
   * Calculate total contract duration in months
   */
  function calculateContractDuration(payment: PaymentWithDetails): number {
    const contract = payment.contract
    if (!contract?.start_date || !contract?.end_date) return 24 // Default fallback

    const startDate = new Date(contract.start_date)
    const endDate = new Date(contract.end_date)

    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth())
    return Math.max(1, months)
  }

  /**
   * Extract additional concepts with amount > 0
   */
  function getAdditionalConcepts(payment: PaymentWithDetails): AdditionalConcept[] {
    if (!payment.concepts || payment.concepts.length === 0) return []

    return payment.concepts
      .filter(c => c.amount > 0)
      .map(c => ({
        name: c.concept_name,
        amount: c.amount,
      }))
  }

  async function sendEmailNotification(payment: PaymentWithDetails): Promise<NotificationResult> {
    const { name, email } = getTenantContact(payment)

    if (!email) {
      const errorMsg = t('payments.notifications.noEmail')
      error.value = errorMsg
      toast.error(errorMsg)
      return { success: false, error: errorMsg }
    }

    if (payment.status === 'pagado') {
      const errorMsg = t('payments.notifications.alreadyPaid')
      error.value = errorMsg
      toast.error(errorMsg)
      return { success: false, error: errorMsg }
    }

    sending.value = true
    error.value = null

    try {
      const property = formatPropertyAddress(payment)
      const period = getPeriodLabel(payment)
      const amount = payment.total_amount || payment.expected_amount || 0
      const dueDate = payment.due_date

      // Get owner's email for reply-to (if available)
      const ownerEmail = payment.contract?.property?.owner?.email

      // Calculate new fields for detailed breakdown
      const baseRent = payment.rent_amount || payment.expected_amount || 0
      const additionalConcepts = getAdditionalConcepts(payment)
      const contractMonth = calculateContractMonth(payment)
      const contractDurationMonths = calculateContractDuration(payment)

      const payload: PaymentNotificationPayload = {
        to: email,
        tenantName: name,
        propertyAddress: property,
        period,
        amount,
        dueDate,
        replyTo: ownerEmail || undefined,
        baseRent,
        additionalConcepts,
        contractMonth,
        contractDurationMonths,
      }

      const { data, error: fnError } = await supabase.functions.invoke('send-payment-notification', {
        body: payload,
      })

      if (fnError) {
        throw new Error(fnError.message)
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error al enviar notificación')
      }

      toast.success(t('payments.notifications.emailSent'))
      return { success: true }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error al enviar notificación'
      error.value = errorMsg
      console.error('Error sending payment notification:', e)
      toast.error(`${t('common.error')}: ${errorMsg}`)
      return { success: false, error: errorMsg }
    } finally {
      sending.value = false
    }
  }

  return {
    sending,
    error,
    getTenantContact,
    canNotifyByEmail,
    canNotifyByWhatsApp,
    buildWhatsAppUrl,
    openWhatsApp,
    sendEmailNotification,
  }
}
