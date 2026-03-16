import { computed } from 'vue'
import { useOrganization } from './useOrganization'
import { useExchangeRate } from './useExchangeRate'
import type { CurrencyCode } from '@/types'

/**
 * Loading placeholder constant - used when exchange rate is being fetched.
 * Components can check for this to display a loading state.
 */
export const CURRENCY_LOADING_PLACEHOLDER = '...'

/**
 * Composable for formatting currency amounts according to organization preferences.
 * Uses the organization's defaultCurrency setting (ARS or USD).
 *
 * Formatting rules:
 * - ARS: $ 1.000,00 (Argentine locale, period as thousands separator, comma as decimal)
 * - USD: US$ 1,000.00 (US locale, comma as thousands separator, period as decimal)
 *
 * Conversion rules:
 * - If defaultCurrency is ARS: no conversion, format as ARS
 * - If defaultCurrency is USD:
 *   - If sourceCurrency is USD: no conversion, format as USD
 *   - If sourceCurrency is ARS: convert using oficial rate, format as USD
 *   - If rate is loading: return loading placeholder
 */
export function useFormatCurrency() {
  const { defaultCurrency } = useOrganization()
  const { oficialRate, loading: rateLoading, hasValidRate, convertArsToUsd } = useExchangeRate()

  /**
   * Get the appropriate locale for the currency
   */
  function getLocaleForCurrency(currency: CurrencyCode): string {
    return currency === 'USD' ? 'en-US' : 'es-AR'
  }

  /**
   * Whether the exchange rate is currently being loaded
   */
  const isLoadingRate = computed(() => rateLoading.value)

  /**
   * Whether conversion is needed (defaultCurrency is USD)
   */
  const needsConversion = computed(() => defaultCurrency.value === 'USD')

  /**
   * Format a number as currency using the organization's default currency preference.
   *
   * When defaultCurrency is USD and sourceCurrency is ARS, the amount is converted
   * using the official exchange rate (dólar oficial).
   *
   * @param amount - The amount to format (in the sourceCurrency)
   * @param sourceCurrency - The currency the amount is stored in (defaults to 'ARS')
   * @param options - Optional overrides
   * @param options.skipConversion - If true, skip conversion even when currencies differ (for PDFs)
   * @param options.showDecimals - Whether to show decimal places
   */
  function formatCurrency(
    amount: number | null | undefined,
    sourceCurrency: CurrencyCode = 'ARS',
    options?: {
      skipConversion?: boolean
      showDecimals?: boolean
    }
  ): string {
    const targetCurrency = defaultCurrency.value

    // Handle null/undefined
    if (amount === null || amount === undefined) {
      return targetCurrency === 'USD' ? 'US$ 0' : '$ 0'
    }

    // Determine if conversion is needed
    const shouldConvert =
      !options?.skipConversion &&
      targetCurrency === 'USD' &&
      sourceCurrency === 'ARS'

    let displayAmount = amount
    let displayCurrency = targetCurrency

    if (shouldConvert) {
      // Check if rate is still loading
      if (rateLoading.value && !hasValidRate.value) {
        return CURRENCY_LOADING_PLACEHOLDER
      }

      // Convert ARS to USD
      const converted = convertArsToUsd(amount)
      if (converted === null) {
        // No valid rate available - show loading placeholder
        return CURRENCY_LOADING_PLACEHOLDER
      }

      displayAmount = converted
      displayCurrency = 'USD'
    } else if (targetCurrency === 'USD' && sourceCurrency === 'USD') {
      // Amount is already in USD, no conversion needed
      displayCurrency = 'USD'
    } else {
      // Default to ARS (no conversion)
      displayCurrency = 'ARS'
    }

    const locale = getLocaleForCurrency(displayCurrency)

    // Default: ARS shows no decimals, USD shows 2 decimals
    const showDecimals = options?.showDecimals ?? (displayCurrency === 'USD')
    const minimumFractionDigits = showDecimals ? 2 : 0
    const maximumFractionDigits = showDecimals ? 2 : 0

    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: displayCurrency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(displayAmount)

    // For USD, prefix with "US" to distinguish from ARS which also uses "$"
    if (displayCurrency === 'USD') {
      return formatted.replace('$', 'US$ ').replace('US$  ', 'US$ ')
    }

    return formatted
  }

  /**
   * Format a number with the currency symbol but always showing decimals
   */
  function formatCurrencyWithDecimals(
    amount: number | null | undefined,
    sourceCurrency: CurrencyCode = 'ARS'
  ): string {
    return formatCurrency(amount, sourceCurrency, { showDecimals: true })
  }

  /**
   * Format currency without conversion (for PDFs and documents)
   * Always displays in the source currency without any conversion.
   */
  function formatCurrencyNoConversion(
    amount: number | null | undefined,
    sourceCurrency: CurrencyCode = 'ARS'
  ): string {
    if (amount === null || amount === undefined) {
      return sourceCurrency === 'USD' ? 'US$ 0' : '$ 0'
    }

    const locale = getLocaleForCurrency(sourceCurrency)
    const showDecimals = sourceCurrency === 'USD'

    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: sourceCurrency,
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: showDecimals ? 2 : 0,
    }).format(amount)

    if (sourceCurrency === 'USD') {
      return formatted.replace('$', 'US$ ').replace('US$  ', 'US$ ')
    }

    return formatted
  }

  /**
   * Format a number without currency symbol, just with locale-appropriate number formatting
   */
  function formatNumber(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '0'

    const currency = defaultCurrency.value
    const locale = getLocaleForCurrency(currency)

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  /**
   * Get the currency symbol for display
   */
  const currencySymbol = computed(() => {
    return defaultCurrency.value === 'USD' ? 'US$' : '$'
  })

  /**
   * Get the currency label for display
   */
  const currencyLabel = computed(() => {
    return defaultCurrency.value === 'USD' ? 'Dolar (USD)' : 'Peso Argentino (ARS)'
  })

  /**
   * Get the current exchange rate for display purposes
   */
  const currentRate = computed(() => oficialRate.value)

  return {
    defaultCurrency,
    currencySymbol,
    currencyLabel,
    currentRate,
    isLoadingRate,
    needsConversion,
    formatCurrency,
    formatCurrencyWithDecimals,
    formatCurrencyNoConversion,
    formatNumber,
    CURRENCY_LOADING_PLACEHOLDER,
  }
}
