import { ref } from 'vue'
import type { InflationDataPoint, InflationPeriodResult } from '@/types'

/**
 * Composable for fetching and calculating inflation data (IPC/ICL)
 * Uses external APIs to get official inflation indices from Argentina
 *
 * APIs:
 * - IPC: https://api.argentinadatos.com/v1/finanzas/indices/inflacion
 * - ICL: https://api.argentinadatos.com/v1/finanzas/indices/icl
 */
export function useInflationData() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Month names in Spanish for period labels
  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ]

  /**
   * Format a date as YYYY-MM string
   */
  function formatYearMonth(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  /**
   * Get short month name in Spanish
   */
  function getShortMonthName(month: number): string {
    return monthNames[month - 1] || ''
  }

  /**
   * Calculate the number of months between two dates
   */
  function getMonthsBetween(startDate: Date, endDate: Date): number {
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12
      + (endDate.getMonth() - startDate.getMonth())
    return Math.max(0, months)
  }

  /**
   * Generate an array of YYYY-MM strings for the period
   */
  function getMonthsInPeriod(startDate: Date, endDate: Date): string[] {
    const months: string[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      months.push(formatYearMonth(current))
      current.setMonth(current.getMonth() + 1)
    }

    return months
  }

  /**
   * Fetch IPC (Consumer Price Index) data from Argentina Datos API
   */
  async function fetchIPCData(): Promise<InflationDataPoint[]> {
    try {
      const response = await fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion')
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
      const data = await response.json()

      // API returns array of { fecha: "YYYY-MM-DD", valor: number }
      return Array.isArray(data) ? data : []
    } catch (err) {
      console.error('Error fetching IPC data:', err)
      return []
    }
  }

  /**
   * Fetch ICL (Rental Contract Index) data from Argentina Datos API
   */
  async function fetchICLData(): Promise<InflationDataPoint[]> {
    try {
      const response = await fetch('https://api.argentinadatos.com/v1/finanzas/indices/icl')
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`)
      }
      const data = await response.json()

      // API returns array of { fecha: "YYYY-MM-DD", valor: number }
      return Array.isArray(data) ? data : []
    } catch (err) {
      console.error('Error fetching ICL data:', err)
      return []
    }
  }

  /**
   * Calculate accumulated inflation using compound formula
   *
   * Formula: ((1 + val1/100) * (1 + val2/100) * ... - 1) * 100
   *
   * Example for 3 months at 2.5%, 2.8%, 2.3%:
   * ((1.025) * (1.028) * (1.023) - 1) * 100 = 7.78%
   */
  function calculateAccumulatedInflation(monthlyValues: number[]): number {
    if (monthlyValues.length === 0) return 0

    const accumulated = monthlyValues.reduce((acc, val) => acc * (1 + val / 100), 1)
    return (accumulated - 1) * 100
  }

  /**
   * Estimate missing inflation based on recent trend
   * Uses average of last 3 available months
   */
  function estimateInflation(recentValues: number[]): number {
    if (recentValues.length === 0) return 3 // Default fallback: 3% monthly

    const valuesToAverage = recentValues.slice(-3)
    const sum = valuesToAverage.reduce((a, b) => a + b, 0)
    return sum / valuesToAverage.length
  }

  /**
   * Get inflation data for a specific period with estimation for missing months
   *
   * @param startDate - Start of the adjustment period
   * @param endDate - End of the adjustment period (exclusive, typically current month)
   * @param indexType - 'IPC' or 'ICL'
   * @returns Inflation data with accumulated percentage and estimation flag
   */
  async function getInflationForPeriod(
    startDate: Date,
    endDate: Date,
    indexType: 'IPC' | 'ICL'
  ): Promise<InflationPeriodResult> {
    loading.value = true
    error.value = null

    try {
      // Fetch all available data
      const allData = indexType === 'IPC' ? await fetchIPCData() : await fetchICLData()

      if (allData.length === 0) {
        throw new Error(`No se pudieron obtener datos de ${indexType}`)
      }

      // Get the months we need (from startDate to endDate, exclusive of endDate month)
      // For quarterly adjustment: if last adjustment was Nov 1, next is Feb 1
      // We need inflation for Nov, Dec, Jan
      const adjustedEndDate = new Date(endDate)
      adjustedEndDate.setMonth(adjustedEndDate.getMonth() - 1) // Exclude current month

      const monthsNeeded = getMonthsInPeriod(startDate, adjustedEndDate)

      // Create a map of YYYY-MM -> value for quick lookup
      const dataMap = new Map<string, number>()
      for (const item of allData) {
        // fecha is in format YYYY-MM-DD, we want YYYY-MM
        const yearMonth = item.fecha.substring(0, 7)
        dataMap.set(yearMonth, item.valor)
      }

      // Collect values for needed months
      const values: InflationDataPoint[] = []
      const foundValues: number[] = []
      let isEstimated = false

      for (const month of monthsNeeded) {
        const value = dataMap.get(month)
        if (value !== undefined) {
          values.push({ fecha: month, valor: value })
          foundValues.push(value)
        } else {
          // Data not available for this month - use estimation
          isEstimated = true
          const estimatedValue = estimateInflation(foundValues.length > 0 ? foundValues : Array.from(dataMap.values()))
          values.push({ fecha: month, valor: estimatedValue })
          foundValues.push(estimatedValue)
        }
      }

      // Calculate accumulated inflation
      const accumulated = calculateAccumulatedInflation(foundValues)

      // Generate period label
      const startMonth = parseInt(monthsNeeded[0]?.split('-')[1] || '1')
      const startYear = monthsNeeded[0]?.split('-')[0] || ''
      const endMonth = parseInt(monthsNeeded[monthsNeeded.length - 1]?.split('-')[1] || '1')
      const endYear = monthsNeeded[monthsNeeded.length - 1]?.split('-')[0] || ''

      let periodLabel = `${getShortMonthName(startMonth)} ${startYear}`
      if (monthsNeeded.length > 1) {
        periodLabel += ` - ${getShortMonthName(endMonth)} ${endYear}`
      }

      return {
        values,
        isEstimated,
        accumulated,
        periodLabel
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : `Error al obtener datos de ${indexType}`
      error.value = message
      console.error('Error getting inflation for period:', err)

      // Return estimated data based on typical inflation
      const monthCount = getMonthsBetween(startDate, endDate)
      const estimatedMonthly = 3 // 3% monthly default
      const accumulated = calculateAccumulatedInflation(Array(monthCount).fill(estimatedMonthly))

      return {
        values: [],
        isEstimated: true,
        accumulated,
        periodLabel: 'Estimado'
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Get the latest available inflation value
   */
  async function getLatestInflation(indexType: 'IPC' | 'ICL'): Promise<InflationDataPoint | null> {
    const data = indexType === 'IPC' ? await fetchIPCData() : await fetchICLData()
    if (data.length === 0) return null

    // Data is typically sorted chronologically, get the last item
    return data[data.length - 1]
  }

  return {
    loading,
    error,
    fetchIPCData,
    fetchICLData,
    calculateAccumulatedInflation,
    estimateInflation,
    getInflationForPeriod,
    getLatestInflation,
    getMonthsBetween,
    formatYearMonth,
    getShortMonthName
  }
}
