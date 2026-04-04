<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ $t('contracts.renewal.title') }}</DialogTitle>
        <DialogDescription>
          {{ $t('contracts.renewal.description') }}
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleConfirm" class="space-y-4">
        <!-- Current Contract Info -->
        <div class="p-4 bg-muted/50 rounded-lg space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">{{ $t('contracts.currentEndDate') }}</span>
            <span class="font-semibold">{{ formatDate(contract.end_date) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">{{ $t('contracts.currentRent') }}</span>
            <span class="font-semibold">{{ formatCurrency(contract.current_rent_amount) }}</span>
          </div>
        </div>

        <!-- New Start Date -->
        <div class="space-y-2">
          <Label for="new_start_date">{{ $t('contracts.renewal.newStartDate') }} *</Label>
          <Input
            id="new_start_date"
            v-model="form.newStartDate"
            type="date"
            required
          />
        </div>

        <!-- Duration in Months -->
        <div class="space-y-2">
          <Label for="duration_months">{{ $t('contracts.renewal.durationMonths') }} *</Label>
          <Input
            id="duration_months"
            v-model.number="form.durationMonths"
            type="number"
            min="1"
            required
          />
          <!-- Quick select buttons -->
          <div class="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="form.durationMonths = 12"
              :class="{ 'border-primary': form.durationMonths === 12 }"
            >
              {{ $t('contracts.renewal.quickDuration12') }}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="form.durationMonths = 24"
              :class="{ 'border-primary': form.durationMonths === 24 }"
            >
              {{ $t('contracts.renewal.quickDuration24') }}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              @click="form.durationMonths = 36"
              :class="{ 'border-primary': form.durationMonths === 36 }"
            >
              {{ $t('contracts.renewal.quickDuration36') }}
            </Button>
          </div>
          <!-- Calculated end date -->
          <p v-if="calculatedEndDate" class="text-sm text-muted-foreground">
            {{ $t('contracts.renewal.calculatedEndDate', { date: formatDate(calculatedEndDate) }) }}
          </p>
        </div>

        <!-- New Monthly Amount -->
        <div class="space-y-2">
          <Label for="new_monthly_amount">{{ $t('contracts.newMonthlyAmount') }} *</Label>
          <Input
            id="new_monthly_amount"
            v-model.number="form.newMonthlyAmount"
            type="number"
            min="0"
            step="100"
            required
          />
        </div>

        <!-- Notes -->
        <div class="space-y-2">
          <Label for="notes">{{ $t('common.notes') }}</Label>
          <Textarea
            id="notes"
            v-model="form.notes"
            :placeholder="$t('contracts.renewal.notesPlaceholder')"
            rows="2"
          />
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="$emit('update:open', false)" :disabled="submitting">
            {{ $t('common.cancel') }}
          </Button>
          <Button type="submit" :disabled="!canSubmit || submitting">
            <Loader2 v-if="submitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ $t('common.confirm') }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
import { Loader2 } from 'lucide-vue-next'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import { useFormatDate } from '@/composables/useFormatDate'
import { useContracts } from '@/composables/useContracts'
import { useToast } from '@/composables/useToast'
import type { ContractWithRelations } from '@/types'

const props = defineProps<{
  contract: ContractWithRelations
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const { t } = useI18n()
const { formatCurrency } = useFormatCurrency()
const { formatDate } = useFormatDate()
const { renewContract } = useContracts()
const toast = useToast()

const submitting = ref(false)

// Calculate original contract duration in months
function calculateOriginalDuration(): number {
  const start = new Date(props.contract.start_date + 'T00:00:00')
  const end = new Date(props.contract.end_date + 'T00:00:00')
  const diffTime = end.getTime() - start.getTime()
  const diffMonths = Math.round(diffTime / (1000 * 60 * 60 * 24 * 30))
  return Math.max(1, diffMonths)
}

// Form state
const form = ref({
  newStartDate: '',
  durationMonths: 12,
  newMonthlyAmount: 0,
  notes: '',
})

// Calculate default start date (day after contract.end_date)
const defaultStartDate = computed(() => {
  const endDate = new Date(props.contract.end_date + 'T00:00:00')
  endDate.setDate(endDate.getDate() + 1)
  return endDate.toISOString().split('T')[0]
})

// Calculate end date from start date + duration months
const calculatedEndDate = computed(() => {
  if (!form.value.newStartDate || !form.value.durationMonths) return ''
  const startDate = new Date(form.value.newStartDate + 'T00:00:00')
  startDate.setMonth(startDate.getMonth() + form.value.durationMonths)
  return startDate.toISOString().split('T')[0]
})

const canSubmit = computed(() => {
  return (
    form.value.newStartDate &&
    form.value.durationMonths > 0 &&
    form.value.newMonthlyAmount > 0
  )
})

// Reset form when dialog opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    form.value = {
      newStartDate: defaultStartDate.value,
      durationMonths: calculateOriginalDuration(),
      newMonthlyAmount: props.contract.current_rent_amount ?? 0,
      notes: '',
    }
  }
})

async function handleConfirm() {
  if (!canSubmit.value) return

  submitting.value = true

  try {
    const { blob, fileName } = await renewContract({
      originalContractId: props.contract.id,
      organizationId: props.contract.organization_id,
      newStartDate: form.value.newStartDate,
      newEndDate: calculatedEndDate.value,
      newMonthlyAmount: form.value.newMonthlyAmount,
      notes: form.value.notes.trim() || undefined,
      originalContract: props.contract,
    })

    // Auto-download the renewal PDF
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)

    toast.success(t('contracts.renewal.success'))
    emit('success')
    emit('update:open', false)
  } catch (e) {
    toast.error(t('contracts.renewal.error'))
  } finally {
    submitting.value = false
  }
}
</script>
