import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export function useDate() {
  const { locale } = useI18n()

  // Get the browser locale based on i18n locale
  const dateLocale = computed(() => {
    return locale.value === 'es' ? 'es-AR' : 'en-US'
  })

  /**
   * Format a date string or Date object to a localized date string
   * Spanish: DD/MM/YYYY
   * English: MM/DD/YYYY
   */
  function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-'

    try {
      const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
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
   */
  function formatDateShort(date: string | Date | null | undefined): string {
    if (!date) return '-'

    try {
      const dateObj = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
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
   */
  function getMonthName(month: number): string {
    const date = new Date(2024, month - 1, 1)
    return date.toLocaleDateString(dateLocale.value, { month: 'long' })
  }

  /**
   * Get short month name from month number (1-12)
   */
  function getMonthNameShort(month: number): string {
    const date = new Date(2024, month - 1, 1)
    return date.toLocaleDateString(dateLocale.value, { month: 'short' })
  }

  /**
   * Format a month/year string (e.g., "Enero 2024" or "January 2024")
   */
  function formatMonthYear(month: number, year: number): string {
    const date = new Date(year, month - 1, 1)
    const monthName = date.toLocaleDateString(dateLocale.value, { month: 'long' })
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
