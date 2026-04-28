<template>
  <div>
    <div class="pia-page-header">
      <div class="pia-page-title-block">
        <h1>{{ t('owners.title') }}</h1>
        <div class="pia-page-subtitle">
          <span>{{ t('owners.ownersCount', { count: filterStore.totalCount }) }}</span>
          <span class="pia-dot-sep" />
          <span>{{ t('owners.propertiesManaged', { count: totalProperties }) }}</span>
          <span class="pia-dot-sep" />
          <span>{{ t('owners.monthlyRentTotal', { amount: formatCurrency(totalMonthlyRent) }) }}</span>
        </div>
      </div>
      <div class="pia-page-actions">
        <button class="pia-btn pia-btn-ghost" @click="openLiquidaciones">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {{ t('owners.liquidaciones') }}
        </button>
        <button class="pia-btn pia-btn-primary" @click="openCreateDialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          {{ t('owners.newOwner') }}
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="pia-search-bar filter-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="filterStore.search" :placeholder="t('owners.searchPlaceholder')" />
      </div>
      <select v-model="propertiesFilter" class="pia-btn pia-btn-ghost filter-select">
        <option value="all">{{ t('common.all') }}</option>
        <option value="with">{{ t('owners.withProperties') }}</option>
        <option value="without">{{ t('owners.withoutProperties') }}</option>
      </select>
      <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm filter-clear" @click="clearFilters">{{ t('common.clearFilters') }}</button>
      <div class="filter-spacer" />
      <div class="pia-segmented filter-toggle">
        <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'" title="Vista lista">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <span class="toggle-label">{{ t('owners.viewList') }}</span>
        </button>
        <button :class="{ active: viewMode === 'cards' }" @click="viewMode = 'cards'" title="Vista tarjetas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          <span class="toggle-label">{{ t('owners.viewCards') }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" style="padding:60px;text-align:center;color:var(--pia-text-3)">{{ t('owners.loadingOwners') }}</div>

    <!-- Empty state -->
    <div v-else-if="owners.length === 0" class="pia-card" style="padding:0;overflow:hidden">
      <div class="pia-empty">
        <div class="pia-empty-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4 3.5-6 7-6s6.5 2 7 6"/></svg>
        </div>
        <div>{{ hasActiveFilters ? t('owners.noOwnersWithFilters') : t('owners.noOwners') }}</div>
        <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm" @click="clearFilters">{{ t('common.clearFilters') }}</button>
        <button v-else class="pia-btn pia-btn-primary pia-btn-sm" @click="openCreateDialog">{{ t('owners.newOwner') }}</button>
      </div>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- List View (Table) -->
      <div v-if="viewMode === 'list'" class="pia-card" style="padding:0;overflow:hidden">
        <div class="pia-scroll-x">
          <table class="pia-tbl owners-tbl">
            <thead>
              <tr>
                <th>{{ t('roles.owner') }}</th>
                <th>{{ t('common.contact') }}</th>
                <th>CUIT</th>
                <th class="num">{{ t('nav.properties') }}</th>
                <th class="num">{{ t('owners.monthlyRent') }}</th>
                <th>{{ t('owners.clientSince') }}</th>
                <th style="text-align:right">{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="owner in owners" :key="owner.id" style="cursor:pointer" @click="viewOwner(owner.id)">
                <td>
                  <div style="display:flex;align-items:center;gap:12px">
                    <div class="owner-avatar">
                      {{ getInitials(owner.full_name) }}
                    </div>
                    <strong>{{ owner.full_name }}</strong>
                  </div>
                </td>
                <td>
                  <div v-if="owner.email" class="owner-email">{{ owner.email }}</div>
                  <div v-else style="color:var(--pia-text-4)">—</div>
                  <div class="owner-phone">{{ formatPhone(owner.phone) }}</div>
                </td>
                <td style="font-family:var(--font-mono);color:var(--pia-text-3);font-size:12px">
                  {{ owner.cuit_cuil || '—' }}
                </td>
                <td class="num">
                  <span class="pia-chip" :class="getPropertyCount(owner.id) > 0 ? 'up' : 'neutral'">
                    {{ getPropertyCount(owner.id) }}
                  </span>
                </td>
                <td class="num" style="font-weight:550">
                  <span v-if="getOwnerMonthlyRent(owner.id) > 0">{{ formatCurrency(getOwnerMonthlyRent(owner.id)) }}</span>
                  <span v-else style="color:var(--pia-text-4)">—</span>
                </td>
                <td style="color:var(--pia-text-3)">{{ getClientSince(owner.created_at) }}</td>
                <td style="text-align:right" @click.stop>
                  <div style="display:inline-flex;gap:2px">
                    <button class="pia-icon-btn" style="width:28px;height:28px" title="Ver detalle" @click="viewOwner(owner.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                    </button>
                    <button class="pia-icon-btn" style="width:28px;height:28px" title="Editar" @click="openEditDialog(owner.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="pia-icon-btn" style="width:28px;height:28px" title="Más opciones" @click="openMoreMenu(owner, $event)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pia-tbl-footer">
          <span>{{ t('owners.paginationShowing', { start: paginationStart, end: paginationEnd, total: filterStore.totalCount }) }}</span>
          <div style="display:flex;gap:4px">
            <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage === 1" @click="goToPreviousPage">← {{ t('common.previous') }}</button>
            <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage >= totalPages" @click="goToNextPage">{{ t('common.next') }} →</button>
          </div>
        </div>
      </div>

      <!-- Cards View -->
      <template v-else>
        <div class="owners-grid">
          <div v-for="owner in owners" :key="owner.id" class="owner-card" @click="viewOwner(owner.id)">
            <div class="owner-card-header">
              <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
                <div class="owner-avatar">
                  {{ getInitials(owner.full_name) }}
                </div>
                <div style="min-width:0">
                  <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ owner.full_name }}</strong>
                  <span style="font-size:11.5px;color:var(--pia-text-4);font-family:var(--font-mono)">{{ owner.cuit_cuil || '' }}</span>
                </div>
              </div>
              <button class="pia-icon-btn" style="width:28px;height:28px;flex-shrink:0" title="Más opciones" @click.stop="openMoreMenu(owner, $event)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
              </button>
            </div>
            <div class="owner-card-contact">
              <a v-if="owner.email" :href="'mailto:' + owner.email" class="owner-email" @click.stop>{{ owner.email }}</a>
              <span v-else style="color:var(--pia-text-4)">{{ t('owners.noEmail') }}</span>
              <div class="owner-phone">{{ formatPhone(owner.phone) }}</div>
            </div>
            <div class="owner-card-stats">
              <div class="owner-stat">
                <span class="owner-stat-label">{{ t('nav.properties') }}</span>
                <span class="owner-stat-value">{{ getPropertyCount(owner.id) }}</span>
              </div>
              <div class="owner-stat">
                <span class="owner-stat-label">{{ t('owners.canonPerMonth') }}</span>
                <span class="owner-stat-value">
                  <span v-if="getOwnerMonthlyRent(owner.id) > 0" style="font-size:11px;color:var(--pia-text-3)">$</span>{{ formatNumber(getOwnerMonthlyRent(owner.id)) }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="pia-tbl-footer" style="background:var(--pia-surface);border:1px solid var(--pia-border);border-radius:var(--pia-radius);padding:12px 16px;margin-top:16px">
          <span>{{ t('owners.paginationShowing', { start: paginationStart, end: paginationEnd, total: filterStore.totalCount }) }}</span>
          <div style="display:flex;gap:4px">
            <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage === 1" @click="goToPreviousPage">← {{ t('common.previous') }}</button>
            <button class="pia-btn pia-btn-ghost pia-btn-sm" :disabled="filterStore.currentPage >= totalPages" @click="goToNextPage">{{ t('common.next') }} →</button>
          </div>
        </div>
      </template>
    </template>

    <!-- Context Menu -->
    <Teleport to="body">
      <div v-if="menuOpen" class="context-menu" :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }" @click.stop>
        <button @click="handleMenuAction('view')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          {{ t('owners.viewDetail') }}
        </button>
        <button @click="handleMenuAction('edit')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          {{ t('common.edit') }}
        </button>
        <button @click="handleMenuAction('delete')" style="color:var(--terra)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          {{ t('common.delete') }}
        </button>
      </div>
      <div v-if="menuOpen" class="context-menu-overlay" @click="closeMenu" />
    </Teleport>

    <OwnerDialog v-model:open="dialogOpen" :owner-id="editingOwnerId" @success="handleDialogSuccess" />
    <DeleteOwnerDialog v-model:open="deleteDialogOpen" :owner-id="deletingOwner?.id ?? ''" :owner-name="deletingOwner?.full_name ?? ''" :property-count="deletingOwnerPropertyCount" @confirm="handleDeleteSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import OwnerDialog from '@/components/owners/OwnerDialog.vue'
