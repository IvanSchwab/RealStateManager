<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ $t('payments.registerPayment') }}</DialogTitle>
        <DialogDescription v-if="payment">
          {{ getPeriodLabel(payment) }} - {{ formatPropertyAddress(payment) }}
        </DialogDescription>
      </DialogHeader>

      <!-- Loading State -->
      <div v-if="loading && !payment" class="py-8 text-center">
        <Loader2 class="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        <p class="mt-2 text-sm text-muted-foreground">{{ $t('payments.loadingPayment') }}</p>
      </div>

      <!-- Payment Form -->
      <div v-else-if="payment" class="space-y-6">
        <!-- Payment Summary with Concepts Manager -->
        <div class="p-4 bg-muted/50 rounded-lg space-y-3">
          <!-- Base Rent -->
          <div class="flex justify-between">
            <span class="text-sm text-muted-foreground">{{ $t('payments.rent') }}</span>
            <span class="font-medium">{{ formatCurrency(payment.rent_amount || payment.expected_amount) }}</span>
          </div>

          <!-- Concepts List -->
          <div
            v-for="concept in payment.concepts"
            :key="concept.id"
            class="flex justify-between text-sm"
          >
            <span class="text-muted-foreground">{{ concept.concept_name }}</span>
            <span>{{ formatCurrency(concept.amount) }}</span>
          </div>

          <!-- Total -->
          <Separator />
          <div class="flex justify-between text-lg">
            <span class="font-semibold">{{ $t('payments.totalToPay') }}</span>
            <span class="font-bold text-primary">
              {{ formatCurrency(calculatedTotal) }}
            </span>
          </div>
        </div>

        <!-- Expandable Concepts Manager -->
        <div class="border rounded-lg">
          <button
            @click="showConceptsManager = !showConceptsManager"
            class="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <span class="flex items-center gap-2">
              <ReceiptText class="w-4 h-4" />
              {{ $t('payments.editConcepts') }}
            </span>
            <ChevronDown
              class="w-4 h-4 transition-transform"
              :class="{ 'rotate-180': showConceptsManager }"
            />
          </button>

          <div v-if="showConceptsManager" class="p-3 border-t">
            <PaymentConceptsManager
              :payment-id="paymentId"
              :contract-id="payment.contract_id"
              @update="handleConceptsUpdate"
              @total-changed="handleTotalChanged"
            />
          </div>
        </div>

        <!-- Payment Form Fields -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Paid Date -->
          <div class="space-y-2">
            <Label for="paid_date">{{ $t('payments.paymentDate') }}</Label>
            <Input
              id="paid_date"
              v-model="form.paid_date"
              type="date"
              required
            />
          </div>

          <!-- Paid Amount -->
          <div class="space-y-2">
            <Label for="paid_amount">{{ $t('payments.paidAmount') }}</Label>
            <Input
              id="paid_amount"
              v-model.number="form.paid_amount"
              type="number"
              min="0"
              step="0.01"
              required
              :class="{ 'border-destructive': !isAmountValid && form.paid_amount > 0 }"
            />
            <p v-if="!isAmountValid && form.paid_amount > 0" class="text-xs text-destructive">
              {{ $t('payments.amountMustEqualTotal', { total: formatCurrency(calculatedTotal) }) }}
            </p>
            <p v-else class="text-xs text-muted-foreground">
              {{ $t('payments.expectedTotal', { total: formatCurrency(calculatedTotal) }) }}
            </p>
          </div>

          <!-- Payment Method -->
          <div class="space-y-2">
            <Label for="payment_method">{{ $t('payments.paymentMethod') }}</Label>
            <Select v-model="form.payment_method">
              <SelectTrigger>
                <SelectValue :placeholder="$t('payments.selectMethod')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">{{ $t('payments.efectivo') }}</SelectItem>
                <SelectItem value="transferencia">{{ $t('payments.transferencia') }}</SelectItem>
                <SelectItem value="cheque">{{ $t('payments.cheque') }}</SelectItem>
                <SelectItem value="deposito">{{ $t('payments.deposito') }}</SelectItem>
                <SelectItem value="tarjeta">{{ $t('payments.tarjeta') }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Notes -->
          <div class="space-y-2">
            <Label for="notes">{{ $t('payments.notesOptional') }}</Label>
            <Textarea
              id="notes"
              v-model="form.notes"
              :placeholder="$t('payments.paymentNotesPlaceholder')"
              rows="2"
            />
          </div>

          <!-- Error Message -->
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" @click="$emit('update:open', false)">
              {{ $t('common.cancel') }}
            </Button>
            <Button type="submit" :disabled="!canSubmit || submitting">
              <Loader2 v-if="submitting" class="w-4 h-4 mr-2 animate-spin" />
              {{ $t('payments.registerPayment') }}
            </Button>
          </div>
        </form>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="py-8 text-center">
        <p class="text-destructive">{{ error }}</p>
        <Button variant="outline" class="mt-4" @click="loadPayment">
          {{ $t('common.retry') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Success Dialog -->
  <Dialog v-model:open="showSuccessDialog">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2 text-green-600">
          <CheckCircle2 class="w-5 h-5" />
          {{ $t('payments.paymentRegistered') }}
        </DialogTitle>
      </DialogHeader>
      <div class="py-4 text-center">
        <p class="text-muted-foreground mb-4">
          {{ $t('payments.receiptNumber') }} <span class="font-mono font-semibold">{{ registeredPayment?.reference_number }}</span>
        </p>
        <div class="flex justify-center gap-3">
          <Button variant="outline" @click="closeSuccessDialog">
            {{ $t('common.close') }}
          </Button>
          <Button @click="handlePrintReceipt">
            <Printer class="w-4 h-4 mr-2" />
            {{ $t('payments.printReceipt') }}
          </Button>
        </div>
      </div>
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
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import PaymentConceptsManager from './PaymentConceptsManager.vue'
import { Loader2, CheckCircle2, Printer, ChevronDown, ReceiptText } from 'lucide-vue-next'
import { usePayments } from '@/composables/usePayments'
import { useReceiptPDF } from '@/composables/useReceiptPDF'
import type { PaymentWithDetails, PaymentMethod, Payment, PaymentConcept } from '@/types'

const { t } = useI18n()

const props = defineProps<{
  open: boolean
  paymentId: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success', payment: Payment): void
}>()

const {
  loading,
  error,
  fetchPaymentById,
  registerPayment,
  formatCurrency,
  formatPropertyAddress,
  getPeriodLabel,
} = usePayments()

const { printReceiptPDF } = useReceiptPDF()

const payment = ref<PaymentWithDetails | null>(null)
const submitting = ref(false)
const showSuccessDialog = ref(false)
const registeredPayment = ref<Payment | null>(null)
const showConceptsManager = ref(false)
const conceptsTotal = ref(0)

// Form state
const form = ref({
  paid_date: new Date().toISOString().split('T')[0],
  paid_amount: 0,
  payment_method: '' as PaymentMethod | '',
  notes: '',
})

// Computed
const calculatedTotal = computed(() => {
  if (!payment.value) return 0
  const rentAmount = payment.value.rent_amount || payment.value.expected_amount || 0
  const existingConceptsTotal = payment.value.concepts?.reduce((sum, c) => sum + c.amount, 0) || 0
  // Use the tracked conceptsTotal if concepts manager has updated it
  return rentAmount + (conceptsTotal.value || existingConceptsTotal)
})

const isAmountValid = computed(() => {
  return form.value.paid_amount === calculatedTotal.value
})

const canSubmit = computed(() => {
  return (
    form.value.paid_date &&
    isAmountValid.value &&
    form.value.payment_method
  )
})

// Watch for dialog open to load payment
watch(() => props.open, async (isOpen) => {
  if (isOpen && props.paymentId) {
    await loadPayment()
  } else if (!isOpen) {
    // Reset form when closing
    form.value = {
      paid_date: new Date().toISOString().split('T')[0],
      paid_amount: 0,
      payment_method: '',
      notes: '',
    }
    payment.value = null
    showConceptsManager.value = false
    conceptsTotal.value = 0
  }
})

// Methods
async function loadPayment() {
  payment.value = await fetchPaymentById(props.paymentId)
  if (payment.value) {
    form.value.paid_amount = payment.value.total_amount || payment.value.expected_amount
    conceptsTotal.value = payment.value.concepts?.reduce((sum, c) => sum + c.amount, 0) || 0
  }
}

function handleConceptsUpdate(concepts: PaymentConcept[]) {
  if (payment.value) {
    payment.value.concepts = concepts
  }
}

function handleTotalChanged(total: number) {
  conceptsTotal.value = total
  // Update form amount to match new total
  if (payment.value) {
    const rentAmount = payment.value.rent_amount || payment.value.expected_amount || 0
    form.value.paid_amount = rentAmount + total
  }
}

async function handleSubmit() {
  if (!canSubmit.value || !payment.value) return

  submitting.value = true

  try {
    const result = await registerPayment(props.paymentId, {
      paid_date: form.value.paid_date,
      paid_amount: form.value.paid_amount,
      payment_method: form.value.payment_method as PaymentMethod,
      notes: form.value.notes || undefined,
    })

    if (result) {
      registeredPayment.value = result

      // Refresh payment data for receipt
      const updatedPayment = await fetchPaymentById(props.paymentId)
      if (updatedPayment) {
        payment.value = updatedPayment
      }

      emit('update:open', false)
      showSuccessDialog.value = true
      emit('success', result)
    }
  } catch (e) {
    console.error('Error registering payment:', e)
  } finally {
    submitting.value = false
  }
}

function handlePrintReceipt() {
  if (payment.value) {
    printReceiptPDF(payment.value)
  }
  closeSuccessDialog()
}

function closeSuccessDialog() {
  showSuccessDialog.value = false
  registeredPayment.value = null
}
</script>
