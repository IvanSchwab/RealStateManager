<template>
  <div>
    <!-- Page Header -->
    <div class="pia-page-header">
      <div class="pia-page-title-block">
        <h1>{{ t('dashboard.title') }}</h1>
        <div class="pia-page-subtitle">
          <span>{{ t('dashboard.summary') }}</span>
          <span class="pia-dot-sep" />
          <span style="font-family:var(--font-mono);font-size:12px">{{ currentMonthLabel }}</span>
        </div>
      </div>
      <div class="pia-page-actions">
        <button class="pia-btn pia-btn-ghost" @click="handleRefresh" :disabled="loading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" :style="loading ? 'animation:pia-spin 1s linear infinite' : ''">
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>
          </svg>
          {{ t('dashboard.refresh') }}
        </button>
        <RouterLink to="/payments" class="pia-btn pia-btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          {{ t('dashboard.newPayment') }}
        </RouterLink>
      </div>
    </div>

    <!-- KPIs -->
    <div class="pia-grid pia-grid-4" style="margin-bottom:var(--gap)">
      <!-- Ingresos del mes -->
      <div class="pia-kpi">
        <div class="pia-kpi-head">
          <div class="pia-kpi-label">
            <div class="pia-kpi-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span>{{ t('dashboard.monthlyIncome') }}</span>
          </div>
          <span class="pia-chip" :class="incomeKPIs.monthOverMonthChange >= 0 ? 'up' : 'down'">
            {{ incomeKPIs.monthOverMonthChange >= 0 ? '+' : '' }}{{ incomeKPIs.monthOverMonthChange.toFixed(1) }}%
          </span>
        </div>
        <div class="pia-kpi-value">
          <span class="pia-currency">$</span>
          <span>{{ formatKpiValue(incomeKPIs.currentMonthIncome) }}</span>
        </div>
        <div class="pia-kpi-meta"><span>{{ t('dashboard.vsPreviousMonth') }}</span></div>
      </div>

      <!-- Pendiente de cobro -->
      <div class="pia-kpi">
        <div class="pia-kpi-head">
          <div class="pia-kpi-label">
            <div class="pia-kpi-icon amber">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            </div>
            <span>{{ t('dashboard.pendingCollection') }}</span>
          </div>
        </div>
        <div class="pia-kpi-value">
          <span class="pia-currency">$</span>
          <span>{{ formatKpiValue(incomeKPIs.pendingIncome) }}</span>
        </div>
        <div class="pia-kpi-meta"><span>{{ t('dashboard.pendingPaymentsCount', { count: paymentDistribution.pendingCount }) }}</span></div>
      </div>

      <!-- Pagos vencidos -->
      <div class="pia-kpi">
        <div class="pia-kpi-head">
          <div class="pia-kpi-label">
            <div class="pia-kpi-icon terra">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18v.01"/></svg>
            </div>
            <span>{{ t('dashboard.overduePayments') }}</span>
          </div>
          <span class="pia-chip down">{{ t('dashboard.overdueCount', { count: incomeKPIs.overdueCount }) }}</span>
        </div>
        <div class="pia-kpi-value">
          <span class="pia-currency">$</span>
          <span>{{ formatKpiValue(incomeKPIs.overdueAmount) }}</span>
        </div>
        <div class="pia-kpi-meta"><span>{{ t('dashboard.requiresAttention') }}</span></div>
      </div>

      <!-- Ocupación -->
      <div class="pia-kpi">
        <div class="pia-kpi-head">
          <div class="pia-kpi-label">
            <div class="pia-kpi-icon sage">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>
            </div>
            <span>{{ t('activity.recentActivity') }}</span>
          </div>
        </div>
        <div class="pia-kpi-value">
          <span>{{ recentPayments.length }}</span>
        </div>
        <div class="pia-kpi-meta"><span>{{ t('dashboard.paymentsThisPeriod') }}</span></div>
      </div>
    </div>

    <!-- Recent Payments + Expiring Contracts -->
    <div class="pia-grid pia-grid-2" style="margin-bottom:var(--gap)">
      <!-- Pagos recientes -->
      <div class="pia-card pia-card-lg">
        <div class="pia-card-head">
          <div>
            <div class="pia-card-title">
              <div class="pia-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h3"/></svg>
              </div>
              {{ t('activity.recentPayments') }}
            </div>
            <div class="pia-card-sub" style="margin-top:4px;padding-left:30px">{{ t('dashboard.lastNRecords', { count: recentPayments.length }) }}</div>
          </div>
          <RouterLink to="/payments" class="pia-btn pia-btn-subtle pia-btn-sm">
            {{ t('contracts.viewAll') }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </RouterLink>
        </div>
        <div class="pia-scroll-x">
          <table class="pia-tbl">
            <thead>
              <tr>
                <th>{{ t('contracts.tenant') }}</th>
                <th>{{ t('contracts.property') }}</th>
                <th>{{ t('common.date') }}</th>
                <th class="num">{{ t('common.amount') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in recentPayments.slice(0, 5)" :key="p.id">
                <td><strong>{{ p.tenantName }}</strong></td>
                <td style="color:var(--pia-text-3);font-size:12px">{{ p.propertyAddress }}</td>
                <td class="pia-mono" style="font-size:12px">{{ formatDate(p.paymentDate) }}</td>
                <td class="num" style="color:var(--pia-text);font-weight:550">{{ formatCurrency(p.amount) }}</td>
              </tr>
              <tr v-if="!loading && recentPayments.length === 0">
                <td colspan="4">
                  <div class="pia-empty" style="padding:20px">{{ t('activity.noRecentPayments') }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Contratos por vencer -->
      <div class="pia-card pia-card-lg">
        <div class="pia-card-head">
          <div>
            <div class="pia-card-title">
              <div class="pia-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/></svg>
              </div>
              {{ t('activity.expiringContracts') }}
            </div>
            <div class="pia-card-sub" style="margin-top:4px;padding-left:30px">{{ t('dashboard.next90Days') }}</div>
          </div>
          <RouterLink to="/contracts" class="pia-btn pia-btn-subtle pia-btn-sm">
            {{ t('dashboard.manage') }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </RouterLink>
        </div>
        <div style="display:flex;flex-direction:column">
          <div
            v-for="(c, i) in expiringContracts.slice(0, 5)"
            :key="c.id"
            style="display:flex;align-items:center;gap:14px;padding:14px 0"
            :style="i < expiringContracts.length - 1 ? 'border-bottom:1px solid var(--pia-border)' : ''"
          >
            <div style="width:40px;height:40px;border-radius:10px;background:var(--brand-100);display:grid;place-items:center;color:var(--brand-700);flex-shrink:0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13.5px;font-weight:550;color:var(--pia-text)">{{ c.tenantName }}</div>
              <div style="font-size:12px;color:var(--pia-text-3)">{{ c.propertyAddress }}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:12.5px;color:var(--pia-text);font-weight:500">{{ formatDate(c.endDate) }}</div>
              <span class="pia-chip" :class="c.daysRemaining <= 15 ? 'warn' : 'neutral'" style="margin-top:3px">{{ t('dashboard.inDays', { days: c.daysRemaining }) }}</span>
            </div>
          </div>
          <div v-if="!loading && expiringContracts.length === 0" class="pia-empty" style="padding:20px">
            {{ t('activity.noExpiringContracts') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Income Chart + Payment Donut -->
    <div class="pia-grid pia-grid-chart" style="margin-bottom:var(--gap)">
      <!-- Income Bar Chart -->
      <div class="pia-card pia-card-lg">
        <div class="pia-card-head">
          <div>
            <div class="pia-card-title">{{ t('dashboard.incomeByMonth') }}</div>
            <div class="pia-card-sub" style="margin-top:4px">{{ t('dashboard.collectedVsPending', { months: chartPeriod }) }}</div>
          </div>
          <div class="pia-segmented">
            <button v-for="opt in chartPeriodOptions" :key="opt.value"
              :class="{ active: chartPeriod === opt.value }"
              @click="handlePeriodChange(opt.value)">{{ opt.label }}</button>
          </div>
        </div>
        <svg v-if="incomeChartData.length > 0" :viewBox="`0 0 ${W} ${H}`" style="width:100%;height:auto;display:block">
          <!-- gridlines -->
          <g v-for="(t, i) in yTicks" :key="i">
            <line :x1="PAD_L" :y1="tickY(t)" :x2="W - PAD_R" :y2="tickY(t)"
              stroke="var(--pia-border)" :stroke-dasharray="i === 0 ? '0' : '2 3'" />
            <text :x="PAD_L - 8" :y="tickY(t) + 3" font-size="10" fill="var(--pia-text-4)" text-anchor="end" :font-family="'var(--font-mono)'">
              {{ t === 0 ? '0' : '$' + Math.round(t / 1000) + 'k' }}
            </text>
          </g>
          <!-- bars -->
          <g v-for="(d, i) in incomeChartData" :key="i">
            <rect :x="barX(i)" :y="barYPend(d)" :width="barW" :height="barHPend(d)"
              fill="var(--amber)" :opacity="i === incomeChartData.length - 1 ? 0.85 : 0.5" rx="2" />
            <rect :x="barX(i)" :y="barYCob(d)" :width="barW" :height="barHCob(d)"
              fill="var(--brand-700)" rx="2" />
            <text :x="barX(i) + barW / 2" :y="H - PAD_B + 16" font-size="10.5" fill="var(--pia-text-3)" text-anchor="middle">{{ d.monthLabel }}</text>
          </g>
        </svg>
        <div v-else style="height:220px;display:grid;place-items:center;color:var(--pia-text-4);font-size:13px">
          {{ loading ? t('common.loading') : t('dashboard.noData') }}
        </div>
        <div style="display:flex;gap:20px;justify-content:center;margin-top:12px;font-size:12px;color:var(--pia-text-3)">
          <span style="display:flex;align-items:center;gap:6px">
            <span style="width:10px;height:10px;border-radius:2px;background:var(--brand-700);display:inline-block"></span> {{ t('payments.collected') }}
          </span>
          <span style="display:flex;align-items:center;gap:6px">
            <span style="width:10px;height:10px;border-radius:2px;background:var(--amber);display:inline-block"></span> {{ t('payments.pending') }}
          </span>
        </div>
      </div>

      <!-- Payment Donut -->
      <div class="pia-card pia-card-lg">
        <div class="pia-card-head">
          <div>
            <div class="pia-card-title">{{ t('dashboard.paymentDistribution') }}</div>
            <div class="pia-card-sub" style="margin-top:4px">{{ currentMonthLabel }}</div>
          </div>
        </div>
        <div style="display:flex;gap:20px;align-items:center;padding-top:4px">
          <div style="position:relative;flex-shrink:0">
            <svg width="160" height="160" viewBox="0 0 180 180" style="transform:rotate(-90deg)">
              <circle cx="90" cy="90" r="62" fill="none" stroke="var(--pia-surface-3)" stroke-width="16" />
              <circle cx="90" cy="90" r="62" fill="none" stroke="var(--sage)"
                :stroke-dasharray="`${donutArcs.paid} ${donutC}`"
                :stroke-dashoffset="0" stroke-width="16" stroke-linecap="butt" />
              <circle cx="90" cy="90" r="62" fill="none" stroke="var(--amber)"
                :stroke-dasharray="`${donutArcs.pending} ${donutC}`"
                :stroke-dashoffset="-donutArcs.paid" stroke-width="16" stroke-linecap="butt" />
              <circle cx="90" cy="90" r="62" fill="none" stroke="var(--terra)"
                :stroke-dasharray="`${donutArcs.overdue} ${donutC}`"
                :stroke-dashoffset="-(donutArcs.paid + donutArcs.pending)" stroke-width="16" stroke-linecap="butt" />
            </svg>
            <div style="position:absolute;inset:0;display:grid;place-items:center">
              <div style="text-align:center">
                <div style="font-size:11px;color:var(--pia-text-3);letter-spacing:0.04em;text-transform:uppercase;font-weight:600">{{ t('contracts.total') }}</div>
                <div style="font-size:28px;font-weight:500;letter-spacing:-0.02em;color:var(--pia-text);line-height:1">{{ donutTotal }}</div>
              </div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;flex:1;min-width:0">
            <div v-for="(seg, i) in donutSegments" :key="i"
              style="display:flex;align-items:center;gap:10px;padding:8px 0"
              :style="i < donutSegments.length - 1 ? 'border-bottom:1px solid var(--pia-border)' : ''">
              <span :style="`width:8px;height:8px;border-radius:2px;background:${seg.color};flex-shrink:0;display:inline-block`" />
              <div style="flex:1;min-width:0">
                <div style="font-size:12.5px;color:var(--pia-text);font-weight:500">{{ seg.label }}</div>
                <div style="font-size:11px;color:var(--pia-text-3)">{{ seg.count }} {{ seg.count === 1 ? t('payments.paymentSingular') : t('payments.paymentPlural') }}</div>
              </div>
              <div style="font-size:12.5px;color:var(--pia-text);font-family:var(--font-mono);font-weight:500">
                {{ formatCurrency(seg.amount) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Datos de mercado -->
    <div class="pia-section-divider" style="margin-bottom:14px">
      <span style="font-size:11px;font-weight:600;color:var(--pia-text-3);letter-spacing:0.1em;text-transform:uppercase">{{ t('dashboard.marketData') }}</span>
      <div class="pia-section-divider-line" />
      <span style="font-size:11px;color:var(--pia-text-4)">{{ t('dashboard.marketContext') }}</span>
    </div>
    <div class="pia-grid pia-grid-3" style="margin-bottom:var(--gap)">
      <!-- Dólar Blue -->
      <div class="pia-card">
        <div class="pia-card-head" style="margin-bottom:10px">
          <div class="pia-card-title">
            <div class="pia-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            {{ t('dashboard.dolarBlue') }}
          </div>
          <span class="pia-chip neutral pia-mono" style="font-size:10.5px">ARS</span>
        </div>
        <div style="display:flex;gap:16px">
          <div style="flex:1">
            <div style="font-size:10.5px;color:var(--pia-text-4);letter-spacing:0.06em;text-transform:uppercase;font-weight:600">{{ t('dashboard.buy') }}</div>
            <div style="font-size:22px;font-weight:500;letter-spacing:-0.02em;color:var(--pia-text);line-height:1.1;margin-top:2px;font-variant-numeric:tabular-nums">
              <span style="font-size:13px;color:var(--pia-text-3)">$ </span>{{ economicIndicators.dolarBlue.compra?.toLocaleString('es-AR') || '—' }}
            </div>
          </div>
          <div class="pia-vr" />
          <div style="flex:1">
            <div style="font-size:10.5px;color:var(--pia-text-4);letter-spacing:0.06em;text-transform:uppercase;font-weight:600">{{ t('dashboard.sell') }}</div>
            <div style="font-size:22px;font-weight:500;letter-spacing:-0.02em;color:var(--pia-text);line-height:1.1;margin-top:2px;font-variant-numeric:tabular-nums">
              <span style="font-size:13px;color:var(--pia-text-3)">$ </span>{{ economicIndicators.dolarBlue.venta?.toLocaleString('es-AR') || '—' }}
            </div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--pia-text-4);margin-top:10px;display:flex;align-items:center;gap:5px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          {{ economicIndicators.dolarBlue.fecha || t('dashboard.noData') }}
        </div>
      </div>

      <!-- Dólar Oficial -->
      <div class="pia-card">
        <div class="pia-card-head" style="margin-bottom:10px">
          <div class="pia-card-title">
            <div class="pia-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            {{ t('dashboard.dolarOficial') }}
          </div>
          <span class="pia-chip neutral pia-mono" style="font-size:10.5px">ARS</span>
        </div>
        <div style="display:flex;gap:16px">
          <div style="flex:1">
            <div style="font-size:10.5px;color:var(--pia-text-4);letter-spacing:0.06em;text-transform:uppercase;font-weight:600">{{ t('dashboard.buy') }}</div>
            <div style="font-size:22px;font-weight:500;letter-spacing:-0.02em;color:var(--pia-text);line-height:1.1;margin-top:2px;font-variant-numeric:tabular-nums">
              <span style="font-size:13px;color:var(--pia-text-3)">$ </span>{{ economicIndicators.dolarOficial.compra?.toLocaleString('es-AR') || '—' }}
            </div>
          </div>
          <div class="pia-vr" />
          <div style="flex:1">
            <div style="font-size:10.5px;color:var(--pia-text-4);letter-spacing:0.06em;text-transform:uppercase;font-weight:600">{{ t('dashboard.sell') }}</div>
            <div style="font-size:22px;font-weight:500;letter-spacing:-0.02em;color:var(--pia-text);line-height:1.1;margin-top:2px;font-variant-numeric:tabular-nums">
              <span style="font-size:13px;color:var(--pia-text-3)">$ </span>{{ economicIndicators.dolarOficial.venta?.toLocaleString('es-AR') || '—' }}
            </div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--pia-text-4);margin-top:10px;display:flex;align-items:center;gap:5px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="11" height="11"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          {{ economicIndicators.dolarOficial.fecha || t('dashboard.noData') }}
        </div>
      </div>

      <!-- Inflación -->
      <div class="pia-card" style="position:relative;overflow:hidden">
        <div class="pia-card-head" style="margin-bottom:10px">
          <div class="pia-card-title">
            <div class="pia-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
            </div>
            {{ t('dashboard.monthlyInflation') }}
          </div>
          <span class="pia-chip neutral" style="font-size:10.5px">{{ economicIndicators.inflacion.mes || '—' }}</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:10px">
          <div style="font-size:40px;font-weight:500;letter-spacing:-0.02em;color:var(--pia-text);line-height:1">
            {{ economicIndicators.inflacion.valor?.toFixed(1) || '—' }}<span style="font-size:20px;color:var(--pia-text-3)">%</span>
          </div>
          <span class="pia-chip warn">{{ t('dashboard.vsUpward') }}</span>
        </div>
      </div>
    </div>

    <!-- Hidden dialogs kept for functionality -->
    <AdjustmentCorrectionDialog
      v-model:open="showCorrectionDialog"
      :adjustment="selectedEstimatedAdjustment"
      :official-percentage="officialInflationPercentage"
      :loading="adjustmentsLoading"
      @apply-correction="handleApplyCorrection"
      @keep-estimated="handleKeepEstimated"
    />
    <Dialog v-model:open="showHistoryDialog">
      <DialogContent class="max-w-4xl max-h-[80vh] overflow-y-auto">
        <AdjustmentHistoryList :adjustments="adjustmentHistoryList" :loading="adjustmentsLoading" />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AdjustmentCorrectionDialog, AdjustmentHistoryList } from '@/components/adjustments'
import { useDashboard } from '@/composables/useDashboard'
import { useAutomaticAdjustments } from '@/composables/useAutomaticAdjustments'

import type { AdjustmentHistory } from '@/types'



const { t } = useI18n()

const {
  loading,
  incomeKPIs, economicIndicators, incomeChartData, paymentDistribution,
  recentPayments, expiringContracts, formatCurrency, getMonthName, fetchAllData, fetchChartData,
} = useDashboard()

const {
  loading: adjustmentsLoading, getAdjustmentCounts,
  getEstimatedAdjustments, correctEstimatedAdjustment, keepEstimatedAdjustment,
} = useAutomaticAdjustments()


const chartPeriod = ref(6)
const chartPeriodOptions = computed(() => [
  { label: t('dashboard.months3'), value: 3 },
  { label: t('dashboard.months6'), value: 6 },
  { label: t('dashboard.months12'), value: 12 },
])

const adjustmentCounts = ref({ applied: 0, estimated: 0, pending: 0 })
const showCorrectionDialog = ref(false)
const showHistoryDialog = ref(false)
const selectedEstimatedAdjustment = ref<AdjustmentHistory | null>(null)
const estimatedAdjustmentsList = ref<AdjustmentHistory[]>([])
const adjustmentHistoryList = ref<AdjustmentHistory[]>([])
const officialInflationPercentage = ref(0)

const currentMonthLabel = computed(() => {
  const now = new Date()
  return `${getMonthName(now.getMonth() + 1)} ${now.getFullYear()}`
})

// Chart SVG constants
const W = 560, H = 220, PAD_L = 48, PAD_B = 28, PAD_T = 10, PAD_R = 12

const chartMax = computed(() =>
  Math.max(...incomeChartData.value.map(d => d.collected + d.pending), 1)
)
const barGroupW = computed(() => incomeChartData.value.length > 0 ? (W - PAD_L - PAD_R) / incomeChartData.value.length : 0)
const barW = computed(() => Math.min(36, barGroupW.value * 0.52))
const yTicks = computed(() =>
  Array.from({ length: 5 }, (_, i) => (chartMax.value / 4) * i)
)
const tickY = (t: number) => PAD_T + (H - PAD_B - PAD_T) - (t / chartMax.value) * (H - PAD_B - PAD_T)
const barX = (i: number) => PAD_L + i * barGroupW.value + (barGroupW.value - barW.value) / 2
const barHCob = (d: { collected: number; pending: number }) => (d.collected / chartMax.value) * (H - PAD_B - PAD_T)
const barHPend = (d: { collected: number; pending: number }) => (d.pending / chartMax.value) * (H - PAD_B - PAD_T)
const barYCob = (d: { collected: number; pending: number }) => PAD_T + (H - PAD_B - PAD_T) - barHCob(d)
const barYPend = (d: { collected: number; pending: number }) => barYCob(d) - barHPend(d)

// Donut chart
const donutC = 2 * Math.PI * 62
const donutTotal = computed(() =>
  (paymentDistribution.value.paidCount || 0) + (paymentDistribution.value.pendingCount || 0) + (paymentDistribution.value.overdueCount || 0)
)
const donutArcs = computed(() => {
  const total = donutTotal.value || 1
  return {
    paid: (paymentDistribution.value.paidCount / total) * donutC,
    pending: (paymentDistribution.value.pendingCount / total) * donutC,
    overdue: (paymentDistribution.value.overdueCount / total) * donutC,
  }
})
const donutSegments = computed(() => [
  { label: t('dashboard.collectedPlural'), count: paymentDistribution.value.paidCount, amount: paymentDistribution.value.paid, color: 'var(--sage)' },
  { label: t('contracts.pending'), count: paymentDistribution.value.pendingCount, amount: paymentDistribution.value.pending, color: 'var(--amber)' },
  { label: t('contracts.overdue'), count: paymentDistribution.value.overdueCount, amount: paymentDistribution.value.overdue, color: 'var(--terra)' },
])

function formatKpiValue(n: number) {
  if (n == null) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'k'
  return String(n)
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function handlePeriodChange(months: number) {
  chartPeriod.value = months
  await fetchChartData(months)
}

async function handleRefresh() {
  await Promise.all([fetchAllData(chartPeriod.value), refreshAdjustmentCounts()])
}

async function refreshAdjustmentCounts() {
  try { adjustmentCounts.value = await getAdjustmentCounts() } catch {}
}

async function handleApplyCorrection(adjustmentId: string, percentage: number) {
  try {
    await correctEstimatedAdjustment(adjustmentId, percentage)
    showCorrectionDialog.value = false
    await refreshAdjustmentCounts()
    await fetchAllData(chartPeriod.value)
    estimatedAdjustmentsList.value = await getEstimatedAdjustments()
    if (estimatedAdjustmentsList.value.length > 0) {
      selectedEstimatedAdjustment.value = estimatedAdjustmentsList.value[0]
      showCorrectionDialog.value = true
    }
  } catch {}
}

async function handleKeepEstimated(adjustmentId: string) {
  try {
    await keepEstimatedAdjustment(adjustmentId)
    showCorrectionDialog.value = false
    await refreshAdjustmentCounts()
    estimatedAdjustmentsList.value = await getEstimatedAdjustments()
    if (estimatedAdjustmentsList.value.length > 0) {
      selectedEstimatedAdjustment.value = estimatedAdjustmentsList.value[0]
      showCorrectionDialog.value = true
    }
  } catch {}
}

import { onMounted } from 'vue'
onMounted(async () => {
  await fetchAllData(chartPeriod.value)
  await refreshAdjustmentCounts()
})
</script>