import DeleteOwnerDialog from '@/components/owners/DeleteOwnerDialog.vue'
import { useOwners } from '@/composables/useOwners'
import { useDebounce } from '@/composables/useDebounce'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import { useOwnersFilterStore } from '@/stores/filters/useOwnersFilterStore'
import { storeToRefs } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { Owner } from '@/types'

const { t } = useI18n()
const router = useRouter()
const { owners, loading, fetchOwners, getOwnerPropertyCount } = useOwners()
const { formatCurrency } = useFormatCurrency()
const filterStore = useOwnersFilterStore()

// View mode - default to cards on mobile, list on desktop
const viewMode = ref<'list' | 'cards'>(window.innerWidth <= 768 ? 'cards' : 'list')

// Create debounced search value
const { search } = storeToRefs(filterStore)
const debouncedSearch = useDebounce(search, 300)

// Property counts and rents for each owner
const propertyCounts = ref<Map<string, number>>(new Map())
const ownerRents = ref<Map<string, number>>(new Map())

// Aggregated stats
const totalProperties = ref(0)
const totalMonthlyRent = ref(0)

// Local properties filter that maps to store's hasProperties
const propertiesFilter = ref<'all' | 'with' | 'without'>('all')

// Dialog state
const dialogOpen = ref(false)
const editingOwnerId = ref<string | null>(null)
const deleteDialogOpen = ref(false)
const deletingOwner = ref<Owner | null>(null)
const deletingOwnerPropertyCount = ref(0)

