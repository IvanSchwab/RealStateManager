<template>
  <div class="p-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ $t('payments.title') }}</h1>
          <p class="text-muted-foreground">
            {{ getMonthName(filters.month) }} {{ filters.year }} - {{ $t('payments.subtitle') }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Button
            v-if="selectedPayments.length > 0"
            @click="handlePrintSelected"
          >
            <Printer class="w-4 h-4 mr-2" />
            {{ $t('payments.printSelected', { count: selectedPayments.length }) }}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal class="w-4 h-4 mr-2" />
                {{ $t('common.actions') }}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem @click="handlePrintAllPaid">
                <Printer class="w-4 h-4 mr-2" />
                {{ $t('payments.printAllPaid') }}
              </DropdownMenuItem>
              <DropdownMenuItem @click="handleExportToExcel">
                <FileSpreadsheet class="w-4 h-4 mr-2" />
                {{ $t('payments.exportToExcel') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-muted-foreground">{{ $t('payments.totalToCollect') }}</p>
                <p class="text-2xl font-bold">{{ formatCurrency(summary.totalToCollect) }}</p>
              </div>
              <div class="p-2 bg-muted rounded-full">
                <Wallet class="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              {{ $t('payments.paymentsCount', { count: summary.totalCount }) }}
            </p>
          </CardContent>
        </Card>

        <Card class="border-green-200 dark:border-green-800">
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-muted-foreground">{{ $t('payments.collected') }}</p>
                <p class="text-2xl font-bold text-green-600">{{ formatCurrency(summary.collected) }}</p>
              </div>
              <div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 class="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              {{ $t('payments.paidCount', { count: summary.paidCount }) }}
            </p>
          </CardContent>
        </Card>

        <Card class="border-blue-200 dark:border-blue-800">
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-muted-foreground">{{ $t('payments.pending') }}</p>
                <p class="text-2xl font-bold text-blue-600">{{ formatCurrency(summary.pending) }}</p>
              </div>
              <div class="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Clock class="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              {{ $t('payments.pendingCount', { count: summary.pendingCount }) }}
            </p>
          </CardContent>
        </Card>

        <Card class="border-red-200 dark:border-red-800">
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-muted-foreground">{{ $t('payments.overdue') }}</p>
                <p class="text-2xl font-bold text-red-600">{{ formatCurrency(summary.overdue) }}</p>
              </div>
              <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle class="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p class="text-xs text-muted-foreground mt-2">
              {{ $t('payments.overdueCount', { count: summary.overdueCount }) }}
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Filters -->
      <Card class="mb-6">
        <CardContent class="p-4">
          <div class="flex flex-col md:flex-row gap-4">
            <!-- Search -->
            <div class="flex-1">
              <div class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  v-model="filters.search"
                  :placeholder="$t('payments.searchPlaceholder')"
                  class="pl-9"
                />
              </div>
            </div>

            <!-- Status Filter -->
            <Select v-model="filters.status">
              <SelectTrigger class="w-[150px]">
                <SelectValue :placeholder="$t('common.status')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ $t('payments.allStatus') }}</SelectItem>
                <SelectItem value="pendiente">{{ $t('payments.pendiente') }}</SelectItem>
                <SelectItem value="pagado">{{ $t('payments.pagado') }}</SelectItem>
                <SelectItem value="vencido">{{ $t('payments.vencido') }}</SelectItem>
              </SelectContent>
            </Select>

            <!-- Month/Year Filter -->
            <div class="flex gap-2">
              <Select v-model="filters.month">
                <SelectTrigger class="w-[130px]">
                  <SelectValue :placeholder="$t('payments.month')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="m in 12"
                    :key="m"
                    :value="m"
                  >
                    {{ getMonthName(m) }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select v-model="filters.year">
                <SelectTrigger class="w-[90px]">
                  <SelectValue :placeholder="$t('payments.year')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="y in yearOptions"
                    :key="y"
                    :value="y"
                  >
                    {{ y }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Clear Filters -->
            <Button
              v-if="hasActiveFilters"
              variant="ghost"
              size="icon"
              @click="clearFilters"
              :title="$t('common.clearFilters')"
            >
              <X class="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Loading State -->
      <div v-if="loading" class="py-12 text-center">
        <Loader2 class="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        <p class="mt-2 text-muted-foreground">{{ $t('payments.loadingPayments') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">{{ $t('payments.errorLoading') }}</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadPayments">
          {{ $t('common.retry') }}
        </Button>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredPayments.length === 0" class="py-12 text-center">
        <CreditCard class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-lg font-medium text-muted-foreground mb-2">
          {{ hasActiveFilters ? $t('payments.noPaymentsFiltered') : $t('payments.noPayments') }}
        </p>
        <p class="text-sm text-muted-foreground mb-4">
          {{ hasActiveFilters ? $t('properties.adjustFilters') : $t('payments.paymentsAutoGenerated') }}
        </p>
        <Button v-if="hasActiveFilters" variant="outline" @click="clearFilters">
          {{ $t('common.clearFilters') }}
        </Button>
      </div>

      <!-- Desktop Table -->
      <Card v-else class="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10">
                <Checkbox
                  :checked="isAllSelected"
                  :indeterminate="isPartiallySelected"
                  @update:checked="toggleSelectAll"
                />
              </TableHead>
              <TableHead>{{ $t('payments.tenant') }}</TableHead>
              <TableHead>{{ $t('payments.property') }}</TableHead>
              <TableHead>{{ $t('payments.period') }}</TableHead>
              <TableHead>{{ $t('payments.dueDate') }}</TableHead>
              <TableHead class="text-right">{{ $t('payments.totalAmount') }}</TableHead>
              <TableHead>{{ $t('common.status') }}</TableHead>
              <TableHead class="w-32">{{ $t('common.actions') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="payment in paginatedPayments"
              :key="payment.id"
              class="cursor-pointer hover:bg-muted/50"
              :class="{
                'bg-red-50 dark:bg-red-900/10': payment.status === 'vencido',
                'bg-muted/30': selectedPayments.includes(payment.id),
              }"
            >
              <TableCell @click.stop>
                <Checkbox
                  :checked="selectedPayments.includes(payment.id)"
                  @update:checked="togglePaymentSelection(payment.id)"
                />
              </TableCell>
              <TableCell>
                <div class="font-medium">{{ getTenantName(payment) }}</div>
              </TableCell>
              <TableCell>
                <div class="text-sm">{{ formatPropertyAddress(payment) }}</div>
              </TableCell>
              <TableCell>
                <div class="font-medium">{{ getPeriodLabel(payment) }}</div>
                <div v-if="payment.concepts?.length" class="text-xs text-muted-foreground">
                  {{ $t('payments.concepts', { count: payment.concepts.length }, payment.concepts.length) }}
                </div>
              </TableCell>
              <TableCell>
                <div>{{ formatDate(payment.due_date) }}</div>
                <div
                  v-if="payment.status === 'vencido'"
                  class="text-xs text-red-600"
                >
                  {{ $t('payments.daysOverdue', { days: getDaysOverdue(payment) }) }}
                </div>
              </TableCell>
              <TableCell class="text-right font-semibold">
                {{ formatCurrency(payment.total_amount || payment.expected_amount) }}
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
                    class="h-8 w-8"
                    @click="openPaymentDialog(payment)"
                    :title="$t('payments.registerPayment')"
                  >
                    <DollarSign class="w-4 h-4" />
                  </Button>
                  <Button
                    v-if="payment.status === 'pagado'"
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8"
                    @click="handlePrintSingle(payment)"
                    :title="$t('payments.printReceipt')"
                  >
                    <Printer class="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-8 w-8"
                    @click="openHistoryDialog(payment.contract_id)"
                    :title="$t('payments.viewHistory')"
                  >
                    <History class="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" class="h-8 w-8">
                        <MoreHorizontal class="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        v-if="payment.status !== 'pagado'"
                        @click="openConceptsDialog(payment)"
                      >
                        <ReceiptText class="w-4 h-4 mr-2" />
                        {{ $t('payments.editConcepts') }}
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="openHistoryDialog(payment.contract_id)">
                        <History class="w-4 h-4 mr-2" />
                        {{ $t('payments.viewHistory') }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <!-- Pagination -->
        <div class="flex items-center justify-between p-4 border-t">
          <p class="text-sm text-muted-foreground">
            {{ $t('payments.showingPayments', { start: paginationStart, end: paginationEnd, total: filteredPayments.length }) }}
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage === 1"
              @click="currentPage--"
            >
              {{ $t('common.previous') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              {{ $t('common.next') }}
            </Button>
          </div>
        </div>
      </Card>

      <!-- Mobile/Tablet Cards -->
      <div class="lg:hidden space-y-4">
        <!-- Bulk Selection Toggle -->
        <div class="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
          <div class="flex items-center gap-2">
            <Checkbox
              :checked="isAllSelected"
              :indeterminate="isPartiallySelected"
              @update:checked="toggleSelectAll"
            />
            <span class="text-sm text-muted-foreground">
              {{ selectedPayments.length > 0 ? `${selectedPayments.length} ${$t('common.selected')}` : $t('common.selectAll') }}
            </span>
          </div>
          <Button
            v-if="selectedPayments.length > 0"
            size="sm"
            @click="handlePrintSelected"
          >
            <Printer class="w-4 h-4 mr-1" />
            {{ $t('common.print') }}
          </Button>
        </div>

        <!-- Payment Cards -->
        <PaymentCard
          v-for="payment in paginatedPayments"
          :key="payment.id"
          :payment="payment"
          :selected="selectedPayments.includes(payment.id)"
          :show-checkbox="true"
          @register="openPaymentDialog"
          @print="handlePrintSingle"
          @view-history="openHistoryDialog"
          @edit-concepts="openConceptsDialog"
          @toggle-select="togglePaymentSelection(payment.id)"
        />

        <!-- Mobile Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            {{ $t('common.previous') }}
          </Button>
          <span class="flex items-center text-sm text-muted-foreground px-2">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >
            {{ $t('common.next') }}
          </Button>
        </div>
      </div>

      <!-- Payment Dialog -->
      <PaymentDialog
        v-model:open="paymentDialogOpen"
        :payment-id="selectedPaymentId"
        @success="handlePaymentSuccess"
      />

      <!-- History Dialog -->
      <PaymentHistoryDialog
        v-model:open="historyDialogOpen"
        :contract-id="selectedContractId"
        @payment-registered="handlePaymentSuccess"
      />

      <!-- Concepts Dialog -->
      <Dialog v-model:open="conceptsDialogOpen">
        <DialogContent class="max-w-md">
          <DialogHeader>
            <DialogTitle>{{ $t('payments.editConcepts') }}</DialogTitle>
            <DialogDescription v-if="selectedPayment">
              {{ getPeriodLabel(selectedPayment) }} - {{ formatPropertyAddress(selectedPayment) }}
            </DialogDescription>
          </DialogHeader>
          <PaymentConceptsManager
            v-if="selectedPayment"
            :payment-id="selectedPayment.id"
            :contract-id="selectedPayment.contract_id"
            @update="handleConceptsUpdated"
          />
          <div class="flex justify-end pt-4">
            <Button @click="conceptsDialogOpen = false">
              {{ $t('common.close') }}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import PaymentCard from '@/components/payments/PaymentCard.vue'
import PaymentDialog from '@/components/payments/PaymentDialog.vue'
import PaymentHistoryDialog from '@/components/payments/PaymentHistoryDialog.vue'
import PaymentConceptsManager from '@/components/payments/PaymentConceptsManager.vue'
import {
  Loader2,
  Search,
  X,
  CreditCard,
  Printer,
  DollarSign,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wallet,
  History,
  ReceiptText,
  FileSpreadsheet,
} from 'lucide-vue-next'
import { usePayments } from '@/composables/usePayments'
import { useReceiptPDF } from '@/composables/useReceiptPDF'
import { useDate } from '@/composables/useDate'
import type { PaymentWithDetails, PaymentStatus } from '@/types'

const { t } = useI18n()

const {
  payments,
  loading,
  error,
  fetchPayments,
  fetchPaymentsByIds,
  updateOverduePayments,
  getMonthSummary,
  formatCurrency,
  getPeriodLabel,
  formatPropertyAddress,
  getStatusLabel,
  getDaysOverdue,
} = usePayments()

const { formatDate, getMonthName } = useDate()

const { printReceiptPDF } = useReceiptPDF()

// Filters
const filters = ref({
  search: '',
  status: 'all' as PaymentStatus | 'all',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
})

// Pagination
const currentPage = ref(1)
const pageSize = 15

// Selection
const selectedPayments = ref<string[]>([])

// Dialog states
const paymentDialogOpen = ref(false)
const selectedPaymentId = ref('')
const historyDialogOpen = ref(false)
const selectedContractId = ref('')
const conceptsDialogOpen = ref(false)
const selectedPayment = ref<PaymentWithDetails | null>(null)

// Computed
const hasActiveFilters = computed(() => {
  return (
    filters.value.search ||
    filters.value.status !== 'all'
  )
})

const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear()
  return [currentYear - 1, currentYear, currentYear + 1]
})

const filteredPayments = computed(() => {
  let result = [...payments.value]

  // Client-side search filter
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    result = result.filter(p => {
      const address = formatPropertyAddress(p).toLowerCase()
      const tenant = getTenantName(p).toLowerCase()
      const receipt = p.reference_number?.toLowerCase() || ''
      return address.includes(searchLower) || tenant.includes(searchLower) || receipt.includes(searchLower)
    })
  }

  return result
})

const paginatedPayments = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredPayments.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredPayments.value.length / pageSize)
})

const paginationStart = computed(() => {
  return filteredPayments.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize + 1
})

const paginationEnd = computed(() => {
  return Math.min(currentPage.value * pageSize, filteredPayments.value.length)
})

const isAllSelected = computed(() => {
  if (paginatedPayments.value.length === 0) return false
  return paginatedPayments.value.every(p => selectedPayments.value.includes(p.id))
})

const isPartiallySelected = computed(() => {
  if (paginatedPayments.value.length === 0) return false
  const selected = paginatedPayments.value.filter(p => selectedPayments.value.includes(p.id))
  return selected.length > 0 && selected.length < paginatedPayments.value.length
})

const summary = computed(() => {
  return getMonthSummary(payments.value, filters.value.month, filters.value.year)
})

// Watch filters to reload
watch(
  () => [filters.value.status, filters.value.month, filters.value.year],
  () => {
    currentPage.value = 1
    selectedPayments.value = []
    loadPayments()
  },
  { deep: true }
)

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout>
watch(() => filters.value.search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
  }, 300)
})

