<template>
  <Card>
    <CardContent class="p-4">
      <!-- Loading state -->
      <div v-if="loading" class="space-y-3">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 bg-muted animate-pulse rounded"></div>
          <div class="h-5 w-24 bg-muted animate-pulse rounded"></div>
        </div>
        <div class="h-8 w-full bg-muted animate-pulse rounded"></div>
        <div class="h-3 w-32 bg-muted animate-pulse rounded"></div>
      </div>

      <!-- Error state -->
      <div v-else-if="errorMessage" class="space-y-2">
        <div class="flex items-center gap-2">
          <component :is="iconComponent" class="w-5 h-5 text-muted-foreground" />
          <span class="font-medium text-muted-foreground">{{ title }}</span>
        </div>
        <p class="text-sm text-muted-foreground">{{ errorMessage }}</p>
      </div>

      <!-- Content - Dollar type -->
      <div v-else-if="type === 'dolar'" class="space-y-2">
        <div class="flex items-center gap-2">
          <DollarSign class="w-5 h-5" :class="iconClass" />
          <span class="font-medium">{{ title }}</span>
        </div>

        <div class="flex items-center gap-4">
          <div>
            <span class="text-xs text-muted-foreground">{{ $t('dashboard.buy') }}</span>
            <p class="text-lg font-bold">{{ formatPrice(buyPrice) }}</p>
          </div>
          <div class="h-8 w-px bg-border"></div>
          <div>
            <span class="text-xs text-muted-foreground">{{ $t('dashboard.sell') }}</span>
            <p class="text-lg font-bold">{{ formatPrice(sellPrice) }}</p>
          </div>
        </div>

        <p class="text-xs text-muted-foreground">
          {{ formattedLastUpdate }}
        </p>
      </div>

      <!-- Content - Inflation type -->
      <div v-else-if="type === 'inflacion'" class="space-y-2">
        <div class="flex items-center gap-2">
          <TrendingUp class="w-5 h-5" :class="iconClass" />
          <span class="font-medium">{{ title }}</span>
        </div>

        <p class="text-2xl font-bold">
          {{ value !== undefined && value > 0 ? `${value.toFixed(1)}%` : $t('dashboard.notAvailable') }}
        </p>

        <p class="text-xs text-muted-foreground">
          {{ period || $t('dashboard.noData') }}
        </p>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, TrendingUp } from 'lucide-vue-next'

const { t } = useI18n()

type IndicatorType = 'dolar' | 'inflacion'
type VariantType = 'blue' | 'oficial' | 'default'

const props = withDefaults(defineProps<{
  title: string
  type: IndicatorType
  variant?: VariantType
  buyPrice?: number
  sellPrice?: number
  value?: number
  period?: string
  lastUpdate?: string
  loading?: boolean
  errorMessage?: string
}>(), {
  variant: 'default',
  loading: false,
})

// Format price for display
function formatPrice(price: number | undefined): string {
  if (price === undefined || price === 0) return '$--'
  return `$${price.toLocaleString('es-AR')}`
}

// Format last update time
const formattedLastUpdate = computed(() => {
  if (!props.lastUpdate) return t('dashboard.noUpdate')

  try {
    const date = new Date(props.lastUpdate)
    const formattedDate = date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const formattedTime = date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${t('dashboard.updated')}: ${formattedDate} ${formattedTime}`
  } catch {
    return t('dashboard.noUpdate')
  }
})

// Icon styling based on variant
const iconComponent = computed(() => {
  return props.type === 'dolar' ? DollarSign : TrendingUp
})

const iconClass = computed(() => {
  switch (props.variant) {
    case 'blue':
      return 'text-blue-500'
    case 'oficial':
      return 'text-green-500'
    default:
      return 'text-orange-500'
  }
})
</script>
