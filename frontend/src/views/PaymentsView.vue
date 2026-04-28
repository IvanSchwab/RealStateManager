<template>
  <div>
    <!-- Page Header -->
    <div class="pia-page-header">
      <div class="pia-page-title-block">
        <h1>{{ t('payments.title') }}</h1>
        <div class="pia-page-subtitle">
          <span style="text-transform:capitalize">{{ getMonthName(filterStore.month) }} {{ filterStore.year }}</span>
          <span class="pia-dot-sep" />
          <span>{{ t('payments.subtitle') }}</span>
          <span class="pia-dot-sep" />
          <span style="font-family:var(--font-mono);font-size:12px">{{ t('payments.pctCobrado', { pct: pctCobrado }) }}</span>
        </div>
      </div>
      <div class="pia-page-actions">
        <button v-if="selectedPayments.length > 0" class="pia-btn pia-btn-primary" @click="handlePrintSelected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir ({{ selectedPayments.length }})
        </button>
        <button class="pia-btn pia-btn-ghost" @click="handleNotifyAll" :disabled="bulkNotificationLoading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
          Notificar pendientes
        </button>
        <button class="pia-btn pia-btn-ghost" @click="handleExportToExcel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg>
          Exportar
        </button>
      </div>
    </div>

    <!-- Hero summary banner -->
    <div class="pia-card pia-card-lg" style="margin-bottom:var(--gap);background:linear-gradient(100deg,var(--brand-700),var(--brand-800));color:white;border:none;position:relative;overflow:hidden">
      <!-- Decorative SVG - hidden on mobile -->
      <div class="hidden md:block" style="position:absolute;right:-30px;top:-30px;width:200px;height:200px;opacity:0.12;color:white;pointer-events:none">
        <svg viewBox="0 0 1368 809.65" fill="white" width="260" style="height:auto">
          <path d="M1206.65,567.47c-102.71,97.65-289.55,180.13-508.61,219.97C345.35,851.58,34.3,765.35,3.29,594.86-27.7,424.36,260.11,172.67,612.79,108.54c29.71-5.4,58.98-9.2,87.72-11.48-249.23,79.26-389.63,216.84-363.91,358.29,31.01,170.51,323.41,282.06,670.82,199.41,73.45-17.48,140.18-48.2,199.22-87.3Z"/>
          <path d="M832.88,582.14c-39.8,4.8-79.03,6.92-117.19,6.78,222.91-75.83,339.25-248.61,317.52-374.28C1007.93,68.45,716.46,4.72,437.35,96.65c81.88-37.43,184.67-63.56,302.12-81.14,312.19-46.71,599.53,21.52,625.61,172.39,26.08,150.87-216.11,356.1-532.19,394.23Z"/>
          <ellipse cx="690.5" cy="344.93" rx="194.82" ry="158.56"/>
        </svg>
      </div>
      <!-- Main content - stacks vertically on mobile -->
      <div class="flex flex-col gap-4 md:flex-row md:justify-between md:items-start md:gap-6" style="position:relative">
        <div>
          <div style="font-size:11.5px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.75;font-weight:600">{{ t('payments.totalToCollectLabel', { month: getMonthName(filterStore.month), year: filterStore.year }) }}</div>
          <div class="text-2xl md:text-4xl" style="font-weight:500;letter-spacing:-0.02em;line-height:1.1;margin-top:6px;font-variant-numeric:tabular-nums">
            <span class="text-sm md:text-lg" style="font-weight:400;opacity:0.8;margin-right:6px">$</span>{{ (summary.totalToCollect || 0).toLocaleString('es-AR') }}
          </div>
          <div style="font-size:12.5px;opacity:0.85;margin-top:6px">{{ t('payments.collectionsAndPercent', { count: payments.length, pct: pctCobrado }) }}</div>
        </div>
        <!-- Segments - compact grid on mobile, row on desktop -->
        <div class="grid grid-cols-3 gap-2 md:flex md:gap-2 md:flex-wrap">
          <div v-for="seg in heroSegments" :key="seg.label" class="rounded-lg p-2 md:p-3 md:min-w-[130px]" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)">
            <div class="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-[11.5px]" style="opacity:0.85;font-weight:500">
              <span :style="`width:6px;height:6px;border-radius:50%;background:${seg.color};display:inline-block;flex-shrink:0`" />
              <span class="truncate">{{ seg.label }}</span>
            </div>
            <div class="text-sm md:text-xl" style="font-weight:500;margin-top:2px;letter-spacing:-0.02em;font-variant-numeric:tabular-nums">
              <span class="text-[10px] md:text-xs" style="opacity:0.8;margin-right:2px">$</span>{{ seg.amount.toLocaleString('es-AR') }}
            </div>
            <div class="hidden md:block" style="font-size:11px;opacity:0.75;margin-top:2px">{{ seg.count }} {{ seg.count === 1 ? t('payments.paymentSingular') : t('payments.paymentPlural') }}</div>
          </div>
        </div>
      </div>
      <!-- Progress bar -->
      <div style="margin-top:14px;position:relative">
        <div style="height:6px;background:rgba(255,255,255,0.15);border-radius:20px;overflow:hidden;display:flex">
          <div :style="`width:${paidFraction}%;background:rgba(134,239,172,1)`" />
          <div :style="`width:${pendingFraction}%;background:rgba(253,224,71,0.8)`" />
          <div :style="`width:${overdueFraction}%;background:rgba(252,165,165,1)`" />
        </div>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2.5" style="margin-bottom:var(--gap)">
      <!-- Search bar - full width on mobile, fixed width on desktop -->
      <div class="pia-search-bar w-full md:w-[280px] md:order-last">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="filterStore.search" :placeholder="t('payments.searchPlaceholder')" />
      </div>
      <!-- Month/Year selects + Status tabs row -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 md:flex-1">
        <!-- Status tabs -->
        <div class="flex gap-1.5 flex-shrink-0">
          <button v-for="tab in statusTabs" :key="tab.id"
            class="pia-filter-tab whitespace-nowrap" :class="{ active: filterStore.status === tab.id }"
            @click="filterStore.status = tab.id">
            {{ tab.label }}
            <span class="pia-tab-count">{{ tab.count }}</span>
          </button>
        </div>
        <div class="flex-1 hidden md:block" />
        <!-- Month/Year selects -->
        <div class="flex gap-1.5 flex-shrink-0 ml-auto">
          <select v-model="filterStore.month" class="pia-btn pia-btn-ghost" style="font-size:13px;cursor:pointer">
            <option v-for="m in 12" :key="m" :value="m">{{ getMonthName(m) }}</option>
          </select>
          <select v-model="filterStore.year" class="pia-btn pia-btn-ghost" style="font-size:13px;cursor:pointer">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Bulk Selection Toolbar -->
    <div v-if="selectedPayments.length > 0" class="pia-card" style="margin-bottom:var(--gap);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;background:var(--brand-50);border-color:var(--brand-200)">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;font-weight:500">{{ selectedPayments.length }} seleccionado{{ selectedPayments.length > 1 ? 's' : '' }}</span>
        <button class="pia-btn pia-btn-ghost pia-btn-sm" @click="selectedPayments = []">{{ t('common.deselect') }}</button>
      </div>
      <div style="display:flex;gap:6px">
        <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="bulkNotificationLoading" @click="handleNotifySelected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Notificar
        </button>
        <button class="pia-btn pia-btn-primary pia-btn-sm" @click="handlePrintSelected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" style="padding:60px;text-align:center;color:var(--pia-text-3)">{{ t('payments.loadingPayments') }}</div>

    <!-- Table (Desktop) -->
    <div v-else class="pia-card hidden md:block" style="padding:0;overflow:hidden">
      <div class="pia-scroll-x">
        <table class="pia-tbl">
          <thead>
            <tr>
              <th style="width:40px;padding-left:12px">
                <input type="checkbox" :checked="isAllSelected" :indeterminate="isPartiallySelected" @change="toggleSelectAll(($event.target as HTMLInputElement).checked)" style="cursor:pointer" />
              </th>
              <th>{{ t('payments.tenant') }}</th>
              <th>{{ t('payments.property') }}</th>
              <th>{{ t('payments.period') }}</th>
              <th>{{ t('payments.dueDate') }}</th>
              <th class="num">{{ t('payments.totalAmount') }}</th>
              <th>{{ t('common.status') }}</th>
              <th style="text-align:right">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payment in payments" :key="payment.id"
              :style="payment.status === 'vencido' ? 'background:var(--terra-bg)' : ''" :class="{ 'bg-brand-50': selectedPayments.includes(payment.id) }">
              <td style="padding-left:12px" @click.stop>
                <input type="checkbox" :checked="selectedPayments.includes(payment.id)" @change="togglePaymentSelection(payment.id)" style="cursor:pointer" />
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:30px;height:30px;border-radius:50%;background:var(--brand-100);color:var(--brand-700);display:grid;place-items:center;font-size:11px;font-weight:600;flex-shrink:0">
                    {{ getInitials(getTenantName(payment)) }}
                  </div>
                  <strong>{{ getTenantName(payment) }}</strong>
                </div>
              </td>
              <td style="color:var(--pia-text-3)">{{ formatPropertyAddress(payment) }}</td>
              <td>
                <div style="font-size:12.5px;color:var(--pia-text);font-weight:500">{{ getPeriodLabel(payment) }}</div>
                <div v-if="payment.concepts?.length" style="font-size:11px;color:var(--pia-text-4)">{{ payment.concepts.length }} {{ payment.concepts.length === 1 ? t('payments.conceptSingular') : t('payments.conceptPlural') }}</div>
              </td>
              <td>
                <div class="pia-mono" style="font-size:12px">{{ formatDate(payment.due_date) }}</div>
                <div v-if="payment.status === 'vencido'" style="font-size:10.5px;color:var(--terra);font-weight:600;margin-top:2px">{{ t('payments.daysOverdueLabel', { days: getDaysOverdue(payment) }) }}</div>
                <div v-if="payment.status === 'pagado' && payment.payment_date" style="font-size:10.5px;color:var(--sage);margin-top:2px">✓ {{ formatDate(payment.payment_date) }}</div>
              </td>
              <td class="num" style="color:var(--pia-text);font-weight:550">{{ formatCurrency(payment.total_amount || payment.expected_amount) }}</td>
              <td>
                <span class="pia-status" :class="getStatusClass(payment.status)">
                  <span class="dot" />{{ getStatusLabel(payment.status) }}
                </span>
              </td>
              <td style="text-align:right">
                <div style="display:inline-flex;gap:2px">
                  <button v-if="payment.status !== 'pagado'" class="pia-icon-btn" style="width:28px;height:28px" title="Registrar pago" @click="openPaymentDialog(payment)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </button>
                  <button v-if="canNotifyByEmail(payment)" class="pia-icon-btn" style="width:28px;height:28px" title="Notificar por email" :disabled="sendingNotification" @click="sendEmailNotification(payment)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
                  </button>
                  <button v-if="canNotifyByWhatsApp(payment)" class="pia-icon-btn" style="width:28px;height:28px" title="Notificar por WhatsApp" @click="openWhatsApp(payment)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  </button>
                  <button v-if="payment.status === 'pagado'" class="pia-icon-btn" style="width:28px;height:28px" title="Imprimir recibo" @click="handlePrintSingle(payment)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  </button>
                  <button class="pia-icon-btn" style="width:28px;height:28px" title="Ver historial" @click="openHistoryDialog(payment.contract_id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                  </button>
                  <button v-if="payment.status !== 'pagado'" class="pia-icon-btn" style="width:28px;height:28px" title="Editar conceptos" @click="openConceptsDialog(payment)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && payments.length === 0" class="pia-empty">
          <div class="pia-empty-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h3"/></svg>
          </div>
          <div>{{ hasActiveFilters ? t('payments.noPaymentsFiltered') : t('payments.noPayments') }}</div>
          <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm" @click="clearFilters">{{ t('common.clearFilters') }}</button>
        </div>
      </div>
      <div class="pia-tbl-footer">
        <span>{{ t('payments.showingCount', { count: payments.length, total: filterStore.totalCount }) }}</span>
        <div style="display:flex;gap:4px">
          <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage === 1" @click="goToPreviousPage">← {{ t('common.previous') }}</button>
          <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage >= totalPages" @click="goToNextPage">{{ t('common.next') }} →</button>
        </div>
      </div>
    </div>

    <!-- Mobile Cards -->
    <div v-if="!loading" class="flex flex-col gap-3 md:hidden">
      <!-- Mobile Selection Toggle -->
      <div class="pia-card" style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <input type="checkbox" :checked="isAllSelected" :indeterminate="isPartiallySelected" @change="toggleSelectAll(($event.target as HTMLInputElement).checked)" style="cursor:pointer" />
          <span style="font-size:13px;color:var(--pia-text-3)">
            {{ selectedPayments.length > 0 ? `${selectedPayments.length} seleccionado${selectedPayments.length > 1 ? 's' : ''}` : 'Seleccionar todos' }}
          </span>
        </div>
        <div v-if="selectedPayments.length > 0" style="display:flex;gap:6px">
          <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="bulkNotificationLoading" @click="handleNotifySelected">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
          <button class="pia-btn pia-btn-primary pia-btn-sm" @click="handlePrintSelected">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          </button>
        </div>
      </div>

      <!-- Payment Cards -->
      <PaymentCard
        v-for="payment in payments"
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

      <!-- Mobile Empty State -->
      <div v-if="payments.length === 0" class="pia-card" style="padding:40px 20px;text-align:center">
        <div style="color:var(--pia-text-4);margin-bottom:8px">{{ hasActiveFilters ? t('payments.noPaymentsFiltered') : t('payments.noPayments') }}</div>
        <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm" @click="clearFilters">{{ t('common.clearFilters') }}</button>
      </div>

      <!-- Mobile Pagination -->
      <div v-if="totalPages > 1" style="display:flex;justify-content:center;align-items:center;gap:12px;padding:12px 0">
        <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage === 1" @click="goToPreviousPage">← {{ t('common.previous') }}</button>
        <span style="font-size:13px;color:var(--pia-text-3)">{{ filterStore.currentPage }} / {{ totalPages }}</span>
        <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage >= totalPages" @click="goToNextPage">{{ t('common.next') }} →</button>
      </div>
    </div>

    <!-- Dialogs -->
    <PaymentDialog v-model:open="paymentDialogOpen" :payment-id="selectedPaymentId" @success="handlePaymentSuccess" />
    <PaymentHistoryDialog v-model:open="historyDialogOpen" :contract-id="selectedContractId" @payment-registered="handlePaymentSuccess" />
    <Dialog v-model:open="conceptsDialogOpen">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>{{ t('payments.editConcepts') }}</DialogTitle>
          <DialogDescription v-if="selectedPayment">{{ getPeriodLabel(selectedPayment) }} - {{ formatPropertyAddress(selectedPayment) }}</DialogDescription>
        </DialogHeader>
        <PaymentConceptsManager v-if="selectedPayment" :payment-id="selectedPayment.id" :contract-id="selectedPayment.contract_id" @update="handleConceptsUpdated" />
        <div class="flex justify-end pt-4">
          <button class="pia-btn pia-btn-ghost" @click="conceptsDialogOpen = false">{{ t('common.close') }}</button>
        </div>
      </DialogContent>
    </Dialog>
    <BulkNotificationResultModal v-model:open="bulkResultModalOpen" :result="bulkNotificationResult" @close="bulkResultModalOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PaymentCard from '@/components/payments/PaymentCard.vue'
