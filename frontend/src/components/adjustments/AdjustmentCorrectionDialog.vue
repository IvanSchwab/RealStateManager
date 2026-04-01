<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Corregir Ajuste Estimado</DialogTitle>
        <DialogDescription>
          El IPC oficial ya está disponible. Podés corregir el ajuste estimado con los datos oficiales.
        </DialogDescription>
      </DialogHeader>

      <div v-if="adjustment" class="space-y-4">
        <!-- Contract info -->
        <div class="rounded-lg border p-4">
          <h4 class="font-medium mb-2">Contrato</h4>
          <p class="text-sm text-muted-foreground">
            {{ getPropertyAddress(adjustment.contract?.property) }}
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            Período: {{ adjustment.inflation_period || 'N/A' }}
          </p>
        </div>

        <!-- Estimated vs Official comparison -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Estimated adjustment (applied) -->
          <div class="rounded-lg border p-4 bg-orange-50 dark:bg-orange-900/20">
            <p class="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">
              Ajuste Estimado Aplicado
            </p>
            <p class="text-lg font-bold">
              +{{ (adjustment.index_value_used || 0).toFixed(2) }}%
            </p>
            <p class="text-sm text-muted-foreground mt-1">
              {{ formatCurrency(adjustment.previous_amount) }} →
              {{ formatCurrency(adjustment.new_amount) }}
            </p>
          </div>

          <!-- Official adjustment (to be applied) -->
          <div class="rounded-lg border p-4 bg-green-50 dark:bg-green-900/20">
            <p class="text-xs font-medium text-green-600 dark:text-green-400 mb-2">
              Ajuste Oficial Sugerido
            </p>
            <p class="text-lg font-bold">
              +{{ officialPercentage.toFixed(2) }}%
            </p>
            <p class="text-sm text-muted-foreground mt-1">
              {{ formatCurrency(adjustment.previous_amount) }} →
              {{ formatCurrency(suggestedAmount) }}
            </p>
          </div>
        </div>

        <!-- Manual override option -->
        <div class="space-y-2">
          <Label for="manual-percentage">Porcentaje de Ajuste (opcional)</Label>
          <Input
            id="manual-percentage"
            v-model.number="manualPercentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="Ingresá un porcentaje personalizado"
          />
          <p class="text-xs text-muted-foreground">
            Dejá vacío para usar el ajuste oficial sugerido
          </p>
        </div>

        <!-- Preview of correction -->
        <div class="rounded-lg bg-muted p-4">
          <p class="text-sm font-medium mb-1">Vista previa de corrección:</p>
          <p class="text-2xl font-bold">
            {{ formatCurrency(finalAmount) }}
          </p>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-xs text-muted-foreground">
              Diferencia: {{ formatCurrency(amountDifference) }}
            </span>
            <Badge
              :variant="amountDifference >= 0 ? 'default' : 'destructive'"
              class="text-xs"
            >
              {{ percentageDifference >= 0 ? '+' : '' }}{{ percentageDifference.toFixed(2) }}%
            </Badge>
          </div>
        </div>
      </div>

      <DialogFooter class="flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          @click="$emit('update:open', false)"
          :disabled="loading"
        >
          Cancelar
        </Button>
        <Button
          variant="secondary"
          @click="handleKeepEstimated"
          :disabled="loading"
        >
          Mantener Estimado
        </Button>
        <Button
          @click="handleApplyCorrection"
          :disabled="loading"
        >
          <Check class="h-4 w-4 mr-2" />
          Aplicar Corrección
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-vue-next'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import type { AdjustmentHistory, Property } from '@/types'

const props = defineProps<{
  open: boolean
  adjustment: AdjustmentHistory | null
  officialPercentage: number
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'apply-correction': [adjustmentId: string, percentage: number]
  'keep-estimated': [adjustmentId: string]
}>()

const { formatCurrency } = useFormatCurrency()

const manualPercentage = ref<number | undefined>(undefined)

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

// Calculated suggested amount using official percentage
const suggestedAmount = computed(() => {
  if (!props.adjustment) return 0
  return Math.round(
    props.adjustment.previous_amount * (1 + props.officialPercentage / 100)
  )
})

// Final amount based on manual override or official percentage
const finalAmount = computed(() => {
  if (!props.adjustment) return 0
  const percentage = manualPercentage.value ?? props.officialPercentage
  return Math.round(
    props.adjustment.previous_amount * (1 + percentage / 100)
  )
})

// Difference from currently applied amount
const amountDifference = computed(() => {
  if (!props.adjustment) return 0
  return finalAmount.value - props.adjustment.new_amount
})

// Percentage difference from currently applied
const percentageDifference = computed(() => {
  if (!props.adjustment || props.adjustment.new_amount === 0) return 0
  return ((finalAmount.value - props.adjustment.new_amount) / props.adjustment.new_amount) * 100
})

// Handle apply correction
function handleApplyCorrection() {
  if (!props.adjustment) return
  const percentage = manualPercentage.value ?? props.officialPercentage
  emit('apply-correction', props.adjustment.id, percentage)
}

// Handle keep estimated
function handleKeepEstimated() {
  if (!props.adjustment) return
  emit('keep-estimated', props.adjustment.id)
}

// Reset manual percentage when dialog opens with new adjustment
watch(
  () => props.open,
  (newVal) => {
    if (newVal) {
      manualPercentage.value = undefined
    }
  }
)
</script>
