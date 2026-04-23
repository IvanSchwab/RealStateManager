<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3" style="color: var(--pia-text-3)">
      <Loader2 class="w-8 h-8 animate-spin" />
      <p class="text-sm">{{ $t('owners.loadingOwners') }}</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-20 gap-3">
      <p class="font-medium" style="color: var(--terra)">{{ $t('owners.errorLoading') }}</p>
      <p class="text-sm" style="color: var(--pia-text-3)">{{ error }}</p>
      <button class="pia-btn pia-btn-ghost" @click="loadOwner">{{ $t('common.retry') }}</button>
    </div>

    <!-- Not found state -->
    <div v-else-if="!owner" class="flex flex-col items-center justify-center py-20 gap-3" style="color: var(--pia-text-3)">
      <UserCircle class="w-10 h-10" />
      <p class="font-medium" style="color: var(--pia-text-2)">{{ $t('owners.ownerNotFound') }}</p>
      <button class="pia-btn pia-btn-ghost" @click="goBack">
        <ArrowLeft class="w-4 h-4" />
        {{ $t('owners.backToOwners') }}
      </button>
    </div>

    <!-- Owner details -->
    <template v-else>
      <!-- Page header -->
      <div class="pia-page-header owner-page-header">
        <!-- Back link -->
        <button class="pia-btn-back" @click="goBack">
          <ArrowLeft class="w-3.5 h-3.5" />
          <span>{{ $t('owners.backToOwners') }}</span>
        </button>

        <!-- Title row -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-4">
            <!-- Avatar -->
            <div class="owner-detail-avatar">
              {{ getInitials(owner.full_name) }}
            </div>
            <div>
              <h1 class="owner-detail-name">{{ owner.full_name }}</h1>
              <div class="owner-detail-meta">
                <span v-if="owner.property_count" class="owner-prop-count-badge">
                  {{ owner.property_count }} {{ owner.property_count === 1 ? 'propiedad' : 'propiedades' }}
                </span>
                <span v-if="owner.cuit_cuil" class="owner-detail-sep">·</span>
                <span v-if="owner.cuit_cuil" style="font-family: var(--font-mono)">{{ owner.cuit_cuil }}</span>
                <span class="owner-detail-sep">·</span>
                <span>{{ $t('owners.clientSince') }} {{ formatDate(owner.created_at) }}</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 flex-shrink-0">
            <button class="pia-btn pia-btn-ghost" @click="openEditDialog">
              <Pencil class="w-3.5 h-3.5" />
              {{ $t('common.edit') }}
            </button>
            <button class="pia-btn pia-btn-danger" @click="openDeleteDialog">
              <Trash2 class="w-3.5 h-3.5" />
              {{ $t('common.delete') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Stat cards row -->
      <div class="owner-stats-row">
        <div class="owner-stat-card">
          <span class="owner-stat-label">Propiedades</span>
          <div class="owner-stat-value">{{ owner.property_count ?? 0 }}</div>
          <div class="owner-stat-sub">{{ occupiedCount }} alquiladas</div>
        </div>
        <div class="owner-stat-card">
          <span class="owner-stat-label">Ocupación</span>
          <div class="owner-stat-value">{{ occupancyRate }}<span class="owner-stat-unit">%</span></div>
          <div class="owner-stat-sub">{{ occupiedCount }} de {{ owner.property_count ?? 0 }} alquiladas</div>
        </div>
      </div>

      <!-- Content grid: 2/3 + 1/3 -->
      <div class="pia-grid pia-grid-main" style="align-items: start">
        <!-- Main column -->
        <div style="display: flex; flex-direction: column; gap: var(--gap)">

          <!-- Información personal -->
          <div class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">{{ $t('owners.personalInfo') }}</span>
            </div>
            <div class="pia-detail-section-body">
              <dl class="pia-detail-grid">
                <div class="pia-detail-field">
                  <dt class="pia-detail-label">{{ $t('owners.fullName') }}</dt>
                  <dd class="pia-detail-value">{{ owner.full_name }}</dd>
                </div>
                <div class="pia-detail-field">
                  <dt class="pia-detail-label">{{ $t('owners.cuitCuil') }}</dt>
                  <dd class="pia-detail-value" style="font-family: var(--font-mono)">{{ owner.cuit_cuil ?? '-' }}</dd>
                </div>
                <div class="pia-detail-field">
                  <dt class="pia-detail-label">{{ $t('common.email') }}</dt>
                  <dd class="pia-detail-value">
                    <a v-if="owner.email" :href="`mailto:${owner.email}`" class="pia-detail-link">{{ owner.email }}</a>
                    <span v-else style="color: var(--pia-text-4)">-</span>
                  </dd>
                </div>
                <div class="pia-detail-field">
                  <dt class="pia-detail-label">{{ $t('common.phone') }}</dt>
                  <dd class="pia-detail-value">
                    <a v-if="owner.phone" :href="`tel:${owner.phone}`" class="pia-detail-link" style="font-family: var(--font-mono)">{{ owner.phone }}</a>
                    <span v-else style="color: var(--pia-text-4)">-</span>
                  </dd>
                </div>
                <div class="pia-detail-field" style="grid-column: 1 / -1">
                  <dt class="pia-detail-label">{{ $t('common.address') }}</dt>
                  <dd class="pia-detail-value">{{ owner.address ?? '-' }}</dd>
                </div>
              </dl>
            </div>
          </div>

          <!-- Notas -->
          <div v-if="owner.notes" class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">{{ $t('common.notes') }}</span>
            </div>
            <div class="pia-detail-section-body">
              <p style="font-size: 13px; color: var(--pia-text-2); white-space: pre-wrap; line-height: 1.6">{{ owner.notes }}</p>
            </div>
          </div>

          <!-- Propiedades -->
          <div class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">
                {{ $t('nav.properties') }}
                <span v-if="owner.property_count" class="pia-section-count">{{ owner.property_count }}</span>
              </span>
              <button class="pia-btn pia-btn-primary pia-btn-sm" @click="navigateToNewProperty">
                <Plus class="w-3.5 h-3.5" />
                {{ $t('owners.addProperty') }}
              </button>
            </div>

            <!-- Properties list -->
            <div v-if="owner.properties && owner.properties.length > 0">
              <div
                v-for="property in owner.properties"
                :key="property.id"
                class="owner-prop-row"
                @click="navigateToProperty(property.id)"
              >
                <div class="owner-prop-icon" :style="{ background: getPropertyColor(property.id) }" />
                <div class="owner-prop-info">
                  <span class="owner-prop-name">{{ formatPropertyAddress(property) }}</span>
                  <span class="owner-prop-sub">
                    {{ property.address_city }}
                    <span class="owner-prop-sep">·</span>
                    {{ $t(`properties.${property.property_type}`) }}
                    <span class="owner-prop-sep">·</span>
                    {{ $t(`properties.${property.purpose}`) }}
                  </span>
                </div>
                <div class="owner-prop-right" @click.stop>
                  <span class="pia-status" :class="getPropertyStatusClass(property.status)">
                    <span class="dot" />{{ $t(`properties.${property.status}`) }}
                  </span>
                  <button
                    class="pia-icon-btn"
                    style="width: 28px; height: 28px"
                    :title="$t('common.view')"
                    @click="navigateToProperty(property.id)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty state -->
            <div v-else class="pia-empty">
              <div class="pia-empty-mark">
                <Building2 class="w-4 h-4" />
              </div>
              <div>{{ $t('owners.noPropertiesRegistered') }}</div>
              <button class="pia-btn pia-btn-ghost pia-btn-sm" @click="navigateToNewProperty">
                <Plus class="w-3.5 h-3.5" />
                {{ $t('owners.addProperty') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div style="display: flex; flex-direction: column; gap: var(--gap)">

          <!-- Detalles (metadata) -->
          <div class="pia-card" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 8px">
            <p class="pia-meta-row">
              <span class="pia-meta-label">{{ $t('common.created') }}</span>
              <span class="pia-meta-date">{{ formatDateTime(owner.created_at) }}</span>
            </p>
            <p class="pia-meta-row">
              <span class="pia-meta-label">{{ $t('common.lastUpdated') }}</span>
              <span class="pia-meta-date">{{ formatDateTime(owner.updated_at) }}</span>
            </p>
          </div>

          <!-- Historial de contratos -->
          <div class="pia-card" style="padding: 0; overflow: hidden">
            <div class="pia-detail-section-head">
              <span class="pia-detail-section-label">{{ $t('contractHistory.title') }}</span>
            </div>
            <div style="padding: 0">
              <ContractHistoryList v-if="owner" entity-type="owner" :entity-id="owner.id" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Edit dialog -->
    <OwnerDialog v-model:open="dialogOpen" :owner-id="ownerId" @success="handleEditSuccess" />

    <!-- Delete dialog -->
    <DeleteOwnerDialog
      v-if="owner"
      v-model:open="deleteDialogOpen"
      :owner-id="owner.id"
      :owner-name="owner.full_name"
      :property-count="owner.property_count || 0"
      @confirm="handleDeleteSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import OwnerDialog from '@/components/owners/OwnerDialog.vue'
import DeleteOwnerDialog from '@/components/owners/DeleteOwnerDialog.vue'
import ContractHistoryList from '@/components/contracts/ContractHistoryList.vue'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  UserCircle,
  Loader2,
  Building2,
  Plus,
} from 'lucide-vue-next'
import { useOwners } from '@/composables/useOwners'
import { useDate } from '@/composables/useDate'
import type { OwnerWithProperties, Property } from '@/types'

useI18n()
const route = useRoute()
const router = useRouter()
const { fetchOwnerById, loading, error } = useOwners()
const { formatDate, formatDateTime } = useDate()

const owner = ref<OwnerWithProperties | null>(null)
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)

const ownerId = computed(() => route.params.id as string)

const occupiedCount = computed(() =>
  owner.value?.properties?.filter(p => p.status === 'alquilada').length ?? 0
)

const occupancyRate = computed(() => {
  const total = owner.value?.property_count ?? 0
  if (total === 0) return 0
  return Math.round((occupiedCount.value / total) * 100)
})

function getInitials(fullName: string): string {
  return fullName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

function formatPropertyAddress(property: Property): string {
  let addr = `${property.address_street}${property.address_number ? ` ${property.address_number}` : ''}`
  if (property.address_floor) addr += ` · ${property.address_floor}°`
  if (property.address_apartment) addr += ` ${property.address_apartment}`
  return addr
}

const PROPERTY_COLORS = [
  '#E8DCC8', '#DDE5D8', '#E6D3C2', '#D6DADB', '#E3D9E8',
  '#D7E7E5', '#F0E2C8', '#E1E5EA', '#E8D6D6', '#D9E4E6',
  '#EAD8C8', '#E2E8D5', '#D6E2F0', '#E4ECDD', '#F1E6CC',
]

function getPropertyColor(propertyId: string): string {
  let hash = 0
  for (let i = 0; i < propertyId.length; i++) {
    hash = propertyId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PROPERTY_COLORS[Math.abs(hash) % PROPERTY_COLORS.length]
}

function getPropertyStatusClass(status: string): string {
  switch (status) {
    case 'alquilada': return 'ok'
    case 'disponible': return 'pending'
    case 'mantenimiento': return 'danger'
    case 'reservada': return 'warning'
    default: return 'draft'
  }
}

function goBack() {
  router.push({ name: 'owners' })
}

function openEditDialog() {
  dialogOpen.value = true
}

function openDeleteDialog() {
  deleteDialogOpen.value = true
}

function navigateToProperty(propertyId: string) {
  router.push({ name: 'property-detail', params: { id: propertyId } })
}

function navigateToNewProperty() {
  router.push({ name: 'properties' })
}

async function loadOwner() {
  const data = await fetchOwnerById(ownerId.value)
  owner.value = data
}

async function handleEditSuccess() {
  await loadOwner()
}

function handleDeleteSuccess() {
  router.push({ name: 'owners' })
}

onMounted(() => {
  loadOwner()
})
</script>

<style scoped>
/* Mobile topbar clearance (same fix as TenantDetailsView) */
@media (max-width: 1023px) {
  .owner-page-header {
    padding-top: calc(var(--app-header-height) - 16px);
  }
}

/* Page header overrides */
.owner-page-header {
  flex-direction: column;
  gap: 16px;
  align-items: stretch;
}

/* Back link */
.pia-btn-back {
  font-size: 12.5px;
  color: var(--pia-text-3);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: color 0.12s;
  width: fit-content;
}

.pia-btn-back:hover {
  color: var(--pia-text-2);
}

/* Avatar */
.owner-detail-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--brand-100);
  color: var(--brand-700);
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

/* Name + meta row */
.owner-detail-name {
  font-size: 22px;
  font-weight: 600;
  color: var(--pia-text);
  letter-spacing: -0.02em;
  margin: 0 0 6px;
}

.owner-detail-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--pia-text-4);
}

.owner-prop-count-badge {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--brand-700);
  background: var(--brand-50);
  border: 1px solid var(--brand-200);
  border-radius: 20px;
  padding: 1px 9px;
}

