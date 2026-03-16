<template>
  <div class="w-full">
    <!-- Loading state -->
    <div v-if="loading" class="h-64 flex items-center justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Empty state -->
    <div v-else-if="totalAmount === 0" class="h-64 flex items-center justify-center">
      <p class="text-muted-foreground">No hay pagos para este mes</p>
    </div>

    <!-- Chart -->
    <div v-else class="flex flex-col items-center">
      <div class="h-52 w-52">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>

      <!-- Legend with amounts -->
      <div class="flex flex-col gap-2 mt-4 w-full max-w-xs">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <span class="text-sm">Cobrados</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-medium">{{ formatCurrency(data.paid) }}</span>
            <span class="text-xs text-muted-foreground ml-1">({{ data.paidCount }})</span>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-orange-500"></div>
            <span class="text-sm">Pendientes</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-medium">{{ formatCurrency(data.pending) }}</span>
            <span class="text-xs text-muted-foreground ml-1">({{ data.pendingCount }})</span>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full bg-red-500"></div>
            <span class="text-sm">Vencidos</span>
          </div>
          <div class="text-right">
            <span class="text-sm font-medium">{{ formatCurrency(data.overdue) }}</span>
            <span class="text-xs text-muted-foreground ml-1">({{ data.overdueCount }})</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Loader2 } from 'lucide-vue-next'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import type { PaymentDistribution } from '@/composables/useDashboard'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend)

const { formatCurrency } = useFormatCurrency()

const props = withDefaults(defineProps<{
  data: PaymentDistribution
  loading?: boolean
}>(), {
  loading: false,
})

// Calculate total amount
const totalAmount = computed(() => {
  return props.data.paid + props.data.pending + props.data.overdue
})

// Chart configuration
const chartData = computed(() => ({
  labels: ['Cobrados', 'Pendientes', 'Vencidos'],
  datasets: [
    {
      data: [props.data.paid, props.data.pending, props.data.overdue],
      backgroundColor: [
        'rgb(34, 197, 94)', // green-500
        'rgb(249, 115, 22)', // orange-500
        'rgb(239, 68, 68)', // red-500
      ],
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: true,
  cutout: '65%',
  plugins: {
    legend: {
      display: false, // Using custom legend below
    },
    tooltip: {
      callbacks: {
        label: (context: { label?: string; raw: unknown }) => {
          const label = context.label || ''
          const value = context.raw as number
          const percentage = totalAmount.value > 0
            ? ((value / totalAmount.value) * 100).toFixed(1)
            : '0'
          return `${label}: ${formatCurrency(value)} (${percentage}%)`
        },
      },
    },
  },
}))
</script>
