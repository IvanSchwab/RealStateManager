import { format } from 'date-fns'

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'ARS')
 */
export function formatCurrency(amount: number, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Format a date for display
 * @param date - The date to format
 */
export function formatDate(date: Date | string): string {
  return format(new Date(date), 'dd/MM/yyyy')
}

/**
 * Format a phone number for display
 * @param phone - The phone number to format
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  if (digits.length >= 12 && digits.startsWith('54')) {
    const local = digits.slice(2)
    return `+54 ${local.slice(0, 2)} ${local.slice(2, 6)}-${local.slice(6)}`
  }

  return phone
}
