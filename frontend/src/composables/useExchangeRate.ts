import { ref, readonly, computed } from 'vue'

/**
 * Composable for managing the official USD exchange rate.
 *
 * Features:
 * - Fetches the dólar oficial sell rate from DolarAPI
 * - Caches the result for 30 minutes to avoid excessive API calls
 * - Provides loading and error states
 * - Shared state across all component instances (singleton pattern)
 */

// Shared state across all instances (singleton)
const oficialRate = ref<number | null>(null)
const lastFetched = ref<Date | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Cache duration: 30 minutes
const CACHE_DURATION_MS = 30 * 60 * 1000

export function useExchangeRate() {
  /**
   * Check if the cached rate is still valid
   */
  const isCacheValid = computed(() => {
    if (!lastFetched.value || oficialRate.value === null) {
      return false
    }
    const now = new Date()
    const elapsed = now.getTime() - lastFetched.value.getTime()
    return elapsed < CACHE_DURATION_MS
  })

  /**
   * Check if we have a valid rate available
   */
  const hasValidRate = computed(() => {
    return oficialRate.value !== null && oficialRate.value > 0
  })

  /**
   * Fetch the official USD exchange rate from the API.
   * Returns the rate if successful, or throws an error if not.
   * Uses cached value if available and not expired.
   */
  async function fetchRate(): Promise<number> {
    // Return cached value if still valid
    if (isCacheValid.value && oficialRate.value !== null) {
      return oficialRate.value
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetch('https://dolarapi.com/v1/dolares')

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()

      // Find the official dollar rate
      const oficial = data.find((d: { casa: string }) => d.casa === 'oficial')

      if (!oficial || typeof oficial.venta !== 'number' || oficial.venta <= 0) {
        throw new Error('Invalid exchange rate data received')
      }

      // Update the cached values
      oficialRate.value = oficial.venta
      lastFetched.value = new Date()

      return oficial.venta
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error fetching exchange rate'
      error.value = errorMessage
      console.error('Error fetching exchange rate:', e)
      throw new Error(errorMessage)
    } finally {
      loading.value = false
    }
  }

  /**
   * Force refresh the exchange rate, ignoring cache
   */
  async function forceRefresh(): Promise<number> {
    lastFetched.value = null
    return fetchRate()
  }

  /**
   * Clear the cached rate (useful when switching back to ARS)
   */
  function clearCache() {
    // We don't clear the actual rate, just mark the cache as potentially stale
    // This way if user switches back to USD, we can still use the rate while fetching fresh
  }

  /**
   * Convert an ARS amount to USD using the cached official rate
   * Returns null if no valid rate is available
   */
  function convertArsToUsd(arsAmount: number): number | null {
    if (!hasValidRate.value || oficialRate.value === null) {
      return null
    }
    return arsAmount / oficialRate.value
  }

  return {
    // State (readonly to prevent external mutation)
    oficialRate: readonly(oficialRate),
    lastFetched: readonly(lastFetched),
    loading: readonly(loading),
    error: readonly(error),

    // Computed
    isCacheValid,
    hasValidRate,

    // Methods
    fetchRate,
    forceRefresh,
    clearCache,
    convertArsToUsd,
  }
}
