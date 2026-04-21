<template>
  <div>
    <div class="pia-page-header">
      <div class="pia-page-title-block">
        <h1>Contratos</h1>
        <div class="pia-page-subtitle">
          <span>{{ filterStore.totalCount }} contratos gestionados</span>
          <span class="pia-dot-sep" />
          <span>{{ activeCount }} activos · {{ expiringCount }} por vencer</span>
          <span class="pia-dot-sep" />
          <span>Ingresos totales <strong>{{ formatCurrency(totalMonthlyIncome) }}/mes</strong></span>
        </div>
      </div>
      <div class="pia-page-actions">
        <button class="pia-btn pia-btn-ghost" @click="exportContracts">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar
        </button>
        <button class="pia-btn pia-btn-primary" @click="openCreateDialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Nuevo contrato
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2.5" style="margin-bottom:var(--gap)">
      <!-- Search bar - full width on mobile, fixed width on desktop -->
      <div class="pia-search-bar w-full md:w-[280px] md:order-last">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="filterStore.search" placeholder="Buscar por dirección o inquilino…" />
      </div>
      <!-- Status tabs + Type select row -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 md:flex-1">
        <div class="flex gap-1.5 flex-shrink-0">
          <button v-for="t in statusTabs" :key="t.id"
            class="pia-filter-tab whitespace-nowrap" :class="{ active: filterStore.status === t.id }"
            @click="setStatusFilter(t.id)">
            {{ t.label }}
            <span class="pia-tab-count">{{ t.count }}</span>
          </button>
        </div>
        <div class="flex-1 hidden md:block" />
        <select v-model="filterStore.contractType" class="pia-btn pia-btn-ghost flex-shrink-0" style="font-size:13px;cursor:pointer">
          <option value="all">Todos los tipos</option>
          <option value="vivienda">Vivienda</option>
          <option value="comercial">Comercial</option>
          <option value="cochera">Cochera</option>
          <option value="oficina">Oficina</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" style="padding:60px;text-align:center;color:var(--pia-text-3)">Cargando contratos…</div>

    <!-- Error -->
    <div v-else-if="error" style="padding:40px;text-align:center;color:var(--terra)">{{ error }}</div>

    <!-- Table (desktop) -->
    <div v-else-if="contracts.length === 0" class="pia-card" style="padding:0;overflow:hidden">
      <div class="pia-empty">
        <div class="pia-empty-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M7 3h8l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 13h7M9 17h5"/></svg>
        </div>
        <div>No se encontraron contratos con estos filtros</div>
        <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm" @click="clearFilters">Limpiar filtros</button>
      </div>
    </div>

    <!-- Content (mobile cards + desktop table) -->
    <template v-else>
    <!-- Mobile cards -->
    <div class="contracts-mobile-list">
      <div v-for="contract in contracts" :key="contract.id"
        class="contract-mobile-card"
        @click="viewContract(contract.id)">
        <div class="contract-color-bar-mobile" :style="{ background: getContractColor(contract.id) }"></div>
        <div class="contract-mobile-content">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div style="flex:1;min-width:0">
              <strong style="display:block;font-size:14px;margin-bottom:2px">{{ formatPropertyAddress(contract) }}</strong>
              <span style="font-size:12px;color:var(--brand-700)">{{ getTitularName(contract) }}</span>
            </div>
            <span class="pia-status" :class="getStatusClass(calculateDisplayStatus(contract))" style="flex-shrink:0">
              <span class="dot" />{{ getStatusLabel(calculateDisplayStatus(contract)) }}
            </span>
          </div>
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px">
            <span class="pia-chip" :class="getTypeChipClass(contract.contract_type)">{{ formatContractType(contract.contract_type) }}</span>
            <span style="font-size:14px;font-weight:600;color:var(--pia-text)">{{ formatCurrency(contract.current_rent_amount) }}</span>
            <span style="font-size:11px;color:var(--pia-text-3)">{{ formatAdjustment(contract) }}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--pia-border)">
            <div style="font-size:11px;color:var(--pia-text-3)">
              <span class="pia-mono">{{ formatDate(contract.start_date) }} → {{ formatDate(contract.end_date) }}</span>
              <span :style="getRemainingTimeClass(contract)" style="margin-left:8px">{{ getRemainingTime(contract) }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="pia-tbl-footer" style="background:var(--pia-surface);border:1px solid var(--pia-border);border-radius:var(--pia-radius);padding:12px 16px">
        <span>Mostrando {{ paginationStart }}–{{ paginationEnd }} de {{ filterStore.totalCount }}</span>
        <div style="display:flex;gap:4px">
          <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage === 1" @click="goToPreviousPage">← Anterior</button>
          <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage >= totalPages" @click="goToNextPage">Siguiente →</button>
        </div>
      </div>
    </div>

    <!-- Table (desktop) -->
    <div class="pia-card contracts-desktop-table" style="padding:0;overflow:hidden">
      <div class="pia-scroll-x">
        <table class="pia-tbl">
          <thead>
            <tr>
              <th style="width:40px"></th>
              <th>Propiedad</th>
              <th>Inquilino</th>
              <th>Tipo</th>
              <th>Vigencia</th>
              <th class="num">Alquiler base</th>
              <th>Ajuste</th>
              <th>Estado</th>
              <th style="text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contract in contracts" :key="contract.id" style="cursor:pointer" @click="viewContract(contract.id)">
              <td style="padding-left:0;padding-right:0">
                <div class="contract-color-bar" :style="{ background: getContractColor(contract.id) }"></div>
              </td>
              <td>
                <div>
                  <strong>{{ formatPropertyAddress(contract) }}</strong>
                  <div style="font-size:11.5px;color:var(--pia-text-3)">{{ contract.property?.address_city }}</div>
                </div>
              </td>
              <td style="color:var(--brand-700);font-weight:500">{{ getTitularName(contract) }}</td>
              <td>
                <span class="pia-chip" :class="getTypeChipClass(contract.contract_type)">{{ formatContractType(contract.contract_type) }}</span>
              </td>
              <td>
                <div class="pia-mono" style="font-size:12px;color:var(--pia-text-2)">{{ formatDate(contract.start_date) }} → {{ formatDate(contract.end_date) }}</div>
                <div :class="getRemainingTimeClass(contract)" style="font-size:11px;margin-top:2px">
                  {{ getRemainingTime(contract) }}
                </div>
              </td>
              <td class="num" style="color:var(--pia-text);font-weight:550">{{ formatCurrency(contract.current_rent_amount) }}</td>
              <td>
                <span style="font-size:12px;color:var(--pia-text-2)">{{ formatAdjustment(contract) }}</span>
              </td>
              <td @click.stop>
                <span class="pia-status" :class="getStatusClass(calculateDisplayStatus(contract))">
                  <span class="dot" />
                  {{ getStatusLabel(calculateDisplayStatus(contract)) }}
                </span>
              </td>
              <td style="text-align:right" @click.stop>
                <div style="display:inline-flex;gap:2px">
                  <button class="pia-icon-btn" style="width:28px;height:28px" title="Ver" @click="viewContract(contract.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  </button>
                  <button class="pia-icon-btn" style="width:28px;height:28px" title="Editar" @click="openEditDialog(contract.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="pia-icon-btn" style="width:28px;height:28px" title="Ajustar" @click="openEditDialog(contract.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
                  </button>
                  <button class="pia-icon-btn" style="width:28px;height:28px" title="Renovar"
                    :disabled="calculateDisplayStatus(contract) === 'cancelled'"
                    @click="handleRenew(contract)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
                  </button>
                  <button class="pia-icon-btn" style="width:28px;height:28px" title="Más opciones">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      <div class="pia-tbl-footer">
        <span>Mostrando {{ paginationStart }}–{{ paginationEnd }} de {{ filterStore.totalCount }}</span>
        <div style="display:flex;gap:4px">
          <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage === 1" @click="goToPreviousPage">← Anterior</button>
          <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage >= totalPages" @click="goToNextPage">Siguiente →</button>
        </div>
      </div>
    </div>
    </template>

    <!-- Dialogs -->
    <ContractDialog
      v-model:open="dialogOpen"
      :contract-id="editingContractId"
      @success="handleDialogSuccess"
    />
    <CancelContractDialog
      v-model:open="cancelDialogOpen"
      :contract="cancellingContract"
      :property-address="cancellingContractPropertyAddress"
      :tenant-name="cancellingContractTenantName"
      @success="handleRescindSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ContractDialog from '@/components/contracts/ContractDialog.vue'
import CancelContractDialog from '@/components/contracts/CancelContractDialog.vue'
import { useContracts } from '@/composables/useContracts'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import { useToast } from '@/composables/useToast'
import { useDebounce } from '@/composables/useDebounce'
import { useContractsFilterStore } from '@/stores/filters/useContractsFilterStore'
import { storeToRefs } from 'pinia'
import type { ContractWithRelations, ContractDisplayStatus } from '@/types'
import { useDate } from '@/composables/useDate'

const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const { formatDate } = useDate()
const { formatCurrency } = useFormatCurrency()
const { contracts, loading, error, fetchContracts, calculateDisplayStatus, formatPropertyAddress, getTitular } = useContracts()
const filterStore = useContractsFilterStore()
const { search } = storeToRefs(filterStore)
const debouncedSearch = useDebounce(search, 300)

const dialogOpen = ref(false)
const editingContractId = ref<string | null>(null)
const cancelDialogOpen = ref(false)
const cancellingContract = ref<ContractWithRelations | null>(null)

const hasActiveFilters = computed(() =>
  filterStore.search !== '' || filterStore.status !== 'all' || filterStore.contractType !== 'all'
)
const totalPages = computed(() => Math.ceil(filterStore.totalCount / filterStore.pageSize))
const paginationStart = computed(() => filterStore.totalCount === 0 ? 0 : (filterStore.currentPage - 1) * filterStore.pageSize + 1)
const paginationEnd = computed(() => Math.min(filterStore.currentPage * filterStore.pageSize, filterStore.totalCount))

const activeCount = computed(() => contracts.value.filter(c => calculateDisplayStatus(c) === 'active').length)
const expiringCount = computed(() => contracts.value.filter(c => calculateDisplayStatus(c) === 'expiring_soon').length)
const totalMonthlyIncome = computed(() =>
  contracts.value
    .filter(c => calculateDisplayStatus(c) === 'active' || calculateDisplayStatus(c) === 'expiring_soon')
    .reduce((sum, c) => sum + (c.current_rent_amount || 0), 0)
)

const statusTabs = computed(() => [
  { id: 'all', label: 'Todos', count: filterStore.totalCount },
  { id: 'active', label: 'Activos', count: activeCount.value },
  { id: 'expiring_soon', label: 'Por vencer', count: expiringCount.value },
  { id: 'expired', label: 'Vencidos', count: contracts.value.filter(c => calculateDisplayStatus(c) === 'expired').length },
  { id: 'cancelled', label: 'Rescindidos', count: contracts.value.filter(c => calculateDisplayStatus(c) === 'cancelled').length },
])

const cancellingContractPropertyAddress = computed(() => cancellingContract.value ? formatPropertyAddress(cancellingContract.value) : '')
const cancellingContractTenantName = computed(() => cancellingContract.value ? getTitularName(cancellingContract.value) : '')

function getTitularName(contract: ContractWithRelations) {
  const titular = getTitular(contract)
  if (!titular) return t('contracts.noTenantAssigned')
  return `${titular.first_name} ${titular.last_name}`
}

function getStatusClass(status: ContractDisplayStatus) {
  const map: Record<ContractDisplayStatus, string> = {
    active: 'ok', expiring_soon: 'pending', expired: 'late', cancelled: 'draft', renewed: 'ok', draft: 'draft',
  }
  return map[status] ?? 'draft'
}

function getStatusLabel(status: ContractDisplayStatus) {
  const map: Record<ContractDisplayStatus, string> = {
    active: 'Activo', expiring_soon: 'Por vencer', expired: 'Vencido', cancelled: 'Rescindido', renewed: 'Renovado', draft: 'Borrador',
  }
  return map[status] ?? status
}

// Color palette for contract color bars
const CONTRACT_COLORS = [
  '#E8DCC8',
  '#DDE5D8',
  '#E6D3C2',
  '#D6DADB',
  '#E3D9E8',
  '#D7E7E5',
  '#F0E2C8',
  '#E1E5EA',
  '#E8D6D6',
  '#D9E4E6',
  '#EAD8C8',
  '#E2E8D5',
  '#D6E2F0',
  '#E4ECDD',
  '#F1E6CC',
];
function getContractColor(contractId: string): string {
  let hash = 0
  for (let i = 0; i < contractId.length; i++) {
    hash = contractId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return CONTRACT_COLORS[Math.abs(hash) % CONTRACT_COLORS.length]
}

function getTypeChipClass(type: string): string {
  const map: Record<string, string> = {
    vivienda: 'neutral',
    comercial: 'warn',
    cochera: 'neutral',
    oficina: 'neutral',
  }
  return map[type] || 'neutral'
}

function formatContractType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

function getRemainingTime(contract: ContractWithRelations): string {
  const now = new Date()
  const end = new Date(contract.end_date)
  const diffMs = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.ceil(diffDays / 30)

  if (diffDays < 0) {
    return 'Vencido'
  } else if (diffDays === 0) {
    return 'Vence hoy'
  } else if (diffDays <= 30) {
    return `vence en ${diffDays} días`
  } else {
    return `${diffMonths} meses restantes`
  }
}

function getRemainingTimeClass(contract: ContractWithRelations): string {
  const now = new Date()
  const end = new Date(contract.end_date)
  const diffMs = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'color: var(--terra)'
  if (diffDays <= 30) return 'color: var(--terra)'
  if (diffDays <= 90) return 'color: var(--amber)'
  return 'color: var(--pia-text-3)'
}

function formatAdjustment(contract: ContractWithRelations): string {
  if (!contract.adjustment_type || contract.adjustment_type === 'ninguno') {
    return '-'
  }
  const type = contract.adjustment_type.toUpperCase()
  const period = contract.adjustment_period
    ? { trimestral: 'Trim.', semestral: 'Sem.', anual: 'Anual' }[contract.adjustment_period] || ''
    : ''
  return period ? `${type} · ${period}` : type
}

function exportContracts() {
  toast.info('Exportando contratos...')
  // TODO: Implement CSV/Excel export
}

function setStatusFilter(id: string) {
  filterStore.status = id as 'all' | 'active' | 'expiring_soon' | 'expired' | 'cancelled'
}

function clearFilters() { filterStore.resetFilters(); loadContracts() }
function openCreateDialog() { editingContractId.value = null; dialogOpen.value = true }
function openEditDialog(id: string) { editingContractId.value = id; dialogOpen.value = true }
function openRescindDialog(contract: ContractWithRelations) { cancellingContract.value = contract; cancelDialogOpen.value = true }
function handleRenew(_contract: ContractWithRelations) { toast.info(t('contracts.featureComingSoon')) }
function viewContract(id: string) { router.push({ name: 'contract-details', params: { id } }) }
function goToPreviousPage() { filterStore.setPage(filterStore.currentPage - 1); loadContracts() }
function goToNextPage() { filterStore.setPage(filterStore.currentPage + 1); loadContracts() }

async function loadContracts() {
  const result = await fetchContracts(
    { search: filterStore.search || undefined, status: filterStore.status, contract_type: filterStore.contractType },
    { page: filterStore.currentPage, pageSize: filterStore.pageSize }
  )
  if (result) filterStore.setTotalCount(result.totalCount)
}

async function handleDialogSuccess() { await loadContracts() }
async function handleRescindSuccess() { cancellingContract.value = null; await loadContracts() }

watch(() => [filterStore.status, filterStore.contractType], () => { filterStore.resetPage(); loadContracts() })
watch(debouncedSearch, () => { filterStore.resetPage(); loadContracts() })
onMounted(() => loadContracts())
</script>

<style scoped>
/* Responsive visibility */
.contracts-mobile-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contracts-desktop-table {
  display: none;
}

@media (min-width: 768px) {
  .contracts-mobile-list {
    display: none;
  }

  .contracts-desktop-table {
    display: block;
  }
}

.contract-color-bar {
  width: 36px;
  height: 36px;
  border-radius: 8px;   
  margin-left: 12px;
}
.contract-mobile-card {
  display: flex;
  background: var(--pia-surface);
  border: 1px solid var(--pia-border);
  border-radius: var(--pia-radius);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s;
}

.contract-mobile-card:hover {
  border-color: var(--pia-border-strong);
}

.contract-color-bar-mobile {
  width: 5px;
  flex-shrink: 0;
}

.contract-mobile-content {
  flex: 1;
  padding: 14px 16px;
  min-width: 0;
}

/* Chip styles for contract types */
.pia-chip.warn {
  background: var(--amber-bg);
  color: var(--amber-700);
}
</style>
