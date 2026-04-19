<template>
  <div class="p-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mb-6">
        <h1 class="text-2xl font-bold">{{ $t('owners.title') }}</h1>
        <Button @click="openCreateDialog">
          <Plus class="w-4 h-4 mr-2" />
          {{ $t('owners.newOwner') }}
        </Button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-6">
        <div class="flex-1 min-w-[200px]">
          <Input
            v-model="filterStore.search"
            :placeholder="$t('owners.searchPlaceholder')"
            class="w-full"
          >
            <template #prefix>
              <Search class="w-4 h-4 text-muted-foreground" />
            </template>
          </Input>
        </div>

        <Select v-model="propertiesFilter" class="w-full sm:w-auto">
          <SelectTrigger>
            <SelectValue :placeholder="$t('nav.properties')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">{{ $t('common.all') }}</SelectItem>
              <SelectItem value="with">{{ $t('owners.withProperties') }}</SelectItem>
              <SelectItem value="without">{{ $t('owners.withoutProperties') }}</SelectItem>
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
        <p class="mt-2">{{ $t('owners.loadingOwners') }}</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">{{ $t('owners.errorLoading') }}</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadOwners">
          {{ $t('common.retry') }}
        </Button>
      </div>

      <!-- Data loaded -->
      <template v-else>
        <!-- Empty state -->
        <div v-if="owners.length === 0" class="py-12 text-center">
          <UserCircle class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p class="text-lg font-medium text-muted-foreground mb-2">
            {{ hasActiveFilters ? $t('owners.noOwnersFiltered') : $t('owners.noOwners') }}
          </p>
          <p class="text-sm text-muted-foreground mb-4">
            {{ hasActiveFilters
              ? $t('properties.adjustFilters')
              : $t('owners.startAddingOwner')
            }}
          </p>
          <Button v-if="hasActiveFilters" variant="outline" @click="clearFilters">
            {{ $t('common.clearFilters') }}
          </Button>
          <Button v-else @click="openCreateDialog">
            <Plus class="w-4 h-4 mr-2" />
            {{ $t('owners.newOwner') }}
          </Button>
        </div>

        <!-- Owners table (desktop) -->
        <div v-else class="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('common.name') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('common.email') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('common.phone') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('owners.cuitCuil') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('nav.properties') }}</th>
                <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="owner in owners"
                :key="owner.id"
                class="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                @click="viewOwner(owner.id)"
              >
                <td class="px-4 py-3">
                  <span class="text-sm font-medium text-foreground hover:text-primary">
                    {{ owner.full_name }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ owner.email ?? '-' }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ owner.phone ?? '-' }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ owner.cuit_cuil ?? '-' }}
                </td>
                <td class="px-4 py-3">
                  <Badge
                    :variant="getPropertyCount(owner.id) > 0 ? 'default' : 'secondary'"
                  >
                    {{ getPropertyCount(owner.id) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="viewOwner(owner.id)"
                      :title="$t('common.view')"
                    >
                      <Eye class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openEditDialog(owner.id)"
                      :title="$t('common.edit')"
                    >
                      <Pencil class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openDeleteDialog(owner)"
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

        <!-- Owners cards (mobile) -->
        <div v-if="owners.length > 0" class="md:hidden space-y-4">
          <div
            v-for="owner in owners"
            :key="owner.id"
            class="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/30 transition-colors"
            @click="viewOwner(owner.id)"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="font-medium">{{ owner.full_name }}</h3>
                <p class="text-sm text-muted-foreground">{{ owner.email ?? $t('owners.noEmail') }}</p>
              </div>
              <Badge
                :variant="getPropertyCount(owner.id) > 0 ? 'default' : 'secondary'"
              >
                {{ $t('owners.propertiesCount', { count: getPropertyCount(owner.id) }, getPropertyCount(owner.id)) }}
              </Badge>
            </div>

            <div class="space-y-1 text-sm mb-3">
              <p><span class="text-muted-foreground">{{ $t('common.phone') }}:</span> {{ owner.phone ?? '-' }}</p>
              <p><span class="text-muted-foreground">{{ $t('owners.cuitCuil') }}:</span> {{ owner.cuit_cuil ?? '-' }}</p>
            </div>

            <div class="flex items-center justify-end gap-1 pt-3 border-t" @click.stop>
              <Button
                variant="ghost"
                size="sm"
                @click="viewOwner(owner.id)"
              >
                <Eye class="w-4 h-4 mr-1" />
                {{ $t('common.view') }}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                @click="openEditDialog(owner.id)"
              >
                <Pencil class="w-4 h-4 mr-1" />
                {{ $t('common.edit') }}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                @click="openDeleteDialog(owner)"
              >
                <Trash2 class="w-4 h-4 mr-1 text-destructive" />
                {{ $t('common.delete') }}
              </Button>
            </div>
          </div>

          <!-- Mobile Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              :disabled="filterStore.currentPage === 1"
              @click="goToPreviousPage"
            >
              {{ $t('common.previous') }}
            </Button>
            <span class="flex items-center text-sm text-muted-foreground px-2">
              {{ filterStore.currentPage }} / {{ totalPages }}
            </span>
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

        <p v-if="totalPages <= 1" class="mt-4 text-sm text-muted-foreground">
          {{ $t('common.showing') }} {{ owners.length }} {{ $t('common.of') }} {{ filterStore.totalCount }}
          {{ filterStore.totalCount === 1 ? $t('properties.owner').toLowerCase() : $t('owners.title').toLowerCase() }}
        </p>
      </template>

      <!-- Owner Dialog (Create/Edit) -->
      <OwnerDialog
        v-model:open="dialogOpen"
        :owner-id="editingOwnerId"
        @success="handleDialogSuccess"
      />

      <!-- Delete Confirmation Dialog -->
      <DeleteOwnerDialog
        v-model:open="deleteDialogOpen"
        :owner-id="deletingOwner?.id ?? ''"
        :owner-name="deletingOwner?.full_name ?? ''"
        :property-count="deletingOwnerPropertyCount"
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
import OwnerDialog from '@/components/owners/OwnerDialog.vue'
import DeleteOwnerDialog from '@/components/owners/DeleteOwnerDialog.vue'
import {
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  Trash2,
  UserCircle,
  Loader2
} from 'lucide-vue-next'
import { useOwners } from '@/composables/useOwners'
import { useDebounce } from '@/composables/useDebounce'
import { useOwnersFilterStore } from '@/stores/filters/useOwnersFilterStore'
import { storeToRefs } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { Owner } from '@/types'

const router = useRouter()
const { owners, loading, error, fetchOwners, getOwnerPropertyCount } = useOwners()
const filterStore = useOwnersFilterStore()

// Create debounced search value
const { search } = storeToRefs(filterStore)
const debouncedSearch = useDebounce(search, 300)

// Property counts for each owner (for display in table)
const propertyCounts = ref<Map<string, number>>(new Map())

// Local properties filter that maps to store's hasProperties
const propertiesFilter = ref<'all' | 'with' | 'without'>('all')

// Dialog state
const dialogOpen = ref(false)
const editingOwnerId = ref<string | null>(null)
const deleteDialogOpen = ref(false)
const deletingOwner = ref<Owner | null>(null)
const deletingOwnerPropertyCount = ref(0)

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

// Methods
function getPropertyCount(ownerId: string): number {
  return propertyCounts.value.get(ownerId) ?? 0
}

async function loadPropertyCounts() {
  if (owners.value.length === 0) return

  const ownerIds = owners.value.map(o => o.id)

  try {
    const { data } = await supabase
      .from('properties')
      .select('owner_id')
      .in('owner_id', ownerIds)
      .is('deleted_at', null)

    const counts = new Map<string, number>()
    data?.forEach(p => {
      if (p.owner_id) {
        const count = counts.get(p.owner_id) || 0
        counts.set(p.owner_id, count + 1)
      }
    })

    propertyCounts.value = counts
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
    await loadPropertyCounts()
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
})
</script>
