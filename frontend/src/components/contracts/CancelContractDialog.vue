<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ $t('contracts.cancelContract') }}</DialogTitle>
        <DialogDescription class="space-y-4">
          <p>
            {{ $t('contracts.cancelConfirmDescription', { property: propertyAddress }) }}
          </p>

          <div v-if="tenantName" class="p-3 bg-muted rounded-lg">
            <p class="text-sm">
              <span class="text-muted-foreground">{{ $t('contracts.tenant') }}:</span>
              <span class="font-medium ml-2">{{ tenantName }}</span>
            </p>
          </div>
        </DialogDescription>
      </DialogHeader>

      <form @submit.prevent="handleConfirm" class="space-y-4">
        <!-- Effective Date -->
        <div class="space-y-2">
          <Label for="effective_date">{{ $t('contracts.cancelEffectiveDate') }}</Label>
          <Input
            id="effective_date"
            v-model="form.effectiveDate"
            type="date"
            required
          />
        </div>

        <!-- Reason -->
        <div class="space-y-2">
          <Label for="reason">{{ $t('contracts.cancelReason') }}</Label>
          <Select v-model="form.reason" required>
            <SelectTrigger>
              <SelectValue :placeholder="$t('contracts.selectCancelReason')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="incumplimiento_pago">
                {{ $t('contracts.cancelReasons.incumplimiento_pago') }}
              </SelectItem>
              <SelectItem value="acuerdo_mutuo">
                {{ $t('contracts.cancelReasons.acuerdo_mutuo') }}
              </SelectItem>
              <SelectItem value="otro">
                {{ $t('contracts.cancelReasons.otro') }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Notes -->
        <div class="space-y-2">
          <Label for="notes">{{ $t('common.notes') }}</Label>
          <Textarea
            id="notes"
            v-model="form.notes"
            :placeholder="$t('contracts.cancelNotesPlaceholder')"
            rows="2"
          />
        </div>

        <!-- Estimated Penalty (readonly, only shown if contract has penalty data) -->
        <div v-if="estimatedPenalty > 0" class="space-y-2">
          <Label>{{ $t('contracts.estimatedPenalty') }}</Label>
          <div class="p-3 bg-muted/50 rounded-lg">
            <span class="font-semibold text-lg">{{ formatCurrency(estimatedPenalty) }}</span>
            <p class="text-xs text-muted-foreground mt-1">
              {{ $t('contracts.estimatedPenaltyDescription') }}
            </p>
          </div>
        </div>

        <!-- Warning -->
        <div class="flex items-start space-x-2 p-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg">
          <AlertTriangle class="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
          <div class="text-sm text-yellow-700 dark:text-yellow-400">
            <p class="font-medium">{{ $t('common.warning') }}</p>
            <p>{{ $t('contracts.cancelWarning') }}</p>
          </div>
        </div>

        <!-- Update Property Status Checkbox -->
        <div class="flex items-center space-x-2">
          <Checkbox
            id="update_property"
            :checked="form.updatePropertyStatus"
            @update:checked="form.updatePropertyStatus = $event"
          />
          <Label for="update_property" class="font-normal cursor-pointer text-sm">
            {{ $t('contracts.markPropertyAvailable') }}
          </Label>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="$emit('cancel')">
            {{ $t('contracts.keepContract') }}
          </Button>
          <Button
            type="submit"
            variant="destructive"
            :disabled="!canSubmit || isCancelling"
          >
            <Loader2 v-if="isCancelling" class="w-4 h-4 mr-2 animate-spin" />
            {{ $t('contracts.cancelContract') }}
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, AlertTriangle } from 'lucide-vue-next'
import { useContracts } from '@/composables/useContracts'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import { useToast } from '@/composables/useToast'
import type { Contract } from '@/types'

const toast = useToast()

const props = defineProps<{
  open: boolean
  contractId: string
  propertyAddress: string
  tenantName?: string
  // NOTE: The contract prop should be passed to enable penalty calculation.
  // If not available at the call site, that will be handled separately.
  contract?: Contract
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const { cancelContract } = useContracts()
const { formatCurrency } = useFormatCurrency()

const isCancelling = ref(false)

// Form state
const form = ref({
  effectiveDate: new Date().toISOString().split('T')[0],
  reason: '' as 'incumplimiento_pago' | 'acuerdo_mutuo' | 'otro' | '',
  notes: '',
  updatePropertyStatus: true,
})

// Computed
const estimatedPenalty = computed(() => {
  if (!props.contract) return 0
  const rentAmount = props.contract.current_rent_amount ?? 0
  const penaltyMonths = props.contract.early_termination_penalty_months ?? 0
  return rentAmount * penaltyMonths
})

const canSubmit = computed(() => {
  return form.value.effectiveDate && form.value.reason
})

// Reset form when dialog opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    form.value = {
      effectiveDate: new Date().toISOString().split('T')[0],
      reason: '',
      notes: '',
      updatePropertyStatus: true,
    }
  }
})

async function handleConfirm() {
  if (!canSubmit.value) return

  isCancelling.value = true

  try {
    await cancelContract({
      id: props.contractId,
      updatePropertyStatus: form.value.updatePropertyStatus,
      effectiveDate: form.value.effectiveDate,
      reason: form.value.reason as 'incumplimiento_pago' | 'acuerdo_mutuo' | 'otro',
      notes: form.value.notes || undefined,
      penaltyAmount: estimatedPenalty.value > 0 ? estimatedPenalty.value : undefined,
    })
    toast.success(t('toast.contractCancelled'))
    emit('confirm')
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('contracts.cancelError')
    toast.error(`${t('common.error')}: ${message}`)
  } finally {
    isCancelling.value = false
  }
}
</script>
