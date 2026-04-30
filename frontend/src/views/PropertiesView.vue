<template>
  <div>
    <div class="pia-page-header">
      <div class="pia-page-title-block">
        <h1>{{ t('properties.title') }}</h1>
        <div class="pia-page-subtitle">
          <span>{{ t('properties.totalCount', { count: properties.length }) }}</span>
          <span class="pia-dot-sep" />
          <span>{{ t('properties.shownCount', { count: filteredProperties.length }) }}</span>
        </div>
      </div>
      <div class="pia-page-actions">
        <button class="pia-btn pia-btn-primary" @click="openCreateDialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          {{ t('properties.newProperty') }}
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2.5" style="margin-bottom:var(--gap)">
      <!-- Search bar - full width on mobile -->
      <div class="pia-search-bar w-full md:w-[260px]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="search" :placeholder="t('properties.searchPlaceholder')" />
      </div>
      <!-- Filters row - horizontal scroll on mobile -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 md:flex-1">
        <select v-model="statusFilter" class="pia-btn pia-btn-ghost flex-shrink-0" style="font-size:13px;cursor:pointer">
          <option value="all">{{ t('properties.allStatus') }}</option>
          <option value="disponible">{{ t('properties.disponible') }}</option>
          <option value="alquilada">{{ t('properties.alquilada') }}</option>
          <option value="mantenimiento">{{ t('properties.mantenimiento') }}</option>
          <option value="reservada">{{ t('properties.reservada') }}</option>
          <option value="vendida">{{ t('properties.vendida') }}</option>
        </select>
        <select v-model="typeFilter" class="pia-btn pia-btn-ghost flex-shrink-0" style="font-size:13px;cursor:pointer">
          <option value="all">{{ t('properties.allTypes') }}</option>
          <option value="departamento">{{ t('properties.departamento') }}</option>
          <option value="casa">{{ t('properties.casa') }}</option>
          <option value="comercial">{{ t('properties.comercial') }}</option>
          <option value="terreno">{{ t('properties.terreno') }}</option>
          <option value="oficina">{{ t('properties.oficina') }}</option>
          <option value="local">{{ t('properties.local') }}</option>
          <option value="galpon">{{ t('properties.galpon') }}</option>
        </select>
        <select v-model="purposeFilter" class="pia-btn pia-btn-ghost flex-shrink-0" style="font-size:13px;cursor:pointer">
          <option value="all">{{ t('properties.allPurposesLabel') }}</option>
          <option value="alquiler">{{ t('properties.alquiler') }}</option>
          <option value="venta">{{ t('properties.venta') }}</option>
        </select>
        <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm flex-shrink-0" @click="clearFilters">{{ t('common.clearFilters') }}</button>
        <div class="flex-1 hidden md:block" />
        <!-- View toggle - hidden on mobile -->
        <div class="pia-segmented hidden md:flex">
          <button :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" style="padding:60px;text-align:center;color:var(--pia-text-3)">{{ t('properties.loadingProperties') }}</div>
    <div v-else-if="error" style="padding:40px;text-align:center;color:var(--terra)">{{ error }}</div>

    <!-- Grid view -->
    <template v-else-if="viewMode === 'grid'">
      <div v-if="filteredProperties.length === 0" class="pia-card">
        <div class="pia-empty">
          <div class="pia-empty-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>{{ hasActiveFilters ? t('properties.noPropertiesWithFilters') : t('properties.noProperties') }}</div>
          <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm" @click="clearFilters">{{ t('common.clearFilters') }}</button>
          <button v-else class="pia-btn pia-btn-primary pia-btn-sm" @click="openCreateDialog">{{ t('properties.newProperty') }}</button>
        </div>
      </div>
      <div v-else class="pia-grid pia-grid-4" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))">
        <div
          v-for="property in filteredProperties"
          :key="property.id"
          class="pia-property-card"
          @click="navigateToProperty(property.id)"
        >
          <div class="pia-property-thumb" style="background:var(--pia-surface-2);display:flex;align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--pia-text-4)" stroke-width="1.5" width="32" height="32"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div class="pia-property-body">
            <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">
              <span class="pia-chip neutral" style="font-size:10px">{{ getTypeLabel(property.property_type) }}</span>
              <span class="pia-chip" :class="property.purpose === 'alquiler' ? 'neutral' : 'warn'" style="font-size:10px">
                {{ t('properties.' + property.purpose) }}
              </span>
            </div>
            <strong style="display:block;font-size:14px;margin-bottom:4px">{{ property.name }}</strong>
            <div style="font-size:12px;color:var(--pia-text-3);margin-bottom:8px">{{ formatAddress(property) }}</div>
            <div v-if="property.owner" style="font-size:11.5px;color:var(--pia-text-3);margin-bottom:10px;display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4 3.5-6 7-6s6.5 2 7 6"/></svg>
              {{ property.owner.full_name }}
            </div>
            <div v-if="property.bedrooms || property.bathrooms || property.square_meters" style="display:flex;gap:12px;font-size:11.5px;color:var(--pia-text-3);margin-bottom:12px;font-family:var(--font-mono)">
              <span v-if="property.bedrooms">{{ property.bedrooms }} amb</span>
              <span v-if="property.bathrooms">{{ property.bathrooms }} ba</span>
              <span v-if="property.square_meters">{{ property.square_meters }} m²</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid var(--pia-border)">
              <span class="pia-status" :class="getStatusClass(property.status)">
                <span class="dot" />{{ getStatusLabel(property.status) }}
              </span>
              <button class="pia-icon-btn" style="width:26px;height:26px" title="Eliminar" @click.stop="confirmDelete(property)">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--terra)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredProperties.length > 0" style="margin-top:16px;font-size:12px;color:var(--pia-text-3)">
        {{ t('properties.propertiesCounter', { shown: filteredProperties.length, total: properties.length }) }}
      </div>
    </template>

    <!-- List view -->
    <div v-else class="pia-card" style="padding:0;overflow:hidden">
      <div class="pia-scroll-x">
        <table class="pia-tbl">
          <thead>
            <tr>
              <th>{{ t('properties.property') }}</th>
              <th>{{ t('properties.owner') }}</th>
              <th>{{ t('common.type') }}</th>
              <th>{{ t('properties.purpose') }}</th>
              <th>{{ t('common.status') }}</th>
              <th style="text-align:right">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="property in filteredProperties" :key="property.id" style="cursor:pointer" @click="navigateToProperty(property.id)">
              <td>
                <strong style="display:block">{{ property.name }}</strong>
                <div style="font-size:11.5px;color:var(--pia-text-3)">{{ formatAddress(property) }}</div>
                <div v-if="property.square_meters || property.bedrooms" style="font-size:11px;color:var(--pia-text-4);font-family:var(--font-mono);margin-top:2px">
                  <span v-if="property.bedrooms">{{ property.bedrooms }} amb</span>
                  <span v-if="property.bedrooms && property.square_meters"> · </span>
                  <span v-if="property.square_meters">{{ property.square_meters }} m²</span>
                </div>
              </td>
              <td style="color:var(--pia-text-3)">{{ property.owner?.full_name || '—' }}</td>
              <td>
                <span class="pia-chip neutral" style="font-size:11px">{{ getTypeLabel(property.property_type) }}</span>
              </td>
              <td>
                <span class="pia-chip" :class="property.purpose === 'alquiler' ? 'neutral' : 'warn'" style="font-size:11px">
                  {{ t('properties.' + property.purpose) }}
                </span>
              </td>
              <td>
                <span class="pia-status" :class="getStatusClass(property.status)">
                  <span class="dot" />{{ getStatusLabel(property.status) }}
                </span>
              </td>
              <td style="text-align:right" @click.stop>
                <div style="display:inline-flex;gap:2px">
                  <button class="pia-icon-btn" style="width:28px;height:28px" title="Ver" @click="navigateToProperty(property.id)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  </button>
                  <button class="pia-icon-btn" style="width:28px;height:28px" title="Eliminar" @click.stop="confirmDelete(property)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--terra)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredProperties.length === 0" class="pia-empty">
          <div class="pia-empty-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>{{ hasActiveFilters ? t('properties.noPropertiesWithFilters') : t('properties.noProperties') }}</div>
          <button v-if="hasActiveFilters" class="pia-btn pia-btn-ghost pia-btn-sm" @click="clearFilters">{{ t('common.clearFilters') }}</button>
          <button v-else class="pia-btn pia-btn-primary pia-btn-sm" @click="openCreateDialog">{{ t('properties.newProperty') }}</button>
        </div>
      </div>
      <div v-if="filteredProperties.length > 0" class="pia-tbl-footer">
        <span>{{ filteredProperties.length }} de {{ properties.length }} propiedades</span>
      </div>
    </div>

    <!-- Property Dialog (Create) -->
    <PropertyDialog v-model:open="createDialogOpen" @success="handleCreateSuccess" />

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('properties.deleteProperty') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('properties.deleteConfirmDescription', { name: propertyToDelete?.name }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleting">{{ t('common.cancel') }}</AlertDialogCancel>
          <AlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" :disabled="deleting" @click="executeDelete">
            <Loader2 v-if="deleting" class="w-4 h-4 mr-2 animate-spin" />
            {{ t('common.delete') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import PropertyDialog from '@/components/properties/PropertyDialog.vue'
import { Loader2 } from 'lucide-vue-next'
import { useProperties } from '@/composables/useProperties'
import { useToast } from '@/composables/useToast'
import { useDebounce } from '@/composables/useDebounce'
import type { Property, PropertyType, PropertyStatus, PropertyPurpose } from '@/types'
import { normalize } from '@/utils/normalize'
import { useNavResetStore } from '@/stores/useNavResetStore'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const navResetStore = useNavResetStore()
const toast = useToast()
const {
  properties,
  loading,
  error,
  fetchProperties,
  deleteProperty,
} = useProperties()

// View mode
const viewMode = ref<'grid' | 'list'>('grid')

// Filter state
const search = ref('')
const typeFilter = ref<PropertyType | 'all'>('all')
const statusFilter = ref<PropertyStatus | 'all'>('all')
const purposeFilter = ref<PropertyPurpose | 'all'>('all')
const debouncedSearch = useDebounce(search, 300)

// Create dialog state
const createDialogOpen = ref(false)

// Delete dialog state
const deleteDialogOpen = ref(false)
const propertyToDelete = ref<Property | null>(null)
const deleting = ref(false)

// Computed
const hasActiveFilters = computed(() =>
  search.value !== '' ||
  typeFilter.value !== 'all' ||
  statusFilter.value !== 'all' ||
  purposeFilter.value !== 'all'
)

const filteredProperties = computed(() => {
  let result = properties.value

  // Filter by search (name, address_street, address_city)
  if (debouncedSearch.value) {
    const searchNorm = normalize(debouncedSearch.value)
    result = result.filter(p =>
      normalize(p.name).includes(searchNorm) ||
      normalize(p.address_street).includes(searchNorm) ||
      normalize(p.address_city).includes(searchNorm)
    )
  }

  // Filter by property type
  if (typeFilter.value !== 'all') {
    result = result.filter(p => p.property_type === typeFilter.value)
  }

  // Filter by status
  if (statusFilter.value !== 'all') {
    result = result.filter(p => p.status === statusFilter.value)
  }

  // Filter by purpose
  if (purposeFilter.value !== 'all') {
    result = result.filter(p => p.purpose === purposeFilter.value)
  }

  return result
})

// Helper functions
function formatAddress(property: Property): string {
  const parts = [property.address_street]
  if (property.address_number) {
    parts.push(property.address_number)
  }
  parts.push(property.address_city)
  return parts.join(', ')
}

function getTypeLabel(type: PropertyType): string {
  const labels: Record<PropertyType, string> = {
    departamento: t('properties.departamento'),
    casa: t('properties.casa'),
    comercial: t('properties.comercial'),
    terreno: t('properties.terreno'),
    oficina: t('properties.oficina'),
    local: t('properties.local'),
    galpon: t('properties.galpon'),
  }
  return labels[type] || type
}


function getStatusLabel(status: PropertyStatus): string {
  const labels: Record<PropertyStatus, string> = {
    disponible: t('properties.disponible'),
    alquilada: t('properties.alquilada'),
    mantenimiento: t('properties.mantenimiento'),
    reservada: t('properties.reservada'),
    vendida: t('properties.vendida'),
  }
  return labels[status] || status
}


function getStatusClass(status: PropertyStatus): string {
  const map: Record<PropertyStatus, string> = {
    disponible: 'ok',
    alquilada: 'pending',
    mantenimiento: 'late',
    reservada: 'pending',
    vendida: 'draft',
  }
  return map[status] || 'draft'
}

// Actions
function clearFilters() {
  search.value = ''
  typeFilter.value = 'all'
  statusFilter.value = 'all'
  purposeFilter.value = 'all'
}

function openCreateDialog() {
  createDialogOpen.value = true
}

async function handleCreateSuccess() {
  await loadProperties()
}

function navigateToProperty(propertyId: string) {
  router.push({ name: 'property-detail', params: { id: propertyId } })
}

function confirmDelete(property: Property) {
  propertyToDelete.value = property
  deleteDialogOpen.value = true
}

async function executeDelete() {
  if (!propertyToDelete.value) return

  deleting.value = true

  try {
    await deleteProperty(propertyToDelete.value.id)
    toast.success(t('toast.propertyDeleted'))
    deleteDialogOpen.value = false
    propertyToDelete.value = null
  } catch (e) {
    console.error('Error deleting property:', e)
    toast.error(t('properties.deleteError'))
  } finally {
    deleting.value = false
  }
}

async function loadProperties() {
  await fetchProperties()
}

watch(() => navResetStore.signals[route.path], (val) => {
  if (val && val > 0) clearFilters()
})

onMounted(() => {
  loadProperties()
})
</script>
