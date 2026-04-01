<template>
  <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">{{ $t('contracts.title') }}</h1>
        <Button @click="openCreateDialog">
          <Plus class="w-4 h-4 mr-2" />
          {{ $t('contracts.newContract') }}
        </Button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-6">
        <div class="flex-1 min-w-[200px]">
          <Input
            v-model="filterStore.search"
            :placeholder="$t('contracts.searchPlaceholder')"
            class="w-full"
          >
            <template #prefix>
              <Search class="w-4 h-4 text-muted-foreground" />
            </template>
          </Input>
        </div>

        <Select v-model="filterStore.status" class="w-[180px]">
          <SelectTrigger>
            <SelectValue :placeholder="$t('common.status')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">{{ $t('contracts.allStatus') }}</SelectItem>
              <SelectItem value="active">{{ $t('contracts.active') }}</SelectItem>
              <SelectItem value="expiring_soon">{{ $t('contracts.expiring_soon') }}</SelectItem>
              <SelectItem value="expired">{{ $t('contracts.expired') }}</SelectItem>
              <SelectItem value="cancelled">{{ $t('contracts.cancelled') }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select v-model="filterStore.contractType" class="w-[180px]">
          <SelectTrigger>
            <SelectValue :placeholder="$t('common.type')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">{{ $t('contracts.allTypes') }}</SelectItem>
              <SelectItem value="vivienda">{{ $t('contracts.vivienda') }}</SelectItem>
              <SelectItem value="comercial">{{ $t('contracts.comercial') }}</SelectItem>
              <SelectItem value="cochera">{{ $t('contracts.cochera') }}</SelectItem>
              <SelectItem value="oficina">{{ $t('contracts.oficina') }}</SelectItem>
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
        <p class="mt-2">{{ $t('contracts.loadingContracts') }}</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">{{ $t('contracts.errorLoading') }}</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadContracts">
          {{ $t('common.retry') }}
        </Button>
      </div>

      <!-- Data loaded -->
      <template v-else>
        <!-- Empty state -->
        <div v-if="contracts.length === 0" class="py-12 text-center">
          <FileText class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p class="text-lg font-medium text-muted-foreground mb-2">
            {{ hasActiveFilters ? $t('contracts.noContractsFiltered') : $t('contracts.noContracts') }}
          </p>
          <p class="text-sm text-muted-foreground mb-4">
            {{ hasActiveFilters
              ? $t('properties.adjustFilters')
              : $t('contracts.startAddingContract')
            }}
          </p>
          <Button v-if="hasActiveFilters" variant="outline" @click="clearFilters">
            {{ $t('common.clearFilters') }}
          </Button>
          <Button v-else @click="openCreateDialog">
            <Plus class="w-4 h-4 mr-2" />
            {{ $t('contracts.newContract') }}
          </Button>
        </div>

        <!-- Contracts table (desktop) -->
        <div v-else class="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('contracts.property') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('contracts.tenant') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('common.type') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('contracts.startDate') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('contracts.endDate') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('contracts.baseRent') }}</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">{{ $t('common.status') }}</th>
                <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="contract in contracts"
                :key="contract.id"
                class="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                @click="viewContract(contract.id)"
              >
                <td class="px-4 py-3">
                  <span class="text-sm font-medium text-foreground">
                    {{ formatPropertyAddress(contract) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ getTitularName(contract) }}
                </td>
                <td class="px-4 py-3">
                  <Badge variant="outline">
                    {{ $t(`contracts.${contract.contract_type}`) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatDate(contract.start_date) }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatDate(contract.end_date) }}
                </td>
                <td class="px-4 py-3 text-sm font-medium">
                  {{ formatCurrency(contract.current_rent_amount) }}
                </td>
                <td class="px-4 py-3">
                  <Badge :class="getStatusBadgeClass(calculateDisplayStatus(contract))">
                    {{ $t(`contracts.${calculateDisplayStatus(contract)}`) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="viewContract(contract.id)"
                      :title="$t('common.view')"
                    >
                      <Eye class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openEditDialog(contract.id)"
                      :title="$t('common.edit')"
                    >
                      <Pencil class="w-4 h-4" />
                    </Button>
                    <!-- Lifecycle actions - hidden for draft, disabled for rescinded -->
                    <template v-if="calculateDisplayStatus(contract) !== 'draft'">
                      <Button
                        variant="ghost"
                        size="icon"
                        :disabled="calculateDisplayStatus(contract) === 'cancelled'"
                        @click="openRescindDialog(contract)"
                        :title="$t('contracts.rescindContract')"
                      >
                        <XCircle class="w-4 h-4 text-destructive" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        :disabled="calculateDisplayStatus(contract) === 'cancelled'"
                        @click="handleRenew"
                        :title="$t('contracts.renewContract')"
                      >
                        <RefreshCw class="w-4 h-4" />
                      </Button>
                    </template>
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

        <!-- Contracts cards (mobile) -->
        <div v-if="contracts.length > 0" class="md:hidden space-y-4">
          <div
            v-for="contract in contracts"
            :key="contract.id"
            class="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/30 transition-colors"
            @click="viewContract(contract.id)"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="font-medium">{{ formatPropertyAddress(contract) }}</h3>
                <p class="text-sm text-muted-foreground">{{ getTitularName(contract) }}</p>
              </div>
              <Badge :class="getStatusBadgeClass(calculateDisplayStatus(contract))">
                {{ $t(`contracts.${calculateDisplayStatus(contract)}`) }}
              </Badge>
            </div>

            <div class="flex items-center gap-2 mb-3">
              <Badge variant="outline">
                {{ $t(`contracts.${contract.contract_type}`) }}
              </Badge>
              <span class="text-lg font-bold text-primary">
                {{ formatCurrency(contract.current_rent_amount) }}
              </span>
            </div>

            <div class="space-y-1 text-sm mb-3">
              <p>
                <span class="text-muted-foreground">{{ $t('contracts.startDate') }}:</span>
                {{ formatDate(contract.start_date) }}
              </p>
              <p>
                <span class="text-muted-foreground">{{ $t('contracts.endDate') }}:</span>
                {{ formatDate(contract.end_date) }}
              </p>
            </div>

            <div class="flex flex-wrap items-center justify-end gap-1 pt-3 border-t" @click.stop>
              <Button
                variant="ghost"
                size="sm"
                @click="viewContract(contract.id)"
              >
                <Eye class="w-4 h-4 mr-1" />
                {{ $t('common.view') }}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                @click="openEditDialog(contract.id)"
              >
                <Pencil class="w-4 h-4 mr-1" />
                {{ $t('common.edit') }}
              </Button>
              <!-- Lifecycle actions - hidden for draft, disabled for rescinded -->
              <template v-if="calculateDisplayStatus(contract) !== 'draft'">
                <Button
                  variant="ghost"
                  size="sm"
                  :disabled="calculateDisplayStatus(contract) === 'cancelled'"
                  @click="openRescindDialog(contract)"
                >
                  <XCircle class="w-4 h-4 mr-1 text-destructive" />
                  {{ $t('contracts.rescindContract') }}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  :disabled="calculateDisplayStatus(contract) === 'cancelled'"
                  @click="handleRenew"
                >
                  <RefreshCw class="w-4 h-4 mr-1" />
                  {{ $t('contracts.renewContract') }}
                </Button>
              </template>
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
          {{ $t('common.showing') }} {{ contracts.length }} {{ $t('common.of') }} {{ filterStore.totalCount }}
          {{ filterStore.totalCount === 1 ? $t('contracts.contract').toLowerCase() : $t('contracts.title').toLowerCase() }}
        </p>
      </template>

      <!-- Contract Dialog (Create/Edit) -->
      <ContractDialog
        v-model:open="dialogOpen"
        :contract-id="editingContractId"
        @success="handleDialogSuccess"
      />

      <!-- Rescind Contract Confirmation Dialog -->
      <CancelContractDialog
        v-model:open="cancelDialogOpen"
        :contract-id="cancellingContract?.id ?? ''"
        :property-address="cancellingContractPropertyAddress"
        :tenant-name="cancellingContractTenantName"
        @confirm="handleRescindSuccess"
      />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
import ContractDialog from '@/components/contracts/ContractDialog.vue'
import CancelContractDialog from '@/components/contracts/CancelContractDialog.vue'
import {
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  XCircle,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-vue-next'
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
const {
  contracts,
  loading,
  error,
  fetchContracts,
  calculateDisplayStatus,
  formatPropertyAddress,
  getTitular,
} = useContracts()
const filterStore = useContractsFilterStore()

// Create debounced search value
const { search } = storeToRefs(filterStore)
const debouncedSearch = useDebounce(search, 300)

// Dialog state
const dialogOpen = ref(false)
const editingContractId = ref<string | null>(null)
const cancelDialogOpen = ref(false)
const cancellingContract = ref<ContractWithRelations | null>(null)

// Computed
const hasActiveFilters = computed(() =>
  filterStore.search !== '' ||
  filterStore.status !== 'all' ||
  filterStore.contractType !== 'all'
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

const cancellingContractPropertyAddress = computed(() => {
  if (!cancellingContract.value) return ''
  return formatPropertyAddress(cancellingContract.value)
})

const cancellingContractTenantName = computed(() => {
  if (!cancellingContract.value) return ''
  return getTitularName(cancellingContract.value)
})

// Methods
function getTitularName(contract: ContractWithRelations): string {
  const titular = getTitular(contract)
  if (!titular) return t('contracts.noTenantAssigned')
  return `${titular.first_name} ${titular.last_name}`
}

function getStatusBadgeClass(status: ContractDisplayStatus): string {
  const classes: Record<ContractDisplayStatus, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    expiring_soon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
    renewed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    draft: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  }
  return classes[status] ?? classes.active
}

function clearFilters() {
  filterStore.resetFilters()
  loadContracts()
}

function openCreateDialog() {
  editingContractId.value = null
  dialogOpen.value = true
}

function openEditDialog(contractId: string) {
  editingContractId.value = contractId
  dialogOpen.value = true
}

function openRescindDialog(contract: ContractWithRelations) {
  cancellingContract.value = contract
  cancelDialogOpen.value = true
}

function handleRenew() {
  toast.info(t('contracts.featureComingSoon'))
}

function viewContract(contractId: string) {
  router.push({ name: 'contract-details', params: { id: contractId } })
}

function goToPreviousPage() {
  filterStore.setPage(filterStore.currentPage - 1)
  loadContracts()
}

function goToNextPage() {
  filterStore.setPage(filterStore.currentPage + 1)
  loadContracts()
}

async function loadContracts() {
  const result = await fetchContracts(
    {
      search: filterStore.search || undefined,
      status: filterStore.status,
      contract_type: filterStore.contractType,
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
  await loadContracts()
}

async function handleRescindSuccess() {
  cancellingContract.value = null
  await loadContracts()
}

// Watch for non-search filter changes - immediate re-fetch
watch(
  () => [filterStore.status, filterStore.contractType],
  () => {
    filterStore.resetPage()
    loadContracts()
  }
)

// Watch debounced search - re-fetch after debounce
watch(debouncedSearch, () => {
  filterStore.resetPage()
  loadContracts()
})

onMounted(() => {
  loadContracts()
})
</script>
