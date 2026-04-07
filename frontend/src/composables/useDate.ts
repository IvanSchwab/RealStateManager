import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useOrganization } from './useOrganization'

export function useDate() {
  const { locale } = useI18n()
  const { dateFormat } = useOrganization()

  // Get the browser locale for date ORDER based on organization dateFormat preference
  // DD/MM/YYYY uses es-AR locale, MM/DD/YYYY uses en-US locale
  const dateLocale = computed(() => {
    if (dateFormat.value === 'MM/DD/YYYY') {
      return 'en-US'
    }
    return 'es-AR' // Default: DD/MM/YYYY
  })

  // Get the locale for TEXT (month names, etc.) based on UI language
  const textLocale = computed(() => {
    return locale.value === 'es' ? 'es-AR' : 'en-US'
  })

  /**
   * Format a date string or Date object to a localized date string
   * Uses organization's date format preference:
   * - DD/MM/YYYY (default) uses es-AR locale
   * - MM/DD/YYYY uses en-US locale
   * Handles both date-only strings (YYYY-MM-DD) and ISO 8601 timestamps with timezone
   */
  function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-'

    try {
      let dateObj: Date
      if (typeof date === 'string') {
        // If the string already contains 'T' (ISO timestamp), parse directly
        // Otherwise it's a date-only string, append time to avoid timezone issues
        dateObj = date.includes('T') ? new Date(date) : new Date(date + 'T00:00:00')
      } else {
        dateObj = date
      }
      if (isNaN(dateObj.getTime())) return '-'
      return dateObj.toLocaleDateString(dateLocale.value, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return '-'
    }
  }

  /**
   * Format a date string or Date object to a short localized date string
   * Spanish: DD/MM
   * English: MM/DD
   * Handles both date-only strings (YYYY-MM-DD) and ISO 8601 timestamps with timezone
   */
  function formatDateShort(date: string | Date | null | undefined): string {
    if (!date) return '-'

    try {
      let dateObj: Date
      if (typeof date === 'string') {
        dateObj = date.includes('T') ? new Date(date) : new Date(date + 'T00:00:00')
      } else {
        dateObj = date
      }
      if (isNaN(dateObj.getTime())) return '-'
      return dateObj.toLocaleDateString(dateLocale.value, {
        day: '2-digit',
        month: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  /**
   * Format a date with time
   */
  function formatDateTime(date: string | Date | null | undefined): string {
    if (!date) return '-'

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      return dateObj.toLocaleDateString(dateLocale.value, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  /**
   * Get month name from month number (1-12)
   * Uses UI language preference (not date format preference)
   */
  function getMonthName(month: number): string {
    const date = new Date(2024, month - 1, 1)
    return date.toLocaleDateString(textLocale.value, { month: 'long' })
  }

  /**
   * Get short month name from month number (1-12)
   * Uses UI language preference (not date format preference)
   */
  function getMonthNameShort(month: number): string {
    const date = new Date(2024, month - 1, 1)
    return date.toLocaleDateString(textLocale.value, { month: 'short' })
  }

  /**
   * Format a month/year string (e.g., "Enero 2024" or "January 2024")
   * Uses UI language preference (not date format preference)
   */
  function formatMonthYear(month: number, year: number): string {
    const date = new Date(year, month - 1, 1)
    const monthName = date.toLocaleDateString(textLocale.value, { month: 'long' })
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`
  }

  /**
   * Get relative time description (e.g., "2 days ago", "hace 2 dias")
   */
  function formatRelativeTime(date: string | Date | null | undefined): string {
    if (!date) return '-'

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      const now = new Date()
      const diffMs = now.getTime() - dateObj.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return locale.value === 'es' ? 'Hoy' : 'Today'
      } else if (diffDays === 1) {
        return locale.value === 'es' ? 'Ayer' : 'Yesterday'
      } else if (diffDays < 7) {
        return locale.value === 'es' ? `Hace ${diffDays} dias` : `${diffDays} days ago`
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7)
        return locale.value === 'es'
          ? `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
          : `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
      } else {
        return formatDate(date)
      }
    } catch {
      return '-'
    }
  }

  return {
    dateLocale,
    formatDate,
    formatDateShort,
    formatDateTime,
    getMonthName,
    getMonthNameShort,
    formatMonthYear,
    formatRelativeTime,
  }
}