// Methods
function getTenantName(payment: PaymentWithDetails): string {
  const titular = payment.contract?.tenants?.find(ct => ct.role === 'titular')?.tenant
  if (!titular) return '-'
  return `${titular.first_name} ${titular.last_name}`
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

async function loadPayments() {
  await fetchPayments({
    search: filters.value.search || undefined,
    status: filters.value.status !== 'all' ? filters.value.status : undefined,
    month: filters.value.month,
    year: filters.value.year,
  })
}

function clearFilters() {
  filters.value.search = ''
  filters.value.status = 'all'
}

function toggleSelectAll(checked: boolean) {
  if (checked) {
    selectedPayments.value = paginatedPayments.value.map(p => p.id)
  } else {
    selectedPayments.value = []
  }
}

function togglePaymentSelection(paymentId: string) {
  const index = selectedPayments.value.indexOf(paymentId)
  if (index === -1) {
    selectedPayments.value.push(paymentId)
  } else {
    selectedPayments.value.splice(index, 1)
  }
}

function openPaymentDialog(payment: PaymentWithDetails) {
  selectedPaymentId.value = payment.id
  paymentDialogOpen.value = true
}

function openHistoryDialog(contractId: string) {
  selectedContractId.value = contractId
  historyDialogOpen.value = true
}

function openConceptsDialog(payment: PaymentWithDetails) {
  selectedPayment.value = payment
  conceptsDialogOpen.value = true
}

async function handlePaymentSuccess() {
  await loadPayments()
  selectedPayments.value = []
}

async function handleConceptsUpdated() {
  await loadPayments()
}

function handlePrintSingle(payment: PaymentWithDetails) {
  printReceiptPDF(payment)
}

async function handlePrintSelected() {
  if (selectedPayments.value.length === 0) return

  const paymentsToPrint = await fetchPaymentsByIds(selectedPayments.value)
  if (paymentsToPrint.length > 0) {
    printReceiptPDF(paymentsToPrint)
  }
}

function handlePrintAllPaid() {
  const paidPayments = payments.value.filter(p => p.status === 'pagado')
  if (paidPayments.length > 0) {
    printReceiptPDF(paidPayments)
  }
}

function handleExportToExcel() {
  // Export current filtered payments to Excel/CSV
  const dataToExport = filteredPayments.value.map(p => ({
    [t('payments.period')]: getPeriodLabel(p),
    [t('payments.tenant')]: getTenantName(p),
    [t('payments.property')]: formatPropertyAddress(p),
    [t('payments.dueDate')]: formatDate(p.due_date),
    [t('payments.totalAmount')]: p.total_amount || p.expected_amount,
    [t('common.status')]: getStatusLabel(p.status),
    [t('payments.paymentDate', 'Fecha Pago')]: p.payment_date ? formatDate(p.payment_date) : '',
    [t('payments.receipt', 'Recibo')]: p.reference_number || '',
  }))

  // Create CSV
  const headers = Object.keys(dataToExport[0] || {}).join(',')
  const rows = dataToExport.map(row => Object.values(row).join(','))
  const csv = [headers, ...rows].join('\n')

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Pagos_${filters.value.year}-${String(filters.value.month).padStart(2, '0')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Lifecycle
onMounted(async () => {
  // Update overdue payments first
  await updateOverduePayments()
  // Then load payments
  await loadPayments()
})

onUnmounted(() => {
  // Clean up any pending search timeout to prevent memory leaks
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>
