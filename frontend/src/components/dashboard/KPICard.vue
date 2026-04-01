<template>
  <Card class="relative overflow-hidden">
    <CardContent class="p-4">
      <!-- Loading state -->
      <div v-if="loading" class="flex items-center gap-3">
        <div class="p-2 rounded-md bg-muted animate-pulse">
          <div class="w-5 h-5"></div>
        </div>
        <div class="flex-1">
          <div class="h-4 w-24 bg-muted animate-pulse rounded mb-2"></div>
          <div class="h-8 w-32 bg-muted animate-pulse rounded"></div>
        </div>
      </div>

      <!-- Content -->
      <div v-else class="flex items-center gap-3">
        <div
          class="p-2 rounded-md"
          :class="iconBgClass"
        >
          <component :is="iconComponent" class="w-5 h-5" :class="iconClass" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-muted-foreground truncate">{{ title }}</p>
          <p class="text-2xl font-bold truncate">{{ displayValue }}</p>
          <p v-if="subtitle" class="text-xs text-muted-foreground truncate">
            {{ subtitle }}
          </p>
        </div>

        <!-- Trend indicator -->
        <div
          v-if="showTrend"
          class="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium"
          :class="trendClass"
        >
          <TrendingUp v-if="trend === 'up'" class="w-4 h-4" />
          <TrendingDown v-if="trend === 'down'" class="w-4 h-4" />
          <Minus v-if="trend === 'neutral'" class="w-4 h-4" />
          <span>{{ trendValue }}</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-vue-next'

type TrendType = 'up' | 'down' | 'neutral'
type IconType = 'income' | 'pending' | 'overdue' | 'trend'

const props = withDefaults(defineProps<{
  title: string
  value: string | number
  icon?: IconType
  trend?: TrendType
  trendValue?: string
  subtitle?: string
  loading?: boolean
}>(), {
  loading: false,
})

// Computed display value
const displayValue = computed(() => {
  if (typeof props.value === 'number') {
    return props.value.toString()
  }
  return props.value
})

// Determine if trend should be shown
const showTrend = computed(() => {
  return props.trend !== undefined && props.trendValue !== undefined
})

// Icon configuration based on icon type
const iconComponent = computed<Component>(() => {
  switch (props.icon) {
    case 'income':
      return DollarSign
    case 'pending':
      return Clock
    case 'overdue':
      return AlertTriangle
    case 'trend':
      return TrendingUp
    default:
      return DollarSign
  }
})

const iconBgClass = computed(() => {
  switch (props.icon) {
    case 'income':
      return 'bg-green-500/10'
    case 'pending':
      return 'bg-orange-500/10'
    case 'overdue':
      return 'bg-red-500/10'
    case 'trend':
      return 'bg-blue-500/10'
    default:
      return 'bg-primary/10'
  }
})

const iconClass = computed(() => {
  switch (props.icon) {
    case 'income':
      return 'text-green-500'
    case 'pending':
      return 'text-orange-500'
    case 'overdue':
      return 'text-red-500'
    case 'trend':
      return 'text-blue-500'
    default:
      return 'text-primary'
  }
})

// Trend styling
const trendClass = computed(() => {
  switch (props.trend) {
    case 'up':
      return 'bg-green-500/10 text-green-600'
    case 'down':
      return 'bg-red-500/10 text-red-600'
    case 'neutral':
      return 'bg-gray-500/10 text-gray-600'
    default:
      return ''
  }
})
</script>
