<template>
  <div>
    <div class="pia-page-header">
      <div class="pia-page-title-block">
        <h1>{{ t('tenants.title') }}</h1>
        <div class="pia-page-subtitle">
          <span>{{ counts.all }} registrados</span>
          <span class="pia-dot-sep" />
          <span>{{ counts.activo }} activos</span>
          <span class="pia-dot-sep" />
          <span>{{ counts.moroso }} morosos</span>
        </div>
      </div>
      <div class="pia-page-actions">
        <button class="pia-btn pia-btn-ghost" @click="exportTenants">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar
        </button>
        <button class="pia-btn pia-btn-primary" @click="openCreateDialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Agregar inquilino
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="pia-search-bar filter-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="filterStore.search" placeholder="Nombre, email, teléfono o DNI…" />
      </div>
      <!-- Status tabs -->
      <div class="pia-filter-tabs">
        <button v-for="tab in statusTabs" :key="tab.id"
          class="pia-filter-tab" :class="{ active: currentTab === tab.id }"
          @click="setTab(tab.id)">
          {{ tab.label }}
          <span class="pia-tab-count">{{ tab.count }}</span>
        </button>
      </div>
      <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm filter-clear" @click="clearFilters">{{ t('common.clearFilters') }}</button>
      <div class="filter-spacer" />
      <div class="pia-segmented filter-toggle">
        <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'" title="Vista lista">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <span class="toggle-label">Lista</span>
        </button>
        <button :class="{ active: viewMode === 'cards' }" @click="viewMode = 'cards'" title="Vista tarjetas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span class="toggle-label">Tarjetas</span>
        </button>
      </div>
    </div>

    <div v-if="loading" style="padding:60px;text-align:center;color:var(--pia-text-3)">Cargando inquilinos…</div>

    <!-- Empty state -->
    <div v-else-if="tenants.length === 0" class="pia-card" style="padding:0;overflow:hidden">
      <div class="pia-empty">
        <div class="pia-empty-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4 3.5-6 7-6s6.5 2 7 6"/></svg>
        </div>
        <div>{{ hasActiveFilters ? 'Sin inquilinos con estos filtros' : 'No hay inquilinos registrados' }}</div>
        <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm" @click="clearFilters">{{ t('common.clearFilters') }}</button>
        <button v-else class="pia-btn pia-btn-primary pia-btn-sm" @click="openCreateDialog">{{ t('tenants.newTenant') }}</button>
      </div>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- List View (Table) — hidden on mobile via CSS, replaced by cards -->
      <div v-show="viewMode === 'list'" class="list-view-wrapper pia-card" style="padding:0;overflow:hidden">
        <div class="pia-scroll-x">
          <table class="pia-tbl tenants-tbl">
            <thead>
              <tr>
                <th>{{ t('contracts.tenant') }}</th>
                <th>{{ t('common.contact') }}</th>
                <th>{{ t('tenants.employer') }}</th>
                <th class="num">{{ t('tenants.declaredIncome') }}</th>
                <th>{{ t('contracts.property') }}</th>
                <th style="text-align:center">Score</th>
                <th>{{ t('common.status') }}</th>
                <th style="text-align:right">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tenant in tenants" :key="tenant.id" style="cursor:pointer" @click="viewTenant(tenant.id)">
                <!-- Inquilino -->
                <td>
                  <div style="display:flex;align-items:center;gap:12px">
                    <div class="tenant-avatar">
                      {{ getInitials(tenant.first_name, tenant.last_name) }}
                    </div>
                    <div>
                      <strong>{{ tenant.first_name }} {{ tenant.last_name }}</strong>
                      <div class="tenant-dni">
                        {{ tenant.dni ? `DNI ${tenant.dni}` : '' }}
                      </div>
                    </div>
                  </div>
                </td>
                <!-- Contacto -->
                <td>
                  <div v-if="tenant.email" class="tenant-email">{{ tenant.email }}</div>
                  <div v-else style="color:var(--pia-text-4)">—</div>
                  <div class="tenant-phone">{{ tenant.phone || '—' }}</div>
                </td>
                <!-- Empleador -->
                <td style="color:var(--pia-text-2)">{{ tenant.employer || '—' }}</td>
                <!-- Ingreso declarado -->
                <td class="num" style="font-weight:550">
                  <span v-if="tenant.monthly_income">{{ formatCurrency(tenant.monthly_income) }}</span>
                  <span v-else style="color:var(--pia-text-4)">—</span>
                </td>
                <!-- Propiedad -->
                <td>
                  <template v-if="tenant.active_contract?.property">
                    <div style="font-weight:500">{{ formatPropertyAddress(tenant.active_contract.property) }}</div>
                    <div class="tenant-property-date">desde {{ formatDate(tenant.active_contract.start_date) }}</div>
                  </template>
                  <span v-else style="color:var(--pia-text-4)">Sin asignar</span>
                </td>
                <!-- Score -->
                <td style="text-align:center">
                  <div class="score-cell">
                    <div class="score-bar">
                      <div class="score-fill" :style="{ width: tenant.score + '%' }" :class="getScoreClass(tenant.score)" />
                    </div>
                    <span class="score-value">{{ tenant.score }}</span>
                  </div>
                </td>
                <!-- Estado -->
                <td>
                  <span class="pia-status" :class="getStatusClass(tenant.display_status)">
                    <span class="dot" />{{ getStatusLabel(tenant.display_status) }}
                  </span>
                </td>
                <!-- Acciones -->
                <td style="text-align:right" @click.stop>
                  <div style="display:inline-flex;gap:2px">
                    <button class="pia-icon-btn" style="width:28px;height:28px" title="Ver detalle" @click="viewTenant(tenant.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                    </button>
                    <button class="pia-icon-btn" style="width:28px;height:28px" title="Editar" @click="openEditDialog(tenant.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                    <button class="pia-icon-btn" style="width:28px;height:28px" title="Más opciones" @click="openMoreMenu(tenant, $event)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pia-tbl-footer">
          <span>Mostrando {{ paginationStart }} de {{ totalCount }} inquilinos</span>
          <div style="display:flex;gap:4px">
            <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage === 1" @click="goToPreviousPage">← Anterior</button>
            <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage >= totalPages" @click="goToNextPage">Siguiente →</button>
          </div>
        </div>
      </div>

      <!-- Cards View — always visible on mobile via CSS, shown on desktop when toggled -->
      <div class="cards-view-wrapper" v-show="viewMode === 'cards'">
        <div class="tenants-grid">
          <div v-for="tenant in tenants" :key="tenant.id" class="tenant-card" @click="viewTenant(tenant.id)">
            <div class="tenant-card-header">
              <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
                <div class="tenant-avatar">
                  {{ getInitials(tenant.first_name, tenant.last_name) }}
                </div>
                <div style="min-width:0">
                  <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ tenant.first_name }} {{ tenant.last_name }}</strong>
                  <span style="font-size:11.5px;color:var(--pia-text-4);font-family:var(--font-mono)">{{ tenant.dni ? `DNI ${tenant.dni}` : '' }}</span>
                </div>
              </div>
              <span class="pia-status" :class="getStatusClass(tenant.display_status)" style="flex-shrink:0">
                <span class="dot" />{{ getStatusLabel(tenant.display_status) }}
              </span>
            </div>
            <div class="tenant-card-contact">
              <a v-if="tenant.email" :href="'mailto:' + tenant.email" class="tenant-email" @click.stop>{{ tenant.email }}</a>
              <span v-else style="color:var(--pia-text-4)">{{ t('tenants.noEmail') }}</span>
              <div class="tenant-phone">{{ tenant.phone || '—' }}</div>
            </div>
            <div v-if="tenant.active_contract?.property" class="tenant-card-property">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>{{ formatPropertyAddress(tenant.active_contract.property) }}</span>
            </div>
            <div class="tenant-card-stats">
              <div class="tenant-stat">
                <span class="tenant-stat-label">Score</span>
                <div class="tenant-stat-score">
                  <div class="score-bar">
                    <div class="score-fill" :style="{ width: tenant.score + '%' }" :class="getScoreClass(tenant.score)" />
                  </div>
                  <span class="score-value">{{ tenant.score }}</span>
                </div>
              </div>
              <div class="tenant-stat">
                <span class="tenant-stat-label">Ingreso</span>
                <span class="tenant-stat-value">
                  <template v-if="tenant.monthly_income">
                    <span style="font-size:11px;color:var(--pia-text-3)">$</span>{{ formatNumber(tenant.monthly_income) }}
                  </template>
                  <span v-else style="color:var(--pia-text-4)">—</span>
                </span>
              </div>
            </div>
            <div class="tenant-card-actions" @click.stop>
              <button class="pia-icon-btn" style="width:28px;height:28px" title="Editar" @click="openEditDialog(tenant.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              </button>
              <button class="pia-icon-btn" style="width:28px;height:28px" title="Más opciones" @click="openMoreMenu(tenant, $event)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
          </div>
        </div>
        <div class="pia-tbl-footer" style="background:var(--pia-surface);border:1px solid var(--pia-border);border-radius:var(--pia-radius);padding:12px 16px;margin-top:16px">
          <span>Mostrando {{ paginationStart }} de {{ totalCount }} inquilinos</span>
          <div style="display:flex;gap:4px">
            <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage === 1" @click="goToPreviousPage">← Anterior</button>
            <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage >= totalPages" @click="goToNextPage">Siguiente →</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Context Menu -->
    <Teleport to="body">
      <div v-if="menuOpen" class="context-menu" :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }" @click.stop>
        <button @click="handleMenuAction('edit')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Editar
        </button>
        <button @click="handleMenuAction('delete')" style="color:var(--terra)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Eliminar
        </button>
      </div>
      <div v-if="menuOpen" class="context-menu-overlay" @click="closeMenu" />
    </Teleport>

    <TenantDialog v-model:open="dialogOpen" :tenant-id="editingTenantId" @success="handleDialogSuccess" />
    <DeleteTenantDialog
      v-model:open="deleteDialogOpen"
      :tenant-id="deletingTenant?.id ?? ''"
      :tenant-name="deletingTenant ? `${deletingTenant.first_name} ${deletingTenant.last_name}` : ''"
      @confirm="handleDeleteSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import TenantDialog from '@/components/tenants/TenantDialog.vue'
