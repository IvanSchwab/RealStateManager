<template>
  <Card
    class="relative hover:shadow-md transition-shadow"
    :class="{
      'border-l-4 border-l-red-500': payment.status === 'vencido',
      'border-l-4 border-l-green-500': payment.status === 'pagado',
      'bg-muted/30': selected,
    }"
  >
    <CardContent class="p-4">
      <!-- Selection + Header Row -->
      <div class="flex items-start gap-3">
        <!-- Selection Checkbox -->
        <Checkbox
          v-if="showCheckbox"
          :checked="selected"
          @update:model-value="$emit('toggle-select')"
          class="mt-1"
        />

        <!-- Main Content -->
        <div class="flex-1 min-w-0">
          <!-- Header: Tenant + Status -->
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="min-w-0">
              <p class="font-semibold truncate">{{ tenantName }}</p>
              <p class="text-sm text-muted-foreground truncate">{{ formatPropertyAddress(payment) }}</p>
            </div>
            <Badge :class="getStatusBadgeClass(payment.status)" class="shrink-0">
              {{ getStatusLabel(payment.status) }}
            </Badge>
          </div>

          <!-- Period and Due Date -->
          <div class="flex items-center justify-between mb-3 text-sm">
            <div class="flex items-center gap-2">
              <Calendar class="w-4 h-4 text-muted-foreground" />
              <span class="font-medium">{{ getPeriodLabel(payment) }}</span>
              <span v-if="contractProgress" class="text-xs text-muted-foreground">
                ({{ contractProgress.current }}/{{ contractProgress.total }})
              </span>
            </div>
            <div class="text-muted-foreground">
              Vence: {{ formatDate(payment.due_date) }}
            </div>
          </div>

          <!-- Overdue Warning -->
          <div
            v-if="payment.status === 'vencido' && daysOverdue > 0"
            class="flex items-center gap-2 mb-3 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400"
          >
            <AlertCircle class="w-4 h-4" />
            <span>{{ daysOverdue }} {{ daysOverdue === 1 ? 'dia' : 'dias' }} de atraso</span>
          </div>

          <!-- Amount Summary -->
          <div class="flex items-center justify-between mb-2">
            <button
              @click="showBreakdown = !showBreakdown"
              class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{{ conceptsCount > 0 ? `Alquiler + ${conceptsCount} concepto${conceptsCount > 1 ? 's' : ''}` : 'Alquiler' }}</span>
              <ChevronDown
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-180': showBreakdown }"
              />
            </button>
            <div class="text-lg font-bold">
              {{ formatCurrency(payment.total_amount || payment.expected_amount) }}
            </div>
          </div>

          <!-- Expandable Breakdown -->
          <div
            v-if="showBreakdown"
            class="mb-3 p-3 bg-muted/50 rounded-lg space-y-2 text-sm"
          >
            <div class="flex justify-between">
              <span class="text-muted-foreground">Alquiler</span>
              <span>{{ formatCurrency(payment.rent_amount || payment.expected_amount) }}</span>
            </div>
            <div
              v-for="concept in payment.concepts"
              :key="concept.id"
              class="flex justify-between"
            >
              <span class="text-muted-foreground">{{ concept.concept_name }}</span>
              <span>{{ formatCurrency(concept.amount) }}</span>
            </div>
            <Separator />
            <div class="flex justify-between font-semibold">
              <span>Total</span>
              <span>{{ formatCurrency(payment.total_amount || payment.expected_amount) }}</span>
            </div>
          </div>

          <!-- Paid Info (if paid) -->
          <div
            v-if="payment.status === 'pagado' && payment.payment_date"
            class="flex items-center gap-2 mb-3 text-sm text-green-600 dark:text-green-400"
          >
            <CheckCircle2 class="w-4 h-4" />
            <span>Pagado el {{ formatDate(payment.payment_date) }}</span>
            <span v-if="payment.payment_method" class="text-muted-foreground">
              - {{ getPaymentMethodLabel(payment.payment_method) }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 pt-3 border-t">
            <!-- Register Payment Button -->
            <Button
              v-if="payment.status !== 'pagado'"
              size="sm"
              class="flex-1"
              @click="$emit('register', payment)"
            >
              <DollarSign class="w-4 h-4 mr-2" />
              Registrar Pago
            </Button>

            <!-- Print Receipt Button -->
            <Button
              v-if="payment.status === 'pagado'"
              variant="outline"
              size="sm"
              class="flex-1"
              @click="$emit('print', payment)"
            >
              <Printer class="w-4 h-4 mr-2" />
              Imprimir Recibo
            </Button>

            <!-- Email Notification Button -->
            <Button
              v-if="canNotifyByEmail(payment)"
              variant="ghost"
              size="sm"
              :disabled="sendingNotification"
              @click="sendEmailNotification(payment)"
              title="Notificar por email"
            >
              <Mail class="w-4 h-4" />
            </Button>

            <!-- WhatsApp Notification Button -->
            <Button
              v-if="canNotifyByWhatsApp(payment)"
              variant="ghost"
              size="sm"
              @click="openWhatsApp(payment)"
              title="Notificar por WhatsApp"
            >
              <MessageCircle class="w-4 h-4" />
            </Button>

            <!-- History Button -->
            <Button
              variant="ghost"
              size="sm"
              @click="$emit('view-history', payment.contract_id)"
              title="Ver historial de pagos"
            >
              <History class="w-4 h-4" />
            </Button>

            <!-- More Options Dropdown -->
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" class="h-8 w-8">
                  <MoreHorizontal class="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  v-if="payment.status !== 'pagado'"
                  @click="$emit('edit-concepts', payment)"
                >
                  <ReceiptText class="w-4 h-4 mr-2" />
                  Editar Conceptos
                </DropdownMenuItem>
                <DropdownMenuItem @click="$emit('view-details', payment)">
                  <FileText class="w-4 h-4 mr-2" />
                  Ver Detalle
                </DropdownMenuItem>
                <DropdownMenuSeparator v-if="payment.status === 'pagado'" />
                <DropdownMenuItem
                  v-if="payment.status === 'pagado'"
                  @click="$emit('print', payment)"
                >
                  <Printer class="w-4 h-4 mr-2" />
                  Imprimir Recibo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Calendar,
  DollarSign,
  Printer,
  CheckCircle2,
  MoreHorizontal,
  ChevronDown,
  AlertCircle,
  History,
  ReceiptText,
  FileText,
  Mail,
  MessageCircle,
} from 'lucide-vue-next'
import { usePayments } from '@/composables/usePayments'
import { usePaymentNotification } from '@/composables/usePaymentNotification'
import type { PaymentWithDetails, PaymentStatus } from '@/types'

