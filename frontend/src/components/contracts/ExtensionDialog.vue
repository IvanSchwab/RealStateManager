<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ $t('contracts.extendContract') }}</DialogTitle>
        <DialogDescription>
          {{ $t('contracts.extendDescription') }}
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleConfirm" class="space-y-4">
        <!-- Current End Date Info -->
        <div class="p-4 bg-muted/50 rounded-lg">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">{{ $t('contracts.currentEndDate') }}</span>
            <span class="font-semibold">{{ formatDate(contract.end_date) }}</span>
          </div>
        </div>

        <!-- New End Date -->
        <div class="space-y-2">
          <Label for="new_end_date">{{ $t('contracts.newEndDate') }} *</Label>
          <Input
            id="new_end_date"
            v-model="form.newEndDate"
            type="date"
            :min="minNewEndDate"
            required
          />
          <p class="text-xs text-muted-foreground">
            {{ $t('contracts.currentEndDateHelper', { date: formatDate(contract.end_date) }) }}
          </p>
          <p v-if="dateError" class="text-sm text-destructive">
            {{ dateError }}
          </p>
        </div>

        <!-- New Monthly Amount -->
        <div class="space-y-2">
          <Label for="new_monthly_amount">{{ $t('contracts.newMonthlyAmount') }}</Label>
          <Input
            id="new_monthly_amount"
            v-model.number="form.newMonthlyAmount"
            type="number"
            min="0"
            step="100"
          />
          <p class="text-xs text-muted-foreground">
            {{ $t('contracts.currentAmountHelper', { amount: formatCurrency(contract.current_rent_amount) }) }}
          </p>
        </div>

        <!-- Notes -->
        <div class="space-y-2">
          <Label for="notes">{{ $t('common.notes') }}</Label>
          <Textarea
            id="notes"
            v-model="form.notes"
            :placeholder="$t('contracts.extensionNotesPlaceholder')"
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
const { extendContract } = useContracts()
const toast = useToast()

const submitting = ref(false)

// Form state
const form = ref({
  newEndDate: '',
  newMonthlyAmount: 0,
  notes: '',
})

// Minimum new end date is contract.end_date + 1 day
const minNewEndDate = computed(() => {
  const endDate = new Date(props.contract.end_date + 'T00:00:00')
  endDate.setDate(endDate.getDate() + 1)
  return endDate.toISOString().split('T')[0]
})

// Validation error for date
const dateError = computed(() => {
  if (!form.value.newEndDate) return null

  const newDate = new Date(form.value.newEndDate + 'T00:00:00')
  const currentEndDate = new Date(props.contract.end_date + 'T00:00:00')

  if (newDate <= currentEndDate) {
    return t('contracts.newEndDateMustBeAfterCurrent')
  }

  return null
})

const canSubmit = computed(() => {
  return form.value.newEndDate && !dateError.value
})

// Reset form when dialog opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    form.value = {
      newEndDate: '',
      newMonthlyAmount: props.contract.current_rent_amount ?? 0,
      notes: '',
    }
  }
})

async function handleConfirm() {
  if (!canSubmit.value) return

  submitting.value = true

  try {
    // Only pass newMonthlyAmount if it changed from original
    const amountChanged = form.value.newMonthlyAmount !== props.contract.current_rent_amount

    const { blob, fileName } = await extendContract({
      contractId: props.contract.id,
      organizationId: props.contract.organization_id,
      newEndDate: form.value.newEndDate,
      newMonthlyAmount: amountChanged ? form.value.newMonthlyAmount : undefined,
      notes: form.value.notes.trim() || undefined,
      contract: props.contract,
    })

    // Auto-download the extension PDF
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)

    toast.success(t('contracts.extensionSuccess'))
    emit('success')
    emit('update:open', false)
  } catch (e) {
    toast.error(t('contracts.extensionError'))
  } finally {
    submitting.value = false
  }
}
</script>
