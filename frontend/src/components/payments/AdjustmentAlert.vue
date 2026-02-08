<template>
  <div
    v-if="showAlert"
    class="flex items-center justify-between p-4 mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
  >
    <div class="flex items-center gap-3">
      <AlertTriangle class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
      <div>
        <p class="font-medium text-yellow-800 dark:text-yellow-200">
          Ajuste de alquiler disponible
        </p>
        <p class="text-sm text-yellow-700 dark:text-yellow-300">
          {{ adjustmentTypeLabel }} - {{ adjustmentPeriodLabel }}
          <span v-if="monthsSinceLastAdjustment" class="ml-1">
            ({{ monthsSinceLastAdjustment }} meses desde el último ajuste)
          </span>
        </p>
      </div>
    </div>
    <div class="flex items-center gap-2 flex-shrink-0">
      <Button
        variant="outline"
        size="sm"
        class="border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
        @click="handlePostpone"
      >
        Posponer
      </Button>
      <Button
        size="sm"
        class="bg-yellow-600 hover:bg-yellow-700 text-white"
        @click="handleApply"
      >
        Aplicar Ajuste
      </Button>
    </div>
  </div>

  <!-- Adjustment Dialog -->
  <RentAdjustmentDialog
    v-model:open="showAdjustmentDialog"
    :contract-id="contract.id"
    :current-amount="contract.current_rent_amount"
    @success="$emit('adjusted')"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-vue-next'
import RentAdjustmentDialog from './RentAdjustmentDialog.vue'
import type { Contract, AdjustmentPeriod, AdjustmentType } from '@/types'

const props = defineProps<{
  contract: Contract
}>()

const emit = defineEmits<{
  (e: 'adjusted'): void
}>()

const showAdjustmentDialog = ref(false)
const postponed = ref(false)

// Computed
const showAlert = computed(() => {
  if (postponed.value) return false
  if (props.contract.adjustment_type === 'ninguno') return false
  if (!props.contract.next_adjustment_date) return false
  if (props.contract.status !== 'activo') return false
  if (props.contract.deleted_at) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const nextAdjustment = new Date(props.contract.next_adjustment_date)
  nextAdjustment.setHours(0, 0, 0, 0)

  // Show alert if adjustment date has passed or is today
  return nextAdjustment <= today
})

const adjustmentTypeLabel = computed(() => {
  const labels: Record<AdjustmentType, string> = {
    ICL: 'ICL (Índice de Contratos de Locación)',
    IPC: 'IPC (Índice de Precios al Consumidor)',
    fijo: 'Porcentaje Fijo',
    ninguno: 'Sin ajuste',
  }
  return labels[props.contract.adjustment_type as AdjustmentType] || props.contract.adjustment_type
})

const adjustmentPeriodLabel = computed(() => {
  const labels: Record<AdjustmentPeriod, string> = {
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  }
  return labels[props.contract.adjustment_period as AdjustmentPeriod] || ''
})

const monthsSinceLastAdjustment = computed(() => {
  if (!props.contract.last_adjustment_date) return null

  const lastAdjustment = new Date(props.contract.last_adjustment_date)
  const today = new Date()

  const months = (today.getFullYear() - lastAdjustment.getFullYear()) * 12
    + (today.getMonth() - lastAdjustment.getMonth())

  return months
})

// Methods
function handleApply() {
  showAdjustmentDialog.value = true
}

function handlePostpone() {
  // Postpone for this session only
  postponed.value = true
}
</script>