// Context menu state
const menuOpen = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const menuOwner = ref<Owner | null>(null)

// Computed
const hasActiveFilters = computed(() =>
  filterStore.search !== '' || filterStore.hasProperties !== 'all'
)

const totalPages = computed(() => {
  return Math.ceil(filterStore.totalCount / filterStore.pageSize)
})

const paginationStart = computed(() => {
  return filterStore.totalCount === 0 ? 0 : (filterStore.currentPage - 1) * filterStore.pageSize + 1
})

const paginationEnd = computed(() => {
  return Math.min(filterStore.currentPage * filterStore.pageSize, filterStore.totalCount)
})

// Helper functions
function getInitials(fullName: string): string {
  const parts = fullName.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  return fullName.substring(0, 2).toUpperCase()
}

function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  // Format Argentine phone numbers nicely
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('54') && cleaned.length >= 12) {
    const area = cleaned.slice(2, 4)
    const first = cleaned.slice(4, 8)
    const second = cleaned.slice(8, 12)
    return `+54 ${area} ${first}-${second}`
  }
  return phone
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-AR').format(num)
}

function getPropertyCount(ownerId: string): number {
  return propertyCounts.value.get(ownerId) ?? 0
}

function getOwnerMonthlyRent(ownerId: string): number {
  return ownerRents.value.get(ownerId) ?? 0
}

function getClientSince(createdAt: string): string {
  const date = new Date(createdAt)
  return date.getFullYear().toString()
}

async function loadPropertyCountsAndRents() {
  if (owners.value.length === 0) return

  const ownerIds = owners.value.map(o => o.id)

  try {
    // Get property counts and their active contract rents
    const { data: properties } = await supabase
      .from('properties')
      .select(`
        id,
        owner_id,
        contracts!inner (
          id,
          rent_amount,
          status
        )
      `)
      .in('owner_id', ownerIds)
      .is('deleted_at', null)

    // Also get properties without contracts
    const { data: allProperties } = await supabase
      .from('properties')
      .select('id, owner_id')
      .in('owner_id', ownerIds)
      .is('deleted_at', null)

    const counts = new Map<string, number>()
    const rents = new Map<string, number>()
    let totalProps = 0
    let totalRent = 0

    // Count all properties per owner
    allProperties?.forEach(p => {
      if (p.owner_id) {
        const count = counts.get(p.owner_id) || 0
        counts.set(p.owner_id, count + 1)
        totalProps++
      }
    })

    // Sum rents from active contracts
    properties?.forEach(p => {
      if (p.owner_id && p.contracts) {
        const contracts = Array.isArray(p.contracts) ? p.contracts : [p.contracts]
        contracts.forEach((c: { status: string; rent_amount: number }) => {
          if (c.status === 'activo') {
            const currentRent = rents.get(p.owner_id) || 0
            rents.set(p.owner_id, currentRent + (c.rent_amount || 0))
            totalRent += c.rent_amount || 0
          }
        })
      }
    })

    propertyCounts.value = counts
    ownerRents.value = rents
    totalProperties.value = totalProps
    totalMonthlyRent.value = totalRent
  } catch (e) {
    console.error('Error loading property counts:', e)
  }
}