.owner-detail-sep {
  color: var(--pia-border-strong);
}

/* Danger button */
.pia-btn-danger {
  background: var(--terra-50, #fef2f2);
  color: var(--terra);
  border: 1px solid color-mix(in oklch, var(--terra) 20%, transparent);
}

.pia-btn-danger:hover {
  background: color-mix(in oklch, var(--terra) 12%, white);
}

/* Stat cards */
.owner-stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--gap);
  margin-bottom: var(--gap);
}

@media (max-width: 480px) {
  .owner-stats-row {
    grid-template-columns: 1fr;
  }
}

.owner-stat-card {
  background: var(--pia-surface);
  border: 1px solid var(--pia-border);
  border-radius: var(--pia-radius);
  padding: var(--pad-card);
}

.owner-stat-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pia-text-3);
  display: block;
  margin-bottom: 6px;
}

.owner-stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--pia-text);
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 6px;
}

.owner-stat-unit {
  font-size: 20px;
  font-weight: 500;
  color: var(--pia-text-2);
  margin-left: 2px;
}

.owner-stat-sub {
  font-size: 12px;
  color: var(--pia-text-4);
}

/* Section detail shared styles */
.pia-detail-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--pia-border);
  background: var(--pia-surface-2);
}

.pia-detail-section-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pia-text-3);
  display: flex;
  align-items: center;
  gap: 6px;
}

