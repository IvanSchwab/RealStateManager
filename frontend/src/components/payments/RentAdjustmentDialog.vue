<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Aplicar Ajuste de Alquiler</DialogTitle>
        <DialogDescription>
          El ajuste se aplicará a todos los pagos pendientes a partir de la fecha efectiva.
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Current Amount -->
        <div class="p-4 bg-muted/50 rounded-lg">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Alquiler Actual</span>
            <span class="font-semibold">{{ formatCurrency(currentAmount) }}</span>
          </div>
        </div>

        <!-- Adjustment Type Selection -->
        <div class="space-y-2">
          <Label>Tipo de Ajuste</Label>
          <div class="grid grid-cols-2 gap-2">
            <Button
              type="button"
              :variant="adjustmentMethod === 'percentage' ? 'default' : 'outline'"
              class="w-full"
              @click="adjustmentMethod = 'percentage'"
            >
              <Percent class="w-4 h-4 mr-2" />
              Porcentaje
            </Button>
            <Button
              type="button"
              :variant="adjustmentMethod === 'fixed' ? 'default' : 'outline'"
              class="w-full"
              @click="adjustmentMethod = 'fixed'"
            >
              <DollarSign class="w-4 h-4 mr-2" />
              Monto Fijo
            </Button>
          </div>
        </div>

        <!-- Percentage Input -->
        <div v-if="adjustmentMethod === 'percentage'" class="space-y-2">
          <Label for="percentage">Porcentaje de Aumento (%)</Label>
          <div class="flex gap-2">
            <Input
              id="percentage"
              v-model.number="form.percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              class="flex-1"
              @input="calculateFromPercentage"
            />
            <span class="flex items-center text-muted-foreground">%</span>
          </div>
        </div>

        <!-- New Amount -->
        <div class="space-y-2">
          <Label for="new_amount">Nuevo Monto de Alquiler</Label>
          <Input
            id="new_amount"
            v-model.number="form.new_amount"
            type="number"
            min="0"
            step="100"
            :disabled="adjustmentMethod === 'percentage'"
            @input="calculatePercentage"
          />
          <p v-if="form.new_amount > 0" class="text-xs text-muted-foreground">
            Diferencia: {{ formatCurrency(form.new_amount - currentAmount) }}
            ({{ ((form.new_amount - currentAmount) / currentAmount * 100).toFixed(2) }}%)
          </p>
        </div>

        <!-- Effective Date -->
        <div class="space-y-2">
          <Label for="effective_date">Fecha Efectiva</Label>
          <Input
            id="effective_date"
            v-model="form.effective_date"
            type="date"
            :min="minEffectiveDate"
          />
          <p class="text-xs text-muted-foreground">
            El ajuste se aplicará a pagos con vencimiento desde esta fecha.
          </p>
        </div>

        <!-- Preview -->
        <div v-if="affectedPaymentsCount > 0" class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            <AlertTriangle class="w-4 h-4 inline mr-1" />
            Se actualizarán <strong>{{ affectedPaymentsCount }}</strong> pagos pendientes.
          </p>
        </div>

        <!-- Notes -->
        <div class="space-y-2">
          <Label for="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            v-model="form.notes"
            placeholder="Ej: Ajuste trimestral ICL abril 2026"
            rows="2"
          />
        </div>

        <!-- Error Message -->
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="$emit('update:open', false)">
            Cancelar
          </Button>
          <Button type="submit" :disabled="!canSubmit || submitting">
            <Loader2 v-if="submitting" class="w-4 h-4 mr-2 animate-spin" />
            Aplicar Ajuste
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Percent, DollarSign, AlertTriangle } from 'lucide-vue-next'
import { usePayments } from '@/composables/usePayments'
import { supabase } from '@/lib/supabase'

const props = defineProps<{
  open: boolean
  contractId: string
  currentAmount: number
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const { applyRentAdjustment, formatCurrency, error } = usePayments()

const submitting = ref(false)
const affectedPaymentsCount = ref(0)
const adjustmentMethod = ref<'percentage' | 'fixed'>('percentage')

// Form state
const form = ref({
  new_amount: props.currentAmount,
  percentage: 0,
  effective_date: new Date().toISOString().split('T')[0],
  notes: '',
})

// Computed
const minEffectiveDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const canSubmit = computed(() => {
  return (
    form.value.new_amount > 0 &&
    form.value.new_amount !== props.currentAmount &&
    form.value.effective_date
  )
})

// Watch for changes to calculate affected payments
watch([() => form.value.effective_date, () => props.open], async ([date, isOpen]) => {
  if (isOpen && date && props.contractId) {
    await calculateAffectedPayments()
  }
})

// Watch for dialog open
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    // Reset form
    form.value = {
      new_amount: props.currentAmount,
      percentage: 0,
      effective_date: new Date().toISOString().split('T')[0],
      notes: '',
    }
    calculateAffectedPayments()
  }
})

// Methods
function calculateFromPercentage() {
  if (adjustmentMethod.value === 'percentage') {
    form.value.new_amount = Math.round(props.currentAmount * (1 + form.value.percentage / 100))
  }
}

function calculatePercentage() {
  if (adjustmentMethod.value === 'fixed' && form.value.new_amount > 0) {
    form.value.percentage = ((form.value.new_amount - props.currentAmount) / props.currentAmount) * 100
  }
}

async function calculateAffectedPayments() {
  try {
    const { count, error: countError } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('contract_id', props.contractId)
      .eq('status', 'pendiente')
      .gte('due_date', form.value.effective_date)

    if (countError) throw countError
    affectedPaymentsCount.value = count || 0
  } catch (e) {
    console.error('Error calculating affected payments:', e)
    affectedPaymentsCount.value = 0
  }
}

async function handleSubmit() {
  if (!canSubmit.value) return

  submitting.value = true

  try {
    await applyRentAdjustment(
      props.contractId,
      form.value.new_amount,
      form.value.effective_date,
      form.value.percentage || undefined,
      form.value.notes || undefined
    )

    emit('update:open', false)
    emit('success')
  } catch (e) {
    console.error('Error applying adjustment:', e)
  } finally {
    submitting.value = false
  }
}
</script>
