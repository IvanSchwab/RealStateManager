<template>
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

      <!-- Section 2: Economic Indicators + Adjustments -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <!-- Adjustment Notification Card -->
        <AdjustmentNotificationCard
          :applied-count="adjustmentCounts.applied"
          :estimated-count="adjustmentCounts.estimated"
          :pending-count="adjustmentCounts.pending"
          :processing="adjustmentsLoading"
          :loading="loading"
          @process-adjustments="handleProcessAdjustments"
          @view-estimated="handleViewEstimated"
          @view-history="handleViewHistory"
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

    <!-- Adjustment Correction Dialog -->
    <AdjustmentCorrectionDialog
      v-model:open="showCorrectionDialog"
      :adjustment="selectedEstimatedAdjustment"
      :official-percentage="officialInflationPercentage"
      :loading="adjustmentsLoading"
      @apply-correction="handleApplyCorrection"
      @keep-estimated="handleKeepEstimated"
    />

    <!-- Adjustment History Dialog -->
    <Dialog v-model:open="showHistoryDialog">
      <DialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
        <AdjustmentHistoryList
          :adjustments="adjustmentHistoryList"
          :loading="adjustmentsLoading"
        />
      </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { RefreshCw } from 'lucide-vue-next'

// Dashboard components
import KPICard from '@/components/dashboard/KPICard.vue'
import EconomicIndicatorCard from '@/components/dashboard/EconomicIndicatorCard.vue'
import IncomeBarChart from '@/components/dashboard/IncomeBarChart.vue'
import PaymentDistributionChart from '@/components/dashboard/PaymentDistributionChart.vue'
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed.vue'

// Adjustment components
import {
  AdjustmentNotificationCard,
  AdjustmentCorrectionDialog,
  AdjustmentHistoryList,
} from '@/components/adjustments'

// Composables
import { useDashboard } from '@/composables/useDashboard'
import { useAutomaticAdjustments } from '@/composables/useAutomaticAdjustments'
import { useInflationData } from '@/composables/useInflationData'
import type { AdjustmentHistory } from '@/types'

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

const {
  loading: adjustmentsLoading,
  processAutomaticAdjustments,
  getAdjustmentCounts,
  getEstimatedAdjustments,
  correctEstimatedAdjustment,
  keepEstimatedAdjustment,
  getAdjustmentHistory,
  shouldProcessAutomatically,
} = useAutomaticAdjustments()

const { getLatestInflation } = useInflationData()

// Chart period state
const chartPeriod = ref(6)
const chartPeriodOptions = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
]

// Adjustment state
const adjustmentCounts = ref({ applied: 0, estimated: 0, pending: 0 })
const showCorrectionDialog = ref(false)
const showHistoryDialog = ref(false)
const selectedEstimatedAdjustment = ref<AdjustmentHistory | null>(null)
const estimatedAdjustmentsList = ref<AdjustmentHistory[]>([])
const adjustmentHistoryList = ref<AdjustmentHistory[]>([])
const officialInflationPercentage = ref(0)

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
  await Promise.all([
    fetchAllData(chartPeriod.value),
    refreshAdjustmentCounts(),
  ])
}

// Refresh adjustment counts
async function refreshAdjustmentCounts() {
  try {
    adjustmentCounts.value = await getAdjustmentCounts()
  } catch (err) {
    console.error('Error fetching adjustment counts:', err)
  }
}

// Handle processing automatic adjustments
async function handleProcessAdjustments() {
  try {
    const results = await processAutomaticAdjustments()
    await refreshAdjustmentCounts()

    if (results.length > 0) {
      console.log(`Ajustes aplicados: ${results.length}`)
      // Refresh dashboard data to reflect new amounts
      await fetchAllData(chartPeriod.value)
    }
  } catch (err) {
    console.error('Error procesando ajustes:', err)
  }
}

// Handle viewing estimated adjustments
async function handleViewEstimated() {
  try {
    estimatedAdjustmentsList.value = await getEstimatedAdjustments()

    if (estimatedAdjustmentsList.value.length > 0) {
      selectedEstimatedAdjustment.value = estimatedAdjustmentsList.value[0]

      // Try to get official inflation for the adjustment type
      const indexType = selectedEstimatedAdjustment.value.adjustment_type as 'IPC' | 'ICL'
      const latestInflation = await getLatestInflation(indexType)
      officialInflationPercentage.value = latestInflation?.valor || 3.0

      showCorrectionDialog.value = true
    }
  } catch (err) {
    console.error('Error fetching estimated adjustments:', err)
  }
}

// Handle viewing adjustment history
async function handleViewHistory() {
  try {
    adjustmentHistoryList.value = await getAdjustmentHistory(20)
    showHistoryDialog.value = true
  } catch (err) {
    console.error('Error fetching adjustment history:', err)
  }
}

// Handle applying correction to estimated adjustment
async function handleApplyCorrection(adjustmentId: string, percentage: number) {
  try {
    await correctEstimatedAdjustment(adjustmentId, percentage)
    showCorrectionDialog.value = false
    await refreshAdjustmentCounts()
    await fetchAllData(chartPeriod.value)

    // Check if there are more estimated adjustments
    estimatedAdjustmentsList.value = await getEstimatedAdjustments()
    if (estimatedAdjustmentsList.value.length > 0) {
      selectedEstimatedAdjustment.value = estimatedAdjustmentsList.value[0]
      showCorrectionDialog.value = true
    }
  } catch (err) {
    console.error('Error aplicando corrección:', err)
  }
}

// Handle keeping estimated adjustment as-is
async function handleKeepEstimated(adjustmentId: string) {
  try {
    await keepEstimatedAdjustment(adjustmentId)
    showCorrectionDialog.value = false
    await refreshAdjustmentCounts()

    // Check if there are more estimated adjustments
    estimatedAdjustmentsList.value = await getEstimatedAdjustments()
    if (estimatedAdjustmentsList.value.length > 0) {
      selectedEstimatedAdjustment.value = estimatedAdjustmentsList.value[0]
      showCorrectionDialog.value = true
    }
  } catch (err) {
    console.error('Error confirmando ajuste:', err)
  }
}

// Fetch data on mount
onMounted(async () => {
  await fetchAllData(chartPeriod.value)
  await refreshAdjustmentCounts()

  // Auto-process adjustments if we're in day 1-5 of the month
  if (shouldProcessAutomatically() && adjustmentCounts.value.pending > 0) {
    // Optional: uncomment to auto-process
    // await handleProcessAdjustments()
  }
})
</script>