import DeleteTenantDialog from '@/components/tenants/DeleteTenantDialog.vue'
import { useTenants, type TenantWithContract, type TenantDisplayStatus } from '@/composables/useTenants'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import { useDebounce } from '@/composables/useDebounce'
import { useTenantsFilterStore } from '@/stores/filters/useTenantsFilterStore'
import { storeToRefs } from 'pinia'

const { t } = useI18n()
const router = useRouter()
const { tenants, loading, fetchTenants } = useTenants()
const { formatCurrency } = useFormatCurrency()
const filterStore = useTenantsFilterStore()
const { search } = storeToRefs(filterStore)
const debouncedSearch = useDebounce(search, 300)

const dialogOpen = ref(false)
const editingTenantId = ref<string | null>(null)
const deleteDialogOpen = ref(false)
const deletingTenant = ref<TenantWithContract | null>(null)

// View mode toggle — CSS handles forcing cards on mobile
const viewMode = ref<'list' | 'cards'>('list')

const currentTab = ref<TenantDisplayStatus | 'all'>('all')
const counts = ref({ all: 0, activo: 0, moroso: 0, sin_contrato: 0 })
const totalCount = ref(0)

// Context menu state
const menuOpen = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const menuTenant = ref<TenantWithContract | null>(null)

const hasActiveFilters = computed(() => filterStore.search !== '' || currentTab.value !== 'all')
const totalPages = computed(() => Math.ceil(totalCount.value / filterStore.pageSize))
const paginationStart = computed(() => {
  if (totalCount.value === 0) return 0
  const start = (filterStore.currentPage - 1) * filterStore.pageSize + 1
  const end = Math.min(filterStore.currentPage * filterStore.pageSize, totalCount.value)
  return `${start}–${end}`
})