import PaymentDialog from '@/components/payments/PaymentDialog.vue'
import PaymentHistoryDialog from '@/components/payments/PaymentHistoryDialog.vue'
import PaymentConceptsManager from '@/components/payments/PaymentConceptsManager.vue'
import BulkNotificationResultModal from '@/components/payments/BulkNotificationResultModal.vue'
import { usePayments } from '@/composables/usePayments'
import { usePaymentNotification } from '@/composables/usePaymentNotification'
import { useBulkNotification, type BulkNotificationResult } from '@/composables/useBulkNotification'
import { useReceiptPDF } from '@/composables/useReceiptPDF'
import { useDate } from '@/composables/useDate'
import { useDebounce } from '@/composables/useDebounce'
import { usePaymentsFilterStore } from '@/stores/filters/usePaymentsFilterStore'
import { storeToRefs } from 'pinia'
import type { PaymentWithDetails, PaymentStatus } from '@/types'

const { t } = useI18n()
const { payments, loading, fetchPayments, fetchPaymentsByIds, updateOverduePayments, getMonthSummary, formatCurrency, getPeriodLabel, formatPropertyAddress, getStatusLabel, getDaysOverdue } = usePayments()
const { formatDate, getMonthName } = useDate()
const { printReceiptPDF } = useReceiptPDF()
const { sending: sendingNotification, canNotifyByEmail, canNotifyByWhatsApp, openWhatsApp, sendEmailNotification } = usePaymentNotification()
const { loading: bulkNotificationLoading, notifySelected: bulkNotifySelected, notifyAll: bulkNotifyAll } = useBulkNotification()
const filterStore = usePaymentsFilterStore()
const { search } = storeToRefs(filterStore)
const debouncedSearch = useDebounce(search, 300)