const props = defineProps<{
  payment: PaymentWithDetails
  selected?: boolean
  showCheckbox?: boolean
}>()

defineEmits<{
  (e: 'register', payment: PaymentWithDetails): void
  (e: 'print', payment: PaymentWithDetails): void
  (e: 'view-history', contractId: string): void
  (e: 'edit-concepts', payment: PaymentWithDetails): void
  (e: 'view-details', payment: PaymentWithDetails): void
  (e: 'toggle-select'): void
}>()

const {
  formatCurrency,
  formatDate,
  getPeriodLabel,
  formatPropertyAddress,
  getStatusLabel,
  getPaymentMethodLabel,
  getDaysOverdue,
  getContractProgress,
} = usePayments()

const {
  sending: sendingNotification,
  canNotifyByEmail,
  canNotifyByWhatsApp,
  openWhatsApp,
  sendEmailNotification,
} = usePaymentNotification()

// Local state
const showBreakdown = ref(false)

// Computed
const tenantName = computed(() => {
  const titular = props.payment.contract?.tenants?.find(ct => ct.role === 'titular')?.tenant
  if (!titular) return 'Sin inquilino'
  return `${titular.first_name} ${titular.last_name}`
})

const conceptsCount = computed(() => {
  return props.payment.concepts?.length || 0
})

const daysOverdue = computed(() => {
  return getDaysOverdue(props.payment)
})

const contractProgress = computed(() => {
  return getContractProgress(props.payment)
})

// Methods
function getStatusBadgeClass(status: PaymentStatus): string {
  const classes: Record<PaymentStatus, string> = {
    pendiente: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    pagado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    vencido: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    pago_parcial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  }
  return classes[status] || ''
}
</script>
