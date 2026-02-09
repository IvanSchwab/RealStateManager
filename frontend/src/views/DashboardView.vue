<template>
  <MainLayout>
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold">Dashboard</h1>
          <p class="text-muted-foreground text-sm">
            Resumen de ingresos e indicadores - {{ currentMonthLabel }}
          </p>
        </div>
        <Button
          @click="handleRefresh"
          :disabled="loading"
          variant="outline"
        >
          <RefreshCw class="w-4 h-4 mr-2" :class="{ 'animate-spin': loading }" />
          Actualizar
        </Button>
      </div>

      <!-- Section 1: Income KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Ingresos del Mes"
          :value="formatCurrency(incomeKPIs.currentMonthIncome)"
          icon="income"
          :loading="loading"
        />

        <KPICard
          title="Pendiente de Cobro"
          :value="formatCurrency(incomeKPIs.pendingIncome)"
          icon="pending"
          :loading="loading"
        />

        <KPICard
          title="Pagos Vencidos"
          :value="formatCurrency(incomeKPIs.overdueAmount)"
          icon="overdue"
          :subtitle="`${incomeKPIs.overdueCount} pagos vencidos`"
          :loading="loading"
        />

        <KPICard
          title="vs. Mes Anterior"
          :value="incomeKPIs.previousMonthIncome > 0 ? formatCurrency(incomeKPIs.previousMonthIncome) : '$0'"
          icon="trend"
          :trend="getTrend(incomeKPIs.monthOverMonthChange)"
          :trendValue="formatTrendValue(incomeKPIs.monthOverMonthChange)"
          :loading="loading"
        />
      </div>

      <!-- Section 2: Economic Indicators -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EconomicIndicatorCard
          title="Dólar Blue"
          type="dolar"
          variant="blue"
          :buy-price="economicIndicators.dolarBlue.compra"
          :sell-price="economicIndicators.dolarBlue.venta"
          :last-update="economicIndicators.dolarBlue.fecha"
          :loading="economicLoading"
          :error-message="economicError ?? undefined"
        />

        <EconomicIndicatorCard
          title="Dólar Oficial"
          type="dolar"
          variant="oficial"
          :buy-price="economicIndicators.dolarOficial.compra"
          :sell-price="economicIndicators.dolarOficial.venta"
          :last-update="economicIndicators.dolarOficial.fecha"
          :loading="economicLoading"
          :error-message="economicError ?? undefined"
        />

        <EconomicIndicatorCard
          title="Inflación Mensual (IPC)"
          type="inflacion"
          :value="economicIndicators.inflacion.valor"
          :period="economicIndicators.inflacion.mes"
          :loading="economicLoading"
          :error-message="economicError ?? undefined"
        />
      </div>

      <!-- Section 3: Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Bar Chart: Income Last N Months -->
        <Card>
          <CardHeader class="pb-2">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <CardTitle class="text-lg">Ingresos por Mes</CardTitle>
              <div class="flex gap-1">
                <Button
                  v-for="option in chartPeriodOptions"
                  :key="option.value"
                  :variant="chartPeriod === option.value ? 'default' : 'ghost'"
                  size="sm"
                  @click="handlePeriodChange(option.value)"
                >
                  {{ option.label }}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <IncomeBarChart :data="incomeChartData" :loading="loading" />
          </CardContent>
        </Card>

        <!-- Donut Chart: Payment Distribution -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-lg">Distribución de Pagos - {{ currentMonthLabel }}</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentDistributionChart :data="paymentDistribution" :loading="loading" />
          </CardContent>
        </Card>
      </div>

      <!-- Section 4: Recent Activity -->
      <RecentActivityFeed
        :payments="recentPayments"
        :contracts="expiringContracts"
        :loading="loading"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MainLayout from '@/components/layout/MainLayout.vue'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { RefreshCw } from 'lucide-vue-next'

// Dashboard components
import KPICard from '@/components/dashboard/KPICard.vue'
import EconomicIndicatorCard from '@/components/dashboard/EconomicIndicatorCard.vue'
import IncomeBarChart from '@/components/dashboard/IncomeBarChart.vue'
import PaymentDistributionChart from '@/components/dashboard/PaymentDistributionChart.vue'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed.vue'

// Composable
import { useDashboard } from '@/composables/useDashboard'

const {
  loading,
  economicLoading,
  economicError,
  incomeKPIs,
  economicIndicators,
  incomeChartData,
  paymentDistribution,
  recentPayments,
  expiringContracts,
  formatCurrency,
  getMonthName,
  fetchAllData,
  fetchChartData,
} = useDashboard()

// Chart period state
const chartPeriod = ref(6)
const chartPeriodOptions = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
]

// Current month label
const currentMonthLabel = computed(() => {
  const now = new Date()
  return `${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`
})

// Determine trend direction
function getTrend(change: number): 'up' | 'down' | 'neutral' {
  if (change > 0) return 'up'
  if (change < 0) return 'down'
  return 'neutral'
}

// Format trend value with sign
function formatTrendValue(change: number): string {
  if (change > 0) return `+${change}%`
  if (change < 0) return `${change}%`
  return '0%'
}

// Handle period change for chart
async function handlePeriodChange(months: number) {
  chartPeriod.value = months
  await fetchChartData(months)
}

// Handle refresh
async function handleRefresh() {
  await fetchAllData(chartPeriod.value)
}

// Fetch data on mount
onMounted(() => {
  fetchAllData(chartPeriod.value)
})
</script>