const selectedPayments = ref<string[]>([])
const paymentDialogOpen = ref(false)
const selectedPaymentId = ref('')
const historyDialogOpen = ref(false)
const selectedContractId = ref('')
const conceptsDialogOpen = ref(false)
const selectedPayment = ref<PaymentWithDetails | null>(null)
const bulkResultModalOpen = ref(false)
const bulkNotificationResult = ref<BulkNotificationResult>({ sent: 0, skipped: 0, failed: 0, total: 0, whatsappPending: [] })

const hasActiveFilters = computed(() => filterStore.search !== '' || filterStore.status !== 'all')
const yearOptions = computed(() => { const y = new Date().getFullYear(); return [y - 1, y, y + 1] })
const totalPages = computed(() => Math.ceil(filterStore.totalCount / filterStore.pageSize))

const isAllSelected = computed(() => payments.value.length > 0 && payments.value.every(p => selectedPayments.value.includes(p.id)))
const isPartiallySelected = computed(() => { const s = payments.value.filter(p => selectedPayments.value.includes(p.id)); return s.length > 0 && s.length < payments.value.length })
const summary = computed(() => getMonthSummary(payments.value, filterStore.month, filterStore.year))

const pctCobrado = computed(() => {
  const t = summary.value.totalToCollect || 0
  if (!t) return 0
  return Math.round((summary.value.collected / t) * 100)
})
const paidFraction = computed(() => { const t = summary.value.totalToCollect || 1; return Math.round((summary.value.collected / t) * 100) })
const pendingFraction = computed(() => { const t = summary.value.totalToCollect || 1; return Math.round((summary.value.pending / t) * 100) })
const overdueFraction = computed(() => { const t = summary.value.totalToCollect || 1; return Math.round((summary.value.overdue / t) * 100) })