.pia-section-count {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--pia-text-4);
  background: var(--pia-surface-3);
  border-radius: 20px;
  padding: 1px 6px;
}

.pia-detail-section-body {
  padding: 18px;
}

.pia-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px 32px;
}

@media (max-width: 540px) {
  .pia-detail-grid {
    grid-template-columns: 1fr;
  }
}

.pia-detail-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pia-detail-label {
  font-size: 10.5px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--pia-text-4);
}

.pia-detail-value {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--pia-text);
}

.pia-detail-link {
  color: var(--brand-700);
  text-decoration: none;
  transition: opacity 0.12s;
}

.pia-detail-link:hover {
  text-decoration: underline;
}

/* Metadata rows */
.pia-meta-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  font-size: 12.5px;
}

.pia-meta-label {
  color: var(--pia-text-3);
  font-weight: 400;
  flex-shrink: 0;
}

.pia-meta-date {
  color: var(--pia-text);
  font-weight: 500;
}

/* Property rows */
.owner-prop-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 18px;
  border-bottom: 1px solid var(--pia-border);
  cursor: pointer;
  transition: background 0.12s;
}

.owner-prop-row:last-child {
  border-bottom: none;
}

.owner-prop-row:hover {
  background: var(--pia-surface-2);
}

/* Property color square (same as contract-color-bar) */
.owner-prop-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
}

.owner-prop-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.owner-prop-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--pia-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.owner-prop-sub {
  font-size: 11.5px;
  color: var(--pia-text-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.owner-prop-sep {
  color: var(--pia-border-strong);
  margin: 0 1px;
}

.owner-prop-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* Status badge variants (warning + danger + draft) */
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

.pia-status.draft {
  background: var(--pia-surface-2);
  color: var(--pia-text-3);
}

.pia-status.draft .dot {
  background: var(--pia-text-4);
}
</style>
