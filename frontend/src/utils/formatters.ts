// TODO: Implement formatters

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: 'USD')
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  // TODO: Implement currency formatting
  return `$${amount.toFixed(2)}`
}

/**
 * Format a date for display
 * @param date - The date to format
 */
export function formatDate(date: Date | string): string {
  // TODO: Implement date formatting with date-fns
  return new Date(date).toLocaleDateString()
}

/**
 * Format a phone number for display
 * @param phone - The phone number to format
 */
export function formatPhone(phone: string): string {
  // TODO: Implement phone formatting
  return phone
}
