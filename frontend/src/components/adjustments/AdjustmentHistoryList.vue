<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">Historial de Ajustes</CardTitle>
      <CardDescription>
        Todos los ajustes aplicados a contratos activos
      </CardDescription>
    </CardHeader>
    <CardContent>
      <!-- Loading state -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="rounded-lg border p-4 animate-pulse">
          <div class="h-4 w-48 bg-muted rounded mb-2" />
          <div class="h-3 w-32 bg-muted rounded mb-2" />
          <div class="flex gap-4">
            <div class="h-4 w-24 bg-muted rounded" />
            <div class="h-4 w-24 bg-muted rounded" />
          </div>
        </div>
      </div>

      <!-- Adjustment list -->
      <div v-else class="space-y-3">
        <div
          v-for="adj in adjustments"
          :key="adj.id"
          class="flex flex-col sm:flex-row sm:items-start justify-between rounded-lg border p-4 gap-3"
        >
          <!-- Main content -->
          <div class="flex-1 min-w-0">
            <!-- Property address and badges -->
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <p class="font-medium truncate">
                {{ getPropertyAddress(adj.contract?.property) }}
              </p>
              <Badge v-if="adj.is_estimated && !adj.corrected_by_id" variant="secondary">
                Estimado
              </Badge>
              <Badge v-if="adj.corrected_by_id" variant="outline">
                Corregido
              </Badge>
              <Badge variant="outline" class="uppercase text-xs">
                {{ adj.adjustment_type }}
              </Badge>
            </div>

            <!-- Date and period -->
            <p class="text-sm text-muted-foreground">
              {{ formatDate(adj.executed_at) }}
              <span v-if="adj.inflation_period" class="mx-1">·</span>
              <span v-if="adj.inflation_period">{{ adj.inflation_period }}</span>
            </p>

            <!-- Amount change -->
            <div class="flex flex-wrap items-center gap-3 mt-2">
              <div class="text-sm">
                <span class="text-muted-foreground">Anterior:</span>
                <span class="font-medium ml-1">
                  {{ formatCurrency(adj.previous_amount) }}
                </span>
              </div>
              <ArrowRight class="h-4 w-4 text-muted-foreground hidden sm:block" />
              <div class="text-sm">
                <span class="text-muted-foreground">Nuevo:</span>
                <span class="font-medium ml-1">
                  {{ formatCurrency(adj.new_amount) }}
                </span>
              </div>
            </div>

            <!-- Notes -->
            <p v-if="adj.notes" class="text-xs text-muted-foreground mt-2 italic">
              {{ adj.notes }}
            </p>
          </div>

          <!-- Percentage display -->
          <div class="text-left sm:text-right shrink-0">
            <p class="text-lg font-bold text-green-600 dark:text-green-400">
              +{{ (adj.index_value_used || 0).toFixed(2) }}%
            </p>
            <p class="text-xs text-muted-foreground mt-1">
              {{ adj.source === 'automatico' ? 'Automático' : 'Manual' }}
            </p>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="adjustments.length === 0" class="text-center py-8">
          <TrendingUp class="h-12 w-12 text-muted-foreground/50 mx-auto mb-2" />
          <p class="text-sm text-muted-foreground">
            No hay ajustes registrados
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, TrendingUp } from 'lucide-vue-next'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import type { AdjustmentHistory, Property } from '@/types'

defineProps<{
  adjustments: AdjustmentHistory[]
  loading?: boolean
}>()

const { formatCurrency } = useFormatCurrency()

// Get property address from nested relation
function getPropertyAddress(property: Property | undefined): string {
  if (!property) return 'Propiedad desconocida'
  const parts = [
    property.address_street,
    property.address_number,
    property.address_floor ? `Piso ${property.address_floor}` : null,
    property.address_apartment ? `Depto ${property.address_apartment}` : null,
  ].filter(Boolean)
  return parts.join(' ')
}

// Format date in Argentine locale
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
</script>
