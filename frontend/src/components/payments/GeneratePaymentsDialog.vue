<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Generar Pagos</DialogTitle>
        <DialogDescription>
          Se generarán pagos mensuales para todo el período del contrato.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <!-- Contract Info -->
        <div class="p-4 bg-muted/50 rounded-lg space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Período:</span>
            <span class="font-medium">
              {{ formatDate(contract.start_date) }} - {{ formatDate(contract.end_date) }}
            </span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Alquiler mensual:</span>
            <span class="font-medium">{{ formatCurrency(contract.current_rent_amount) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Pagos a generar:</span>
            <span class="font-medium">{{ monthsCount }} meses</span>
          </div>
        </div>

        <!-- Recurring Concepts -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <Label>Conceptos recurrentes (opcional)</Label>
            <Button
              v-if="recurringConcepts.length < 5"
              variant="ghost"
              size="sm"
              @click="addConcept"
            >
              <Plus class="w-4 h-4 mr-1" />
              Agregar
            </Button>
          </div>

          <div v-if="recurringConcepts.length === 0" class="text-sm text-muted-foreground text-center py-2">
            Sin conceptos adicionales
          </div>

          <div v-for="(concept, index) in recurringConcepts" :key="index" class="flex gap-2">
            <Select v-model="concept.concept_name" class="flex-1">
              <SelectTrigger>
                <SelectValue placeholder="Concepto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="name in COMMON_CONCEPT_NAMES"
                  :key="name"
                  :value="name"
                >
                  {{ name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              v-model.number="concept.amount"
              type="number"
              placeholder="Monto"
              class="w-28"
            />
            <Button
              variant="ghost"
              size="icon"
              class="h-10 w-10 flex-shrink-0"
              @click="removeConcept(index)"
            >
              <X class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <!-- Preview -->
        <div class="p-3 bg-primary/5 rounded-lg">
          <div class="flex justify-between text-sm">
            <span>Total por mes:</span>
            <span class="font-semibold">{{ formatCurrency(totalPerMonth) }}</span>
          </div>
        </div>

        <!-- Error Message -->
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="$emit('update:open', false)">
            Cancelar
          </Button>
          <Button @click="handleGenerate" :disabled="generating">
            <Loader2 v-if="generating" class="w-4 h-4 mr-2 animate-spin" />
            Generar {{ monthsCount }} Pagos
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, X } from 'lucide-vue-next'
import { usePayments, type RecurringConcept } from '@/composables/usePayments'
import { COMMON_CONCEPT_NAMES } from '@/types'
import type { ContractWithRelations } from '@/types'

const props = defineProps<{
  open: boolean
  contractId: string
  contract: ContractWithRelations
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const {
  generatePaymentsForContract,
  formatCurrency,
  formatDate,
  error,
} = usePayments()

const generating = ref(false)
const recurringConcepts = ref<RecurringConcept[]>([])

// Computed
const monthsCount = computed(() => {
  const start = new Date(props.contract.start_date)
  const end = new Date(props.contract.end_date)
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  return months
})

const totalPerMonth = computed(() => {
  const rent = props.contract.current_rent_amount
  const concepts = recurringConcepts.value.reduce((sum, c) => sum + (c.amount || 0), 0)
  return rent + concepts
})

// Methods
function addConcept() {
  recurringConcepts.value.push({
    concept_name: '',
    amount: 0,
  })
}

function removeConcept(index: number) {
  recurringConcepts.value.splice(index, 1)
}

async function handleGenerate() {
  generating.value = true

  try {
    // Filter valid concepts
    const validConcepts = recurringConcepts.value.filter(
      c => c.concept_name && c.amount > 0
    )

    await generatePaymentsForContract(
      props.contractId,
      validConcepts.length > 0 ? validConcepts : undefined
    )

    emit('update:open', false)
    emit('success')
  } catch (e) {
    console.error('Error generating payments:', e)
  } finally {
    generating.value = false
  }
}
</script>
