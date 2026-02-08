<template>
  <div class="space-y-4">
    <!-- Concepts List -->
    <div v-if="concepts.length > 0" class="space-y-2">
      <div
        v-for="concept in concepts"
        :key="concept.id"
        class="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
      >
        <div class="flex items-center gap-3">
          <div>
            <p class="font-medium text-sm">{{ concept.concept_name }}</p>
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <span v-if="concept.is_recurring" class="flex items-center gap-1">
                <RefreshCw class="w-3 h-3" />
                Recurrente
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span class="font-semibold">{{ formatCurrency(concept.amount) }}</span>
          <Button
            v-if="!readonly"
            variant="ghost"
            size="icon"
            class="h-8 w-8 text-destructive hover:text-destructive"
            @click="handleRemoveConcept(concept.id)"
            :disabled="loading"
          >
            <X class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="py-4 text-center text-sm text-muted-foreground">
      Sin conceptos adicionales
    </div>

    <!-- Running Total -->
    <div v-if="concepts.length > 0" class="flex justify-between pt-2 border-t">
      <span class="text-sm text-muted-foreground">Subtotal conceptos:</span>
      <span class="font-semibold">{{ formatCurrency(conceptsTotal) }}</span>
    </div>

    <!-- Add Concept Form -->
    <div v-if="!readonly" class="pt-4 border-t space-y-3">
      <p class="text-sm font-medium">Agregar concepto</p>

      <div class="flex gap-2">
        <!-- Concept Name Select/Input -->
        <div class="flex-1">
          <Select v-model="newConcept.concept_name">
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar concepto" />
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
        </div>

        <!-- Amount Input -->
        <div class="w-32">
          <Input
            v-model.number="newConcept.amount"
            type="number"
            placeholder="Monto"
            min="0"
            step="100"
          />
        </div>
      </div>

      <!-- Recurring Checkbox -->
      <div class="flex items-center gap-2">
        <Checkbox
          id="is_recurring"
          :checked="newConcept.is_recurring"
          @update:checked="newConcept.is_recurring = $event"
        />
        <label for="is_recurring" class="text-sm text-muted-foreground cursor-pointer">
          Aplicar a meses futuros (recurrente)
        </label>
      </div>

      <!-- Add Button -->
      <Button
        class="w-full"
        variant="outline"
        :disabled="!canAddConcept || loading"
        @click="handleAddConcept"
      >
        <Plus class="w-4 h-4 mr-2" />
        Agregar Concepto
      </Button>
    </div>

    <!-- Error Message -->
    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus, RefreshCw } from 'lucide-vue-next'
import { usePaymentConcepts } from '@/composables/usePaymentConcepts'
import { COMMON_CONCEPT_NAMES } from '@/types'
import type { PaymentConcept } from '@/types'

const props = defineProps<{
  paymentId: string
  readonly?: boolean
  contractId?: string
}>()

const emit = defineEmits<{
  (e: 'update', concepts: PaymentConcept[]): void
  (e: 'totalChanged', total: number): void
}>()

const {
  concepts,
  loading,
  error,
  fetchConcepts,
  addConcept,
  removeConcept,
  applyRecurringToFuture,
  formatCurrency,
} = usePaymentConcepts()

// New concept form
const newConcept = ref({
  concept_name: '',
  amount: 0,
  is_recurring: false,
})

// Computed
const conceptsTotal = computed(() => {
  return concepts.value.reduce((sum, c) => sum + c.amount, 0)
})

const canAddConcept = computed(() => {
  return newConcept.value.concept_name && newConcept.value.amount > 0
})

// Watch for total changes
watch(conceptsTotal, (total) => {
  emit('totalChanged', total)
})

// Methods
async function handleAddConcept() {
  if (!canAddConcept.value) return

  try {
    await addConcept(props.paymentId, {
      concept_name: newConcept.value.concept_name,
      amount: newConcept.value.amount,
      is_recurring: newConcept.value.is_recurring,
    })

    // Apply to future payments if recurring and contractId provided
    if (newConcept.value.is_recurring && props.contractId) {
      await applyRecurringToFuture(props.contractId, {
        concept_name: newConcept.value.concept_name,
        amount: newConcept.value.amount,
      })
    }

    // Reset form
    newConcept.value = {
      concept_name: '',
      amount: 0,
      is_recurring: false,
    }

    emit('update', concepts.value)
  } catch (e) {
    console.error('Error adding concept:', e)
  }
}

async function handleRemoveConcept(conceptId: string) {
  try {
    await removeConcept(conceptId)
    emit('update', concepts.value)
  } catch (e) {
    console.error('Error removing concept:', e)
  }
}

// Load concepts on mount
onMounted(async () => {
  await fetchConcepts(props.paymentId)
  emit('update', concepts.value)
  emit('totalChanged', conceptsTotal.value)
})
</script>
