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
          <Input
            v-if="form.reason === 'otro'"
            v-model="form.customReason"
            :placeholder="$t('contracts.customReasonPlaceholder')"
            required
          />
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

        <!-- Actions / Confirmation Step -->
        <div v-if="!showConfirmStep" class="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" @click="$emit('cancel')">
            {{ $t('contracts.keepContract') }}
          </Button>
          <Button
            type="submit"
            variant="destructive"
            :disabled="!canSubmit"
          >
            {{ $t('contracts.cancelContract') }}
          </Button>
        </div>

        <!-- Second Confirmation Step -->
        <div v-else class="space-y-4 pt-4">
          <div class="flex items-start space-x-3 p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
            <AlertTriangle class="w-6 h-6 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <p class="text-sm text-red-700 dark:text-red-400">
              Esta acción es irreversible. Se generará un documento de rescisión oficial y el contrato quedará rescindido permanentemente.
            </p>
          </div>
          <div class="flex justify-end gap-3">
            <Button type="button" variant="outline" @click="showConfirmStep = false">
              {{ $t('common.back') }}
            </Button>
            <Button
              type="button"
              variant="destructive"
              :disabled="isCancelling"
              @click="executeCancel"
            >
              <Loader2 v-if="isCancelling" class="w-4 h-4 mr-2 animate-spin" />
              {{ $t('contracts.confirmRescission') }}
            </Button>
          </div>
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
const showConfirmStep = ref(false)

// Form state
const form = ref({
  effectiveDate: new Date().toISOString().split('T')[0],
  reason: '' as 'incumplimiento_pago' | 'acuerdo_mutuo' | 'otro' | '',
  customReason: '',
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
  const hasRequiredFields = form.value.effectiveDate && form.value.reason
  const hasCustomReasonIfNeeded = form.value.reason !== 'otro' || form.value.customReason.trim()
  return hasRequiredFields && hasCustomReasonIfNeeded
})

// Reset form when dialog opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    form.value = {
      effectiveDate: new Date().toISOString().split('T')[0],
      reason: '',
      customReason: '',
      notes: '',
      updatePropertyStatus: true,
    }
    showConfirmStep.value = false
  }
})

// Clear customReason when reason changes away from 'otro'
watch(() => form.value.reason, (newReason) => {
  if (newReason !== 'otro') {
    form.value.customReason = ''
  }
})

function handleConfirm() {
  if (!canSubmit.value) return
  showConfirmStep.value = true
}

async function executeCancel() {
  isCancelling.value = true

  try {
    const { blob, fileName } = await cancelContract({
      id: props.contractId,
      updatePropertyStatus: form.value.updatePropertyStatus,
      effectiveDate: form.value.effectiveDate,
      reason: form.value.reason as 'incumplimiento_pago' | 'acuerdo_mutuo' | 'otro',
      notes: form.value.notes || undefined,
      penaltyAmount: estimatedPenalty.value > 0 ? estimatedPenalty.value : undefined,
      customReason: form.value.reason === 'otro' ? form.value.customReason : undefined,
    })

    // Trigger download of the rescission PDF
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(t('toast.contractCancelled'))
    emit('confirm')
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : t('contracts.cancelError')
    toast.error(`${t('common.error')}: ${message}`)
    showConfirmStep.value = false
  } finally {
    isCancelling.value = false
  }
}
</script>