const statusTabs = computed(() => [
  { id: 'all' as const, label: 'Todos', count: counts.value.all },
  { id: 'activo' as const, label: 'Activos', count: counts.value.activo },
  { id: 'moroso' as const, label: 'Morosos', count: counts.value.moroso },
  { id: 'sin_contrato' as const, label: 'Sin contrato', count: counts.value.sin_contrato },
])

function getInitials(first: string, last: string) {
  return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase()
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-AR').format(num)
}

function formatPropertyAddress(property: { address_street: string; address_number: string | null }) {
  return `${property.address_street} ${property.address_number || ''}`.trim()
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getScoreClass(score: number): string {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

function getStatusClass(status: TenantDisplayStatus): string {
  switch (status) {
    case 'activo': return 'ok'
    case 'moroso': return 'danger'
    case 'sin_contrato': return 'warning'
    default: return 'draft'
  }
}

function getStatusLabel(status: TenantDisplayStatus): string {
  switch (status) {
    case 'activo': return 'Activo'
    case 'moroso': return 'Moroso'
    case 'sin_contrato': return 'Sin contrato'
    default: return status
  }
}

function setTab(tab: TenantDisplayStatus | 'all') {
  currentTab.value = tab
  filterStore.resetPage()
  loadTenants()
}

function clearFilters() {
  filterStore.resetFilters()
  currentTab.value = 'all'
  loadTenants()
}

function openCreateDialog() { editingTenantId.value = null; dialogOpen.value = true }
function openEditDialog(id: string) { editingTenantId.value = id; dialogOpen.value = true }
function viewTenant(id: string) { router.push({ name: 'tenant-details', params: { id } }) }
function goToPreviousPage() { filterStore.setPage(filterStore.currentPage - 1); loadTenants() }
function goToNextPage() { filterStore.setPage(filterStore.currentPage + 1); loadTenants() }

function openMoreMenu(tenant: TenantWithContract, event: MouseEvent) {
  menuTenant.value = tenant
  menuPosition.value = { x: event.clientX, y: event.clientY }
  menuOpen.value = true
}

function closeMenu() {
  menuOpen.value = false
  menuTenant.value = null
}

function handleMenuAction(action: 'edit' | 'delete') {
  if (!menuTenant.value) return
  if (action === 'edit') {
    openEditDialog(menuTenant.value.id)
  } else if (action === 'delete') {
    deletingTenant.value = menuTenant.value
    deleteDialogOpen.value = true
  }
  closeMenu()
}

function exportTenants() {
  // Generate CSV export
  const headers = ['Nombre', 'DNI', 'Email', 'Teléfono', 'Empleador', 'Ingreso', 'Estado', 'Score']
  const rows = tenants.value.map(t => [
    `${t.first_name} ${t.last_name}`,
    t.dni || '',
    t.email || '',
    t.phone || '',
    t.employer || '',
    t.monthly_income?.toString() || '',
    getStatusLabel(t.display_status),
    t.score.toString(),
  ])

  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `inquilinos_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

async function loadTenants() {
  const result = await fetchTenants(
    {
      search: filterStore.search || undefined,
      displayStatus: currentTab.value !== 'all' ? currentTab.value : undefined,
    },
    { page: filterStore.currentPage, pageSize: filterStore.pageSize }
  )
  if (result) {
    totalCount.value = result.totalCount
    counts.value = result.counts
  }
}

async function handleDialogSuccess() { await loadTenants() }
async function handleDeleteSuccess() { deletingTenant.value = null; await loadTenants() }

// Close menu on escape
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && menuOpen.value) {
    closeMenu()
  }
}

watch(debouncedSearch, () => { filterStore.resetPage(); loadTenants() })

onMounted(() => {
  loadTenants()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.tenants-tbl th {
  white-space: nowrap;
}

.tenant-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand-100);
  color: var(--brand-700);
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.tenant-dni {
  font-size: 11.5px;
  color: var(--pia-text-4);
  font-family: var(--font-mono);
}

.tenant-email {
  font-size: 12.5px;
  color: var(--brand-700);
}

.tenant-phone {
  font-size: 11.5px;
  color: var(--pia-text-3);
  font-family: var(--font-mono);
}

.tenant-property-date {
  font-size: 11px;
  color: var(--pia-text-4);
}

/* Score bar */
.score-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.score-bar {
  width: 60px;
  height: 6px;
  background: var(--pia-border);
  border-radius: 3px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.score-fill.high {
  background: var(--brand-600);
}

.score-fill.medium {
  background: var(--amber-500);
}

.score-fill.low {
  background: var(--terra);
}

.score-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--pia-text-2);
  min-width: 20px;
}

/* Status variants */
.pia-status.warning {
  background: var(--amber-50);
  color: var(--amber-700);
}

.pia-status.warning .dot {
  background: var(--amber-500);
}

.pia-status.danger {
  background: var(--terra-50, #fef2f2);
  color: var(--terra);
}

.pia-status.danger .dot {
  background: var(--terra);
}

/* Context menu */
.context-menu {
  position: fixed;
  background: var(--pia-bg-card);
  border: 1px solid var(--pia-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  min-width: 140px;
  z-index: 1000;
}

.context-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  font-size: 13px;
  color: var(--pia-text);
  cursor: pointer;
  border-radius: var(--radius-sm);
  text-align: left;
}

.context-menu button:hover {
  background: var(--pia-bg-hover);
}

.context-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

/* Filter bar */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: var(--gap);
}

.filter-search {
  width: 280px;
}

.filter-spacer {
  flex: 1;
}

/* Filter tabs */
.pia-filter-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
}

/* Cards grid */
.tenants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.tenant-card {
  background: var(--pia-bg-card);
  border: 1px solid var(--pia-border);
  border-radius: var(--pia-radius);
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.tenant-card:hover {
  border-color: var(--brand-300);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.tenant-card-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.tenant-card-contact {
  padding: 12px 0;
  border-bottom: 1px solid var(--pia-border);
  margin-bottom: 12px;
}

.tenant-card-contact .tenant-email {
  display: block;
  margin-bottom: 2px;
}

.tenant-card-contact .tenant-email:hover {
  text-decoration: underline;
}

.tenant-card-property {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--pia-text-2);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--pia-border);
  margin-bottom: 12px;
}

.tenant-card-property svg {
  color: var(--pia-text-4);
  flex-shrink: 0;
}

.tenant-card-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}

.tenant-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tenant-stat-label {
  font-size: 11px;
  color: var(--pia-text-4);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.tenant-stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--pia-text);
}

.tenant-stat-score {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tenant-stat-score .score-bar {
  width: 50px;
}

.tenant-stat-score .score-value {
  font-size: 14px;
  font-weight: 600;
}

.tenant-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--pia-border);
}

/* Responsive */
@media (max-width: 768px) {
  .tenants-grid {
    grid-template-columns: 1fr;
  }

  /* On mobile: force cards, hide the table regardless of viewMode toggle */
  .list-view-wrapper {
    display: none !important;
  }

  .cards-view-wrapper {
    display: block !important;
  }

  .filter-bar {
    gap: 8px;
  }

  .filter-search {
    width: 100%;
    order: 1;
  }

  .pia-filter-tabs {
    order: 3;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .pia-filter-tabs::-webkit-scrollbar {
    display: none;
  }

  .pia-filter-tabs .pia-filter-tab {
    white-space: nowrap;
  }

  .filter-clear {
    order: 4;
  }

  .filter-spacer {
    display: none;
  }

  .filter-toggle {
    order: 2;
    margin-left: auto;
  }

  .filter-toggle .toggle-label {
    display: none;
  }
}
</style>