const heroSegments = computed(() => [
  { label: t('payments.collected'), amount: summary.value.collected || 0, count: summary.value.paidCount || 0, color: 'rgba(134,239,172,1)' },
  { label: t('payments.pending'), amount: summary.value.pending || 0, count: summary.value.pendingCount || 0, color: 'rgba(253,224,71,1)' },
  { label: t('payments.overdue'), amount: summary.value.overdue || 0, count: summary.value.overdueCount || 0, color: 'rgba(252,165,165,1)' },
])

const statusTabs = computed(() => [
  { id: 'all' as const, label: t('payments.allStatus'), count: filterStore.totalCount },
  { id: 'pagado' as const, label: t('payments.collectedTab'), count: summary.value.paidCount || 0 },
  { id: 'pendiente' as const, label: t('contracts.pending'), count: summary.value.pendingCount || 0 },
  { id: 'vencido' as const, label: t('contracts.overdue'), count: summary.value.overdueCount || 0 },
])

function getTenantName(payment: PaymentWithDetails) {
  const titular = payment.contract?.tenants?.find((ct: any) => ct.role === 'titular')?.tenant
  if (!titular) return '-'
  return `${titular.first_name} ${titular.last_name}`
}

function getInitials(name: string) {
  return name.split(' ').filter((w: string) => w[0]).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}

