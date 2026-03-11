<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <History class="w-5 h-5" />
          {{ $t('contracts.paymentHistory') }}
        </DialogTitle>
        <DialogDescription v-if="contract">
          {{ tenantName }} - {{ propertyAddress }}
          <span class="ml-2 text-xs">
            ({{ paidCount }}/{{ payments.length }} {{ $t('contracts.paid') }})
          </span>
        </DialogDescription>
      </DialogHeader>

      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex items-center justify-center py-8">
        <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
      </div>

      <!-- Content -->
      <div v-else class="flex-1 overflow-auto">
        <!-- Summary Cards -->
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ paidCount }}</p>
            <p class="text-xs text-muted-foreground">{{ $t('contracts.paid') }}</p>
          </div>
          <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ pendingCount }}</p>
            <p class="text-xs text-muted-foreground">{{ $t('contracts.pending') }}</p>
          </div>
          <div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
            <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ overdueCount }}</p>
            <p class="text-xs text-muted-foreground">{{ $t('contracts.overdue') }}</p>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mb-4">
          <div class="flex justify-between text-sm mb-1">
            <span class="text-muted-foreground">{{ $t('payments.contractProgress') }}</span>
            <span class="font-medium">{{ progressPercentage }}%</span>
          </div>
          <div class="h-2 bg-muted rounded-full overflow-hidden">
            <div
              class="h-full bg-green-500 transition-all"
              :style="{ width: `${progressPercentage}%` }"
            />
          </div>
        </div>

        <!-- Payments Table -->
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-24">{{ $t('payments.period') }}</TableHead>
              <TableHead>{{ $t('payments.dueDate') }}</TableHead>
              <TableHead class="text-right">{{ $t('payments.totalAmount') }}</TableHead>
              <TableHead>{{ $t('payments.paidDate') }}</TableHead>
              <TableHead>{{ $t('common.status') }}</TableHead>
              <TableHead class="w-20">{{ $t('common.actions') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="payment in payments"
              :key="payment.id"
              :class="{ 'bg-red-50/50 dark:bg-red-900/10': payment.status === 'vencido' }"
            >
              <TableCell class="font-medium">
                {{ getMonthName(payment.period_month).substring(0, 3) }} {{ payment.period_year }}
              </TableCell>
              <TableCell>{{ formatDate(payment.due_date) }}</TableCell>
              <TableCell class="text-right font-semibold">
                {{ formatCurrency(payment.total_amount || payment.expected_amount) }}
              </TableCell>
              <TableCell>
                <span v-if="payment.payment_date">{{ formatDate(payment.payment_date) }}</span>
                <span v-else class="text-muted-foreground">-</span>
              </TableCell>
              <TableCell>
                <Badge :class="getStatusBadgeClass(payment.status)">
                  {{ getStatusLabel(payment.status) }}
                </Badge>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-1">
                  <Button
                    v-if="payment.status !== 'pagado'"
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7"
                    @click="handleRegisterPayment(payment)"
                    :title="$t('payments.registerPayment')"
                  >
                    <DollarSign class="w-4 h-4" />
                  </Button>
                  <Button
                    v-if="payment.status === 'pagado'"
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7"
                    @click="handlePrintReceipt(payment)"
                    :title="$t('payments.printReceipt')"
                  >
                    <Printer class="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <!-- Footer -->
      <div class="flex justify-between items-center pt-4 border-t">
        <div class="text-sm text-muted-foreground">
          {{ $t('contracts.totalCollected') }} <span class="font-semibold text-green-600">{{ formatCurrency(totalCollected) }}</span>
        </div>
        <Button variant="outline" @click="$emit('update:open', false)">
          {{ $t('common.close') }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Payment Dialog -->
  <PaymentDialog
    v-model:open="paymentDialogOpen"
    :payment-id="selectedPaymentId"
    @success="handlePaymentSuccess"
  />
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
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import PaymentDialog from './PaymentDialog.vue'
import { Loader2, History, DollarSign, Printer } from 'lucide-vue-next'
import { usePayments } from '@/composables/usePayments'
import { useReceiptPDF } from '@/composables/useReceiptPDF'
import type { PaymentWithDetails, PaymentStatus } from '@/types'

const props = defineProps<{
  open: boolean
  contractId: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'payment-registered'): void
}>()

const { t } = useI18n()
const {
  loading,
  getPaymentHistory,
  formatCurrency,
  formatDate,
  getMonthName,
  getStatusLabel,
  formatPropertyAddress,
} = usePayments()

const { printReceiptPDF } = useReceiptPDF()

// State
const payments = ref<PaymentWithDetails[]>([])
const paymentDialogOpen = ref(false)
const selectedPaymentId = ref('')

// Computed
const contract = computed(() => {
  return payments.value[0]?.contract
})

const tenantName = computed(() => {
  const titular = contract.value?.tenants?.find(ct => ct.role === 'titular')?.tenant
  if (!titular) return t('contracts.noTenantAssigned')
  return `${titular.first_name} ${titular.last_name}`
})

const propertyAddress = computed(() => {
  if (!payments.value[0]) return ''
  return formatPropertyAddress(payments.value[0])
})

const paidCount = computed(() => {
  return payments.value.filter(p => p.status === 'pagado').length
})

const pendingCount = computed(() => {
  return payments.value.filter(p => p.status === 'pendiente').length
})

const overdueCount = computed(() => {
  return payments.value.filter(p => p.status === 'vencido').length
})

const progressPercentage = computed(() => {
  if (payments.value.length === 0) return 0
  return Math.round((paidCount.value / payments.value.length) * 100)
})

const totalCollected = computed(() => {
  return payments.value
    .filter(p => p.status === 'pagado')
    .reduce((sum, p) => sum + (p.actual_amount || 0), 0)
})

// Watch for dialog open
watch(() => props.open, async (isOpen) => {
  if (isOpen && props.contractId) {
    await loadHistory()
  }
})

// Methods
async function loadHistory() {
  payments.value = await getPaymentHistory(props.contractId)
}

function getStatusBadgeClass(status: PaymentStatus): string {
  const classes: Record<PaymentStatus, string> = {
    pendiente: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    pagado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    vencido: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    pago_parcial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  }
  return classes[status] || ''
}

function handleRegisterPayment(payment: PaymentWithDetails) {
  selectedPaymentId.value = payment.id
  paymentDialogOpen.value = true
}

function handlePrintReceipt(payment: PaymentWithDetails) {
  printReceiptPDF(payment)
}

async function handlePaymentSuccess() {
  await loadHistory()
  emit('payment-registered')
}
</script>
