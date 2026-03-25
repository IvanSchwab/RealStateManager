<template>
  <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">{{ $t('properties.title') }}</h1>
        <Button @click="openCreateDialog">
          <Plus class="w-4 h-4 mr-2" />
          {{ $t('properties.newProperty') }}
        </Button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-6">
        <div class="flex-1 min-w-[200px]">
          <Input
            v-model="filterStore.search"
            :placeholder="$t('properties.searchPlaceholder')"
            class="w-full"
          >
            <template #prefix>
              <Search class="w-4 h-4 text-muted-foreground" />
            </template>
          </Input>
        </div>

        <Select v-model="filterStore.type" class="w-[180px]">
          <SelectTrigger>
            <SelectValue :placeholder="$t('properties.type')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">{{ $t('properties.allTypes') }}</SelectItem>
              <SelectItem value="departamento">{{ $t('properties.departamento') }}</SelectItem>
              <SelectItem value="casa">{{ $t('properties.casa') }}</SelectItem>
              <SelectItem value="comercial">{{ $t('properties.comercial') }}</SelectItem>
              <SelectItem value="terreno">{{ $t('properties.terreno') }}</SelectItem>
              <SelectItem value="oficina">{{ $t('properties.oficina') }}</SelectItem>
              <SelectItem value="local">{{ $t('properties.local') }}</SelectItem>
              <SelectItem value="galpon">{{ $t('properties.galpon') }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select v-model="filterStore.status" class="w-[180px]">
          <SelectTrigger>
            <SelectValue :placeholder="$t('common.status')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">{{ $t('properties.allStatus') }}</SelectItem>
              <SelectItem value="disponible">{{ $t('properties.disponible') }}</SelectItem>
              <SelectItem value="alquilada">{{ $t('properties.alquilada') }}</SelectItem>
              <SelectItem value="mantenimiento">{{ $t('properties.mantenimiento') }}</SelectItem>
              <SelectItem value="reservada">{{ $t('properties.reservada') }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select v-model="filterStore.purpose" class="w-[180px]">
          <SelectTrigger>
            <SelectValue :placeholder="$t('properties.purpose')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">{{ $t('properties.allPurposes') }}</SelectItem>
              <SelectItem value="alquiler">{{ $t('properties.alquiler') }}</SelectItem>
              <SelectItem value="venta">{{ $t('properties.venta') }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button
          v-if="hasActiveFilters"
          variant="ghost"
          size="sm"
          @click="clearFilters"
        >
          <X class="w-4 h-4 mr-1" />
          {{ $t('common.clearFilters') }}
        </Button>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="py-12 text-center text-muted-foreground">
        <Loader2 class="w-8 h-8 mx-auto animate-spin" />
        <p class="mt-2">{{ $t('properties.loadingProperties') }}</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">{{ $t('properties.errorLoading') }}</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadProperties">
          {{ $t('common.retry') }}
        </Button>
      </div>

      <!-- Data loaded -->
      <template v-else>
        <!-- Empty state -->
        <div v-if="properties.length === 0" class="py-12 text-center">
          <Building class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p class="text-lg font-medium text-muted-foreground mb-2">
            {{ hasActiveFilters ? $t('properties.noPropertiesFiltered') : $t('properties.noProperties') }}
          </p>
          <p class="text-sm text-muted-foreground mb-4">
            {{ hasActiveFilters ? $t('properties.adjustFilters') : $t('properties.startAddingProperty') }}
          </p>
          <Button v-if="hasActiveFilters" variant="outline" @click="clearFilters">
            {{ $t('common.clearFilters') }}
          </Button>
          <Button v-else @click="openCreateDialog">
            <Plus class="w-4 h-4 mr-2" />
            {{ $t('properties.newProperty') }}
          </Button>
        </div>

        <!-- Properties table -->
        <div v-else class="bg-card border border-border rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('properties.property') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('properties.type') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('properties.purpose') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('common.address') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('properties.owner') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('common.status') }}</th>
                <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="property in properties"
                :key="property.id"
                class="border-t border-border hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3">
                  <router-link
                    :to="{ name: 'property-details', params: { id: property.id } }"
                    class="text-sm font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {{ property.name }}
                  </router-link>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ $t(`properties.${property.property_type}`) }}
                </td>
                <td class="px-4 py-3">
                  <Badge :variant="property.purpose === 'alquiler' ? 'default' : 'secondary'">
                    {{ $t(`properties.${property.purpose}`) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatAddress(property) }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ property.owner?.full_name ?? '-' }}
                </td>
                <td class="px-4 py-3">
                  <Badge :variant="getStatusVariant(property.status)">
                    {{ $t(`properties.${property.status}`) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="viewProperty(property.id)"
                      :title="$t('common.view')"
                    >
                      <Eye class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openEditDialog(property.id)"
                      :title="$t('common.edit')"
                    >
                      <Pencil class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openDeleteDialog(property)"
                      :title="$t('common.delete')"
                    >
                      <Trash2 class="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex items-center justify-between p-4 border-t">
            <p class="text-sm text-muted-foreground">
              {{ $t('common.showing') }} {{ paginationStart }}-{{ paginationEnd }} {{ $t('common.of') }} {{ filterStore.totalCount }}
            </p>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="filterStore.currentPage === 1"
                @click="goToPreviousPage"
              >
                {{ $t('common.previous') }}
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="filterStore.currentPage >= totalPages"
                @click="goToNextPage"
              >
                {{ $t('common.next') }}
              </Button>
            </div>
          </div>
        </div>

        <p v-if="totalPages <= 1" class="mt-4 text-sm text-muted-foreground">
          {{ $t('common.showing') }} {{ properties.length }} {{ $t('common.of') }} {{ filterStore.totalCount }}
          {{ filterStore.totalCount === 1 ? $t('properties.property').toLowerCase() : $t('properties.title').toLowerCase() }}
        </p>
      </template>

      <!-- Property Dialog (Create/Edit) -->
      <PropertyDialog
        v-model:open="dialogOpen"
        :property-id="editingPropertyId"
        @success="handleDialogSuccess"
      />

      <!-- Delete Confirmation Dialog -->
      <DeletePropertyDialog
        v-model:open="deleteDialogOpen"
        :property-id="deletingProperty?.id ?? ''"
        :property-name="deletingProperty?.name ?? ''"
        @confirm="handleDeleteSuccess"
      />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import PropertyDialog from '@/components/properties/PropertyDialog.vue'
import DeletePropertyDialog from '@/components/properties/DeletePropertyDialog.vue'
import {
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  Trash2,
  Building,
  Loader2
} from 'lucide-vue-next'
import { useProperties } from '@/composables/useProperties'
import { useDebounce } from '@/composables/useDebounce'
import { usePropertiesFilterStore } from '@/stores/filters/usePropertiesFilterStore'
import { storeToRefs } from 'pinia'
import type { Property } from '@/types'

const router = useRouter()
const { properties, loading, error, fetchProperties } = useProperties()
const filterStore = usePropertiesFilterStore()

// Create debounced search value
const { search } = storeToRefs(filterStore)
const debouncedSearch = useDebounce(search, 300)

// Dialog state
const dialogOpen = ref(false)
const editingPropertyId = ref<string | null>(null)
const deleteDialogOpen = ref(false)
const deletingProperty = ref<Property | null>(null)

// Computed
const hasActiveFilters = computed(() =>
  filterStore.search !== '' || filterStore.type !== 'all' ||
  filterStore.status !== 'all' || filterStore.purpose !== 'all'
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

// Methods
function formatAddress(property: Property): string {
  const parts = [property.address_street]
  if (property.address_number) parts[0] += ` ${property.address_number}`
  parts.push(property.address_city)
  return parts.join(', ')
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'disponible':
      return 'default'
    case 'alquilada':
      return 'secondary'
    case 'mantenimiento':
      return 'destructive'
    case 'reservada':
      return 'outline'
    default:
      return 'default'
  }
}

function clearFilters() {
  filterStore.resetFilters()
  loadProperties()
}

function openCreateDialog() {
  editingPropertyId.value = null
  dialogOpen.value = true
}

function openEditDialog(propertyId: string) {
  editingPropertyId.value = propertyId
  dialogOpen.value = true
}

function openDeleteDialog(property: Property) {
  deletingProperty.value = property
  deleteDialogOpen.value = true
}

function viewProperty(propertyId: string) {
  router.push({ name: 'property-details', params: { id: propertyId } })
}

function goToPreviousPage() {
  filterStore.setPage(filterStore.currentPage - 1)
  loadProperties()
}

function goToNextPage() {
  filterStore.setPage(filterStore.currentPage + 1)
  loadProperties()
}

async function loadProperties() {
  const result = await fetchProperties(
    {
      search: filterStore.search || undefined,
      type: filterStore.type,
      status: filterStore.status,
      purpose: filterStore.purpose,
    },
    {
      page: filterStore.currentPage,
      pageSize: filterStore.pageSize,
    }
  )

  if (result) {
    filterStore.setTotalCount(result.totalCount)
  }
}

async function handleDialogSuccess() {
  await loadProperties()
}

async function handleDeleteSuccess() {
  deletingProperty.value = null
  await loadProperties()
}

// Watch for non-search filter changes - immediate re-fetch
watch(
  () => [filterStore.type, filterStore.status, filterStore.purpose],
  () => {
    filterStore.resetPage()
    loadProperties()
  }
)

// Watch debounced search - re-fetch after debounce
watch(debouncedSearch, () => {
  filterStore.resetPage()
  loadProperties()
})

onMounted(() => {
  loadProperties()
})
</script>