async function loadOwners() {
  const result = await fetchOwners(
    {
      search: filterStore.search || undefined,
      hasProperties: filterStore.hasProperties !== 'all' ? filterStore.hasProperties : undefined,
    },
    {
      page: filterStore.currentPage,
      pageSize: filterStore.pageSize,
    }
  )

  if (result) {
    filterStore.setTotalCount(result.totalCount)
    await loadPropertyCountsAndRents()
  }
}

function clearFilters() {
  filterStore.resetFilters()
  propertiesFilter.value = 'all'
  loadOwners()
}

function openCreateDialog() {
  editingOwnerId.value = null
  dialogOpen.value = true
}

function openEditDialog(ownerId: string) {
  editingOwnerId.value = ownerId
  dialogOpen.value = true
}

async function openDeleteDialog(owner: Owner) {
  deletingOwner.value = owner
  deletingOwnerPropertyCount.value = await getOwnerPropertyCount(owner.id)
  deleteDialogOpen.value = true
}

function viewOwner(ownerId: string) {
  router.push({ name: 'owner-details', params: { id: ownerId } })
}

function goToPreviousPage() {
  filterStore.setPage(filterStore.currentPage - 1)
  loadOwners()
}

function goToNextPage() {
  filterStore.setPage(filterStore.currentPage + 1)
  loadOwners()
}

async function handleDialogSuccess() {
  await loadOwners()
}

async function handleDeleteSuccess() {
  deletingOwner.value = null
  deletingOwnerPropertyCount.value = 0
  await loadOwners()
}

function openLiquidaciones() {
  // TODO: Navigate to liquidaciones view
  router.push({ name: 'payments' })
}

// Context menu
function openMoreMenu(owner: Owner, event: MouseEvent) {
  menuOwner.value = owner
  menuPosition.value = { x: event.clientX, y: event.clientY }
  menuOpen.value = true
}

function closeMenu() {
  menuOpen.value = false
  menuOwner.value = null
}

function handleMenuAction(action: 'view' | 'edit' | 'delete') {
  if (!menuOwner.value) return
  if (action === 'view') {
    viewOwner(menuOwner.value.id)
  } else if (action === 'edit') {
    openEditDialog(menuOwner.value.id)
  } else if (action === 'delete') {
    openDeleteDialog(menuOwner.value)
  }
  closeMenu()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && menuOpen.value) {
    closeMenu()
  }
}

// Sync properties filter with store
watch(propertiesFilter, (newValue) => {
  if (newValue === 'all') {
    filterStore.hasProperties = 'all'
  } else if (newValue === 'with') {
    filterStore.hasProperties = true
  } else {
    filterStore.hasProperties = false
  }
})

// Watch for non-search filter changes - immediate re-fetch
watch(
  () => filterStore.hasProperties,
  () => {
    filterStore.resetPage()
    loadOwners()
  }
)

// Watch debounced search - re-fetch after debounce
watch(debouncedSearch, () => {
  filterStore.resetPage()
  loadOwners()
})

// Initialize properties filter from store
onMounted(() => {
  if (filterStore.hasProperties === true) {
    propertiesFilter.value = 'with'
  } else if (filterStore.hasProperties === false) {
    propertiesFilter.value = 'without'
  } else {
    propertiesFilter.value = 'all'
  }
  loadOwners()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.owners-tbl th {
  white-space: nowrap;
}

.owner-avatar {
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

.owner-email {
  font-size: 12.5px;
  color: var(--brand-700);
}

.owner-phone {
  font-size: 11.5px;
  color: var(--pia-text-3);
  font-family: var(--font-mono);
}

/* Cards grid */
.owners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.owner-card {
  background: var(--pia-bg-card);
  border: 1px solid var(--pia-border);
  border-radius: var(--pia-radius);
  padding: 16px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.owner-card:hover {
  border-color: var(--brand-300);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.owner-card-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.owner-card-contact {
  padding: 12px 0;
  border-bottom: 1px solid var(--pia-border);
  margin-bottom: 12px;
}

.owner-card-contact .owner-email {
  display: block;
  margin-bottom: 2px;
}

.owner-card-contact .owner-email:hover {
  text-decoration: underline;
}

.owner-card-stats {
  display: flex;
  gap: 24px;
}

.owner-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.owner-stat-label {
  font-size: 11px;
  color: var(--pia-text-4);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.owner-stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--pia-text);
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
  width: 320px;
}

.filter-select {
  font-size: 13px;
  cursor: pointer;
}

.filter-spacer {
  flex: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .owners-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    gap: 8px;
  }

  .filter-search {
    width: 100%;
    order: 1;
  }

  .filter-select {
    order: 3;
    flex: 1;
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