function getStatusClass(status: PaymentStatus) {
  const map: Record<PaymentStatus, string> = { pagado: 'ok', pendiente: 'pending', vencido: 'late', pago_parcial: 'pending' }
  return map[status] || 'draft'
}

function clearFilters() { filterStore.resetFilters(); loadPayments() }
function goToPreviousPage() { filterStore.setPage(filterStore.currentPage - 1); selectedPayments.value = []; loadPayments() }
function goToNextPage() { filterStore.setPage(filterStore.currentPage + 1); selectedPayments.value = []; loadPayments() }
function openPaymentDialog(payment: PaymentWithDetails) { selectedPaymentId.value = payment.id; paymentDialogOpen.value = true }
function openHistoryDialog(contractId: string) { selectedContractId.value = contractId; historyDialogOpen.value = true }
function openConceptsDialog(payment: PaymentWithDetails) { selectedPayment.value = payment; conceptsDialogOpen.value = true }
async function handlePaymentSuccess() { await loadPayments(); selectedPayments.value = [] }
async function handleConceptsUpdated() { await loadPayments() }
function handlePrintSingle(payment: PaymentWithDetails) { printReceiptPDF(payment) }

function toggleSelectAll(checked: boolean) {
  if (checked) {
    selectedPayments.value = payments.value.map(p => p.id)
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

async function handlePrintSelected() {
  if (selectedPayments.value.length === 0) return
  const paymentsToPrint = await fetchPaymentsByIds(selectedPayments.value)
  if (paymentsToPrint.length > 0) {
    printReceiptPDF(paymentsToPrint)
  }
}

async function handleNotifySelected() {
  if (selectedPayments.value.length === 0) return
  const result = await bulkNotifySelected(selectedPayments.value)
  bulkNotificationResult.value = result
  bulkResultModalOpen.value = true
  selectedPayments.value = []
  await loadPayments()
}

function handleExportToExcel() {
  const dataToExport = payments.value.map(p => ({
    [t('payments.period')]: getPeriodLabel(p),
    [t('payments.tenant')]: getTenantName(p),
    [t('payments.property')]: formatPropertyAddress(p),
    [t('payments.dueDate')]: formatDate(p.due_date),
    [t('payments.totalAmount')]: p.total_amount || p.expected_amount,
    [t('common.status')]: getStatusLabel(p.status),
    [t('payments.paymentDate', 'Fecha Pago')]: p.payment_date ? formatDate(p.payment_date) : '',
    [t('payments.receipt', 'Recibo')]: p.reference_number || '',
  }))
  const headers = Object.keys(dataToExport[0] || {}).join(',')
  const rows = dataToExport.map(row => Object.values(row).join(','))
  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Pagos_${filterStore.year}-${String(filterStore.month).padStart(2, '0')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

async function handleNotifyAll() {
  const eligible = payments.value.filter(p => p.status === 'pendiente' || p.status === 'vencido')
  if (!eligible.length) return
  const result = await bulkNotifyAll(eligible)
  bulkNotificationResult.value = result
  bulkResultModalOpen.value = true
  selectedPayments.value = []
  await loadPayments()
}

async function loadPayments() {
  const result = await fetchPayments(
    { search: filterStore.search || undefined, status: filterStore.status !== 'all' ? filterStore.status : undefined, month: filterStore.month, year: filterStore.year },
    { page: filterStore.currentPage, pageSize: filterStore.pageSize }
  )
  if (result) filterStore.setTotalCount(result.totalCount)
}

watch(() => [filterStore.status, filterStore.month, filterStore.year], () => { filterStore.resetPage(); selectedPayments.value = []; loadPayments() })
watch(debouncedSearch, () => { filterStore.resetPage(); selectedPayments.value = []; loadPayments() })
onMounted(async () => { await updateOverduePayments(); await loadPayments() })
</script>
