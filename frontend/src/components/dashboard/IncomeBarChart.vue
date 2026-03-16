<template>
  <div class="w-full">
    <!-- Loading state -->
    <div v-if="loading" class="h-64 flex items-center justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!data || data.length === 0" class="h-64 flex items-center justify-center">
      <p class="text-muted-foreground">No hay datos disponibles</p>
    </div>

    <!-- Chart -->
    <div v-else class="h-64">
      <Bar :data="chartData" :options="chartOptions" />
    </div>

    <!-- Legend -->
    <div v-if="!loading && data && data.length > 0" class="flex justify-center gap-6 mt-4">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-sm bg-green-500"></div>
        <span class="text-sm text-muted-foreground">Cobrado</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-sm bg-orange-500"></div>
        <span class="text-sm text-muted-foreground">Pendiente</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Loader2 } from 'lucide-vue-next'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import type { MonthlyIncomeData } from '@/composables/useDashboard'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { formatCurrency } = useFormatCurrency()

const props = withDefaults(defineProps<{
  data: MonthlyIncomeData[]
  loading?: boolean
}>(), {
  loading: false,
})

// Chart configuration
const chartData = computed(() => ({
  labels: props.data.map(d => d.monthLabel),
  datasets: [
    {
      label: 'Cobrado',
      data: props.data.map(d => d.collected),
      backgroundColor: 'rgb(34, 197, 94)', // green-500
      borderRadius: 4,
      barPercentage: 0.8,
      categoryPercentage: 0.7,
    },
    {
      label: 'Pendiente',
      data: props.data.map(d => d.pending),
      backgroundColor: 'rgb(249, 115, 22)', // orange-500
      borderRadius: 4,
      barPercentage: 0.8,
      categoryPercentage: 0.7,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false, // Using custom legend below
    },
    tooltip: {
      callbacks: {
        label: (context: { dataset: { label?: string }; raw: unknown }) => {
          const label = context.dataset.label || ''
          const value = context.raw as number
          return `${label}: ${formatCurrency(value)}`
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: 'rgb(156, 163, 175)', // gray-400
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(156, 163, 175, 0.2)', // gray-400 with opacity
      },
      ticks: {
        color: 'rgb(156, 163, 175)', // gray-400
        callback: (value: number | string) => {
          if (typeof value === 'number') {
            if (value >= 1000000) {
              return `$${(value / 1000000).toFixed(1)}M`
            }
            if (value >= 1000) {
              return `$${(value / 1000).toFixed(0)}K`
            }
            return `$${value}`
          }
          return value
        },
      },
    },
  },
}))
</script>
