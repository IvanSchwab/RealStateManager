import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useDate } from './useDate'
import { useFormatCurrency } from './useFormatCurrency'

// Types for dashboard data
export interface IncomeKPIs {
  currentMonthIncome: number
  pendingIncome: number
  overdueAmount: number
  overdueCount: number
  monthOverMonthChange: number
  previousMonthIncome: number
}

export interface DolarRate {
  compra: number
  venta: number
  fecha: string
}

export interface EconomicIndicators {
  dolarBlue: DolarRate
  dolarOficial: DolarRate
  inflacion: {
    valor: number
    mes: string
  }
}

export interface MonthlyIncomeData {
  month: string
  monthLabel: string
  collected: number
  pending: number
}

export interface PaymentDistribution {
  paid: number
  pending: number
  overdue: number
  paidCount: number
  pendingCount: number
  overdueCount: number
}

export interface RecentPayment {
  id: string
  amount: number
  paymentDate: string
  tenantName: string
  propertyAddress: string
  contractId: string
}

export interface ExpiringContract {
  id: string
  propertyAddress: string
  propertyType: string
  endDate: string
  daysRemaining: number
  tenantName: string
}

export function useDashboard() {
  // State
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { organizationId } = useAuth()
  const { formatCurrency } = useFormatCurrency()
  const { formatDate: formatDateFromComposable, dateLocale, getMonthName: getMonthNameFromComposable } = useDate()

  // KPIs
  const incomeKPIs = ref<IncomeKPIs>({
    currentMonthIncome: 0,
    pendingIncome: 0,
    overdueAmount: 0,
    overdueCount: 0,
    monthOverMonthChange: 0,
    previousMonthIncome: 0,
  })

  // Economic indicators
  const economicIndicators = ref<EconomicIndicators>({
    dolarBlue: { compra: 0, venta: 0, fecha: '' },
    dolarOficial: { compra: 0, venta: 0, fecha: '' },
    inflacion: { valor: 0, mes: '' },
  })
  const economicLoading = ref(false)
  const economicError = ref<string | null>(null)

  // Charts data
  const incomeChartData = ref<MonthlyIncomeData[]>([])
  const paymentDistribution = ref<PaymentDistribution>({
    paid: 0,
    pending: 0,
    overdue: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0,
  })

  // Activity feeds
  const recentPayments = ref<RecentPayment[]>([])
  const expiringContracts = ref<ExpiringContract[]>([])

  /**
   * Format date using organization's date format preference
   */
  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString(dateLocale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  /**
   * Get month name using i18n locale
   */
  function getMonthName(month: number): string {
    return getMonthNameFromComposable(month)
  }

  /**
   * Get short month name in Spanish
   */
  function getShortMonthName(month: number): string {
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ]
    return months[month - 1] || ''
  }

  /**
   * Fetch income KPIs from Supabase
   */
  async function fetchIncomeKPIs() {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetchIncomeKPIs')
      return
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const today = now.toISOString().split('T')[0]

    // Calculate previous month
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear

    try {
      // Fetch all payments for current month (for collected)
      const { data: currentMonthPayments, error: currentError } = await supabase
        .from('payments')
        .select('total_amount, status, due_date')
        .eq('organization_id', organizationId.value)
        .eq('period_month', currentMonth)
        .eq('period_year', currentYear)

      if (currentError) throw currentError

      // Fetch previous month payments (for comparison)
      const { data: prevMonthPayments, error: prevError } = await supabase
        .from('payments')
        .select('total_amount, status')
        .eq('organization_id', organizationId.value)
        .eq('period_month', prevMonth)
        .eq('period_year', prevYear)
        .eq('status', 'pagado')

      if (prevError) throw prevError

      // Fetch all overdue payments (across all periods)
      const { data: overduePayments, error: overdueError } = await supabase
        .from('payments')
        .select('total_amount')
        .eq('organization_id', organizationId.value)
        .lt('due_date', today)
        .neq('status', 'pagado')

      if (overdueError) throw overdueError

      // Calculate KPIs
      const currentCollected = currentMonthPayments
        ?.filter(p => p.status === 'pagado')
        .reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0

      const currentPending = currentMonthPayments
        ?.filter(p => p.status !== 'pagado' && p.due_date >= today)
        .reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0

      const previousCollected = prevMonthPayments
        ?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0

      const overdueTotal = overduePayments
        ?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0

      // Calculate month over month change
      let monthChange = 0
      if (previousCollected > 0) {
        monthChange = ((currentCollected - previousCollected) / previousCollected) * 100
      } else if (currentCollected > 0) {
        monthChange = 100
      }

      incomeKPIs.value = {
        currentMonthIncome: currentCollected,
        pendingIncome: currentPending,
        overdueAmount: overdueTotal,
        overdueCount: overduePayments?.length || 0,
        monthOverMonthChange: Math.round(monthChange),
        previousMonthIncome: previousCollected,
      }
    } catch (e) {
      console.error('Error fetching income KPIs:', e)
      error.value = e instanceof Error ? e.message : 'Error al cargar indicadores de ingresos'
    }
  }

  /**
   * Fetch economic indicators from external APIs
   */
  async function fetchEconomicIndicators() {
    economicLoading.value = true
    economicError.value = null

    try {
      // Fetch dolar rates from dolarapi.com
      const dolarResponse = await fetch('https://dolarapi.com/v1/dolares')
      if (dolarResponse.ok) {
        const dolarData = await dolarResponse.json()

        const blue = dolarData.find((d: { casa: string }) => d.casa === 'blue')
        const oficial = dolarData.find((d: { casa: string }) => d.casa === 'oficial')

        if (blue) {
          economicIndicators.value.dolarBlue = {
            compra: blue.compra,
            venta: blue.venta,
            fecha: blue.fechaActualizacion,
          }
        }

        if (oficial) {
          economicIndicators.value.dolarOficial = {
            compra: oficial.compra,
            venta: oficial.venta,
            fecha: oficial.fechaActualizacion,
          }
        }
      }

      // Fetch inflation data from Bluelytics (provides monthly inflation percentage)
      try {
        const inflacionResponse = await fetch('https://api.bluelytics.com.ar/v2/evolution.json?days=60')
        if (inflacionResponse.ok) {
          const inflacionData = await inflacionResponse.json()
          // Get the two most recent months to calculate monthly inflation
          if (Array.isArray(inflacionData) && inflacionData.length >= 2) {
            // Data is sorted newest first, find the latest with inflation value
            const latestWithValue = inflacionData.find(
              (d: { value_sell_blue?: number }) => d.value_sell_blue !== undefined
            )
            if (latestWithValue) {
              const latestDate = new Date(latestWithValue.date)
              // Bluelytics doesn't provide inflation directly in /latest
              // We'll use a fallback to Argentina's official inflation API
              economicIndicators.value.inflacion = {
                valor: 0,
                mes: `${getMonthName(latestDate.getMonth() + 1)} ${latestDate.getFullYear()}`,
              }
            }
          }
        }
      } catch {
        console.warn('Could not fetch Bluelytics inflation data')
      }

      // Fetch inflation from Argentina Datos API (monthly inflation percentage)
      try {
        const inflacionApiResponse = await fetch('https://api.argentinadatos.com/v1/finanzas/indices/inflacion')
        if (inflacionApiResponse.ok) {
          const inflacionApiData = await inflacionApiResponse.json()
          // Get the latest entry (array is sorted chronologically, newest last)
          if (Array.isArray(inflacionApiData) && inflacionApiData.length > 0) {
            const latest = inflacionApiData[inflacionApiData.length - 1]
            if (latest && latest.valor !== undefined) {
              // Parse the date (format: "YYYY-MM-DD")
              const [year, month] = latest.fecha.split('-')
              economicIndicators.value.inflacion = {
                valor: latest.valor, // This is the actual monthly inflation %
                mes: `${getMonthName(parseInt(month))} ${year}`,
              }
            }
          }
        }
      } catch {
        console.warn('Could not fetch Argentina Datos inflation data')
      }
    } catch (e) {
      console.error('Error fetching economic indicators:', e)
      economicError.value = 'Error al cargar indicadores económicos'
    } finally {
      economicLoading.value = false
    }
  }

  /**
   * Fetch chart data for income over last N months
   */
  async function fetchChartData(months: number = 6) {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetchChartData')
      return
    }

    const now = new Date()
    const data: MonthlyIncomeData[] = []

    try {
      // Calculate date range
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1) // First day of start month

      const startStr = startDate.toISOString().split('T')[0]
      const endStr = endDate.toISOString().split('T')[0]

      // Fetch all payments in range
      const { data: payments, error: fetchError } = await supabase
        .from('payments')
        .select('period_month, period_year, total_amount, status')
        .eq('organization_id', organizationId.value)
        .gte('due_date', startStr)
        .lte('due_date', endStr)

      if (fetchError) throw fetchError

      // Aggregate by month
      for (let i = 0; i < months; i++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1)
        const targetMonth = targetDate.getMonth() + 1
        const targetYear = targetDate.getFullYear()

        const monthPayments = payments?.filter(
          p => p.period_month === targetMonth && p.period_year === targetYear
        ) || []

        const collected = monthPayments
          .filter(p => p.status === 'pagado')
          .reduce((sum, p) => sum + (p.total_amount || 0), 0)

        const pending = monthPayments
          .filter(p => p.status !== 'pagado')
          .reduce((sum, p) => sum + (p.total_amount || 0), 0)

        data.push({
          month: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
          monthLabel: `${getShortMonthName(targetMonth)} ${targetYear.toString().slice(2)}`,
          collected,
          pending,
        })
      }

      incomeChartData.value = data
    } catch (e) {
      console.error('Error fetching chart data:', e)
      error.value = e instanceof Error ? e.message : 'Error al cargar datos del gráfico'
    }
  }

  /**
   * Fetch payment distribution for current month
   */
  async function fetchPaymentDistribution() {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetchPaymentDistribution')
      return
    }

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const today = now.toISOString().split('T')[0]

    try {
      const { data: payments, error: fetchError } = await supabase
        .from('payments')
        .select('total_amount, status, due_date')
        .eq('organization_id', organizationId.value)
        .eq('period_month', currentMonth)
        .eq('period_year', currentYear)

      if (fetchError) throw fetchError

      const paid = payments?.filter(p => p.status === 'pagado') || []
      const pending = payments?.filter(p => p.status !== 'pagado' && p.due_date >= today) || []
      const overdue = payments?.filter(p => p.status !== 'pagado' && p.due_date < today) || []

      paymentDistribution.value = {
        paid: paid.reduce((sum, p) => sum + (p.total_amount || 0), 0),
        pending: pending.reduce((sum, p) => sum + (p.total_amount || 0), 0),
        overdue: overdue.reduce((sum, p) => sum + (p.total_amount || 0), 0),
        paidCount: paid.length,
        pendingCount: pending.length,
        overdueCount: overdue.length,
      }
    } catch (e) {
      console.error('Error fetching payment distribution:', e)
      error.value = e instanceof Error ? e.message : 'Error al cargar distribución de pagos'
    }
  }

  /**
   * Fetch recent payments (last 5)
   */
  async function fetchRecentPayments() {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetchRecentPayments')
      return
    }

    try {
      const { data: payments, error: fetchError } = await supabase
        .from('payments')
        .select(`
          id,
          total_amount,
          payment_date,
          contract:contracts!inner(
            id,
            property:properties(
              address_street,
              address_number
            ),
            tenants:contract_tenants(
              role,
              tenant:tenants(
                first_name,
                last_name
              )
            )
          )
        `)
        .eq('organization_id', organizationId.value)
        .eq('status', 'pagado')
        .not('payment_date', 'is', null)
        .order('payment_date', { ascending: false })
        .limit(5)

      if (fetchError) throw fetchError

      recentPayments.value = (payments || []).map((p: {
        id: string
        total_amount: number | null
        payment_date: string | null
        contract: {
          id: string
          property: { address_street: string; address_number: string | null } | null
          tenants: Array<{
            role: string
            tenant: { first_name: string; last_name: string } | null
          }>
        }
      }) => {
        const titular = p.contract?.tenants?.find(t => t.role === 'titular')
        const tenantName = titular?.tenant
          ? `${titular.tenant.first_name} ${titular.tenant.last_name}`
          : 'Inquilino desconocido'

        const property = p.contract?.property
        const address = property
          ? `${property.address_street} ${property.address_number || ''}`
          : 'Dirección desconocida'

        return {
          id: p.id,
          amount: p.total_amount || 0,
          paymentDate: p.payment_date || '',
          tenantName,
          propertyAddress: address,
          contractId: p.contract?.id || '',
        }
      })
    } catch (e) {
      console.error('Error fetching recent payments:', e)
      error.value = e instanceof Error ? e.message : 'Error al cargar pagos recientes'
    }
  }

  /**
   * Fetch contracts expiring in the next 30 days
   */
  async function fetchExpiringContracts() {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetchExpiringContracts')
      return
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    try {
      const { data: contracts, error: fetchError } = await supabase
        .from('contracts')
        .select(`
          id,
          end_date,
          property:properties(
            address_street,
            address_number,
            property_type
          ),
          tenants:contract_tenants(
            role,
            tenant:tenants(
              first_name,
              last_name
            )
          )
        `)
        .eq('organization_id', organizationId.value)
        .eq('status', 'activo')
        .is('deleted_at', null)
        .gte('end_date', today)
        .lte('end_date', thirtyDaysLater)
        .order('end_date', { ascending: true })

      if (fetchError) throw fetchError

      expiringContracts.value = (contracts || []).map((c: {
        id: string
        end_date: string
        property: { address_street: string; address_number: string | null; property_type: string } | null
        tenants: Array<{
          role: string
          tenant: { first_name: string; last_name: string } | null
        }>
      }) => {
        const titular = c.tenants?.find(t => t.role === 'titular')
        const tenantName = titular?.tenant
          ? `${titular.tenant.first_name} ${titular.tenant.last_name}`
          : 'Inquilino desconocido'

        const property = c.property
        const address = property
          ? `${property.address_street} ${property.address_number || ''}`
          : 'Dirección desconocida'

        const endDate = new Date(c.end_date + 'T00:00:00')
        const daysRemaining = Math.ceil(
          (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          id: c.id,
          propertyAddress: address,
          propertyType: property?.property_type || '',
          endDate: c.end_date,
          daysRemaining: Math.max(0, daysRemaining),
          tenantName,
        }
      })
    } catch (e) {
      console.error('Error fetching expiring contracts:', e)
      error.value = e instanceof Error ? e.message : 'Error al cargar contratos por vencer'
    }
  }

  /**
   * Fetch all dashboard data
   */
  async function fetchAllData(chartMonths: number = 6) {
    if (!organizationId.value) {
      console.warn('No organization_id available, skipping fetchAllData')
      return
    }

    loading.value = true
    error.value = null

    try {
      await Promise.all([
        fetchIncomeKPIs(),
        fetchEconomicIndicators(),
        fetchChartData(chartMonths),
        fetchPaymentDistribution(),
        fetchRecentPayments(),
        fetchExpiringContracts(),
      ])
    } catch (e) {
      console.error('Error fetching dashboard data:', e)
      error.value = e instanceof Error ? e.message : 'Error al cargar datos del dashboard'
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    loading,
    error,
    economicLoading,
    economicError,

    // KPIs
    incomeKPIs,

    // Economic indicators
    economicIndicators,

    // Charts data
    incomeChartData,
    paymentDistribution,

    // Activity feeds
    recentPayments,
    expiringContracts,

    // Functions
    formatCurrency,
    formatDate,
    getMonthName,
    getShortMonthName,
    fetchIncomeKPIs,
    fetchEconomicIndicators,
    fetchChartData,
    fetchPaymentDistribution,
    fetchRecentPayments,
    fetchExpiringContracts,
    fetchAllData,
  }
}
