<template>
  <MainLayout>
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Contratos</h1>
        <Button @click="openCreateDialog">
          <Plus class="w-4 h-4 mr-2" />
          Nuevo Contrato
        </Button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-6">
        <div class="flex-1 min-w-[200px]">
          <Input
            v-model="searchQuery"
            placeholder="Buscar por dirección o inquilino..."
            class="w-full"
          >
            <template #prefix>
              <Search class="w-4 h-4 text-muted-foreground" />
            </template>
          </Input>
        </div>

        <Select v-model="filterStatus" class="w-[180px]">
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="expiring_soon">Por Vencer</SelectItem>
              <SelectItem value="expired">Vencidos</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select v-model="filterContractType" class="w-[180px]">
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todos los Tipos</SelectItem>
              <SelectItem value="vivienda">Vivienda</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="cochera">Cochera</SelectItem>
              <SelectItem value="oficina">Oficina</SelectItem>
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
          Limpiar filtros
        </Button>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="py-12 text-center text-muted-foreground">
        <Loader2 class="w-8 h-8 mx-auto animate-spin" />
        <p class="mt-2">Cargando contratos...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">Error al cargar contratos</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadContracts">
          Reintentar
        </Button>
      </div>

      <!-- Data loaded -->
      <template v-else>
        <!-- Empty state -->
        <div v-if="filteredContracts.length === 0" class="py-12 text-center">
          <FileText class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p class="text-lg font-medium text-muted-foreground mb-2">
            {{ hasActiveFilters ? 'No hay contratos que coincidan' : 'No hay contratos' }}
          </p>
          <p class="text-sm text-muted-foreground mb-4">
            {{ hasActiveFilters
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza creando tu primer contrato'
            }}
          </p>
          <Button v-if="hasActiveFilters" variant="outline" @click="clearFilters">
            Limpiar filtros
          </Button>
          <Button v-else @click="openCreateDialog">
            <Plus class="w-4 h-4 mr-2" />
            Nuevo Contrato
          </Button>
        </div>

        <!-- Contracts table (desktop) -->
        <div v-else class="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Propiedad</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Inquilino</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Inicio</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fin</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Alquiler</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="contract in filteredContracts"
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
                  <Badge variant="outline" class="capitalize">
                    {{ contractTypeLabels[contract.contract_type] }}
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
                    {{ statusLabels[calculateDisplayStatus(contract)] }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="viewContract(contract.id)"
                      title="Ver detalles"
                    >
                      <Eye class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openEditDialog(contract.id)"
                      title="Editar contrato"
                    >
                      <Pencil class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openCancelDialog(contract)"
                      title="Cancelar contrato"
                    >
                      <XCircle class="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Contracts cards (mobile) -->
        <div v-if="filteredContracts.length > 0" class="md:hidden space-y-4">
          <div
            v-for="contract in filteredContracts"
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
                {{ statusLabels[calculateDisplayStatus(contract)] }}
              </Badge>
            </div>

            <div class="flex items-center gap-2 mb-3">
              <Badge variant="outline" class="capitalize">
                {{ contractTypeLabels[contract.contract_type] }}
              </Badge>
              <span class="text-lg font-bold text-primary">
                {{ formatCurrency(contract.current_rent_amount) }}
              </span>
            </div>

            <div class="space-y-1 text-sm mb-3">
              <p>
                <span class="text-muted-foreground">Inicio:</span>
                {{ formatDate(contract.start_date) }}
              </p>
              <p>
                <span class="text-muted-foreground">Fin:</span>
                {{ formatDate(contract.end_date) }}
              </p>
            </div>

            <div class="flex items-center justify-end gap-1 pt-3 border-t" @click.stop>
              <Button
                variant="ghost"
                size="sm"
                @click="viewContract(contract.id)"
              >
                <Eye class="w-4 h-4 mr-1" />
                Ver
              </Button>
              <Button
                variant="ghost"
                size="sm"
                @click="openEditDialog(contract.id)"
              >
                <Pencil class="w-4 h-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                @click="openCancelDialog(contract)"
              >
                <XCircle class="w-4 h-4 mr-1 text-destructive" />
                Cancelar
              </Button>
            </div>
          </div>
        </div>

        <p class="mt-4 text-sm text-muted-foreground">
          Mostrando {{ filteredContracts.length }} de {{ contracts.length }}
          {{ contracts.length === 1 ? 'contrato' : 'contratos' }}
        </p>
      </template>

      <!-- Contract Dialog (Create/Edit) -->
      <ContractDialog
        v-model:open="dialogOpen"
        :contract-id="editingContractId"
        @success="handleDialogSuccess"
      />

      <!-- Cancel Contract Confirmation Dialog -->
      <CancelContractDialog
        v-model:open="cancelDialogOpen"
        :contract-id="cancellingContract?.id ?? ''"
        :property-address="cancellingContractPropertyAddress"
        :tenant-name="cancellingContractTenantName"
        @confirm="handleCancelSuccess"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
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
} from 'lucide-vue-next'
import { useContracts } from '@/composables/useContracts'
import type { ContractWithRelations, ContractType, ContractDisplayStatus } from '@/types'

const router = useRouter()
const {
  contracts,
  loading,
  error,
  fetchContracts,
  calculateDisplayStatus,
  formatPropertyAddress,
  getTitular,
} = useContracts()

// Filter state
const searchQuery = ref('')
const filterStatus = ref<ContractDisplayStatus | 'all'>('all')
const filterContractType = ref<ContractType | 'all'>('all')

// Dialog state
const dialogOpen = ref(false)
const editingContractId = ref<string | null>(null)
const cancelDialogOpen = ref(false)
const cancellingContract = ref<ContractWithRelations | null>(null)

// Labels
const contractTypeLabels: Record<ContractType, string> = {
  vivienda: 'Vivienda',
  comercial: 'Comercial',
  cochera: 'Cochera',
  oficina: 'Oficina',
}

const statusLabels: Record<ContractDisplayStatus, string> = {
  active: 'Activo',
  expiring_soon: 'Por Vencer',
  expired: 'Vencido',
  cancelled: 'Cancelado',
}

// Computed
const hasActiveFilters = computed(() =>
  searchQuery.value !== '' ||
  filterStatus.value !== 'all' ||
  filterContractType.value !== 'all'
)

const filteredContracts = computed(() => {
  let result = contracts.value

  // Search filter (client-side for instant feedback)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(contract => {
      const address = formatPropertyAddress(contract).toLowerCase()
      const titularName = getTitularName(contract).toLowerCase()
      return address.includes(query) || titularName.includes(query)
    })
  }

  // Status filter (client-side)
  if (filterStatus.value !== 'all') {
    result = result.filter(contract => {
      return calculateDisplayStatus(contract) === filterStatus.value
    })
  }

  // Contract type filter (client-side)
  if (filterContractType.value !== 'all') {
    result = result.filter(contract => contract.contract_type === filterContractType.value)
  }

  return result
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
  if (!titular) return 'Sin inquilino'
  return `${titular.first_name} ${titular.last_name}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStatusBadgeClass(status: ContractDisplayStatus): string {
  const classes: Record<ContractDisplayStatus, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    expiring_soon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
  }
  return classes[status] ?? classes.active
}

function clearFilters() {
  searchQuery.value = ''
  filterStatus.value = 'all'
  filterContractType.value = 'all'
}

function openCreateDialog() {
  editingContractId.value = null
  dialogOpen.value = true
}

function openEditDialog(contractId: string) {
  editingContractId.value = contractId
  dialogOpen.value = true
}

function openCancelDialog(contract: ContractWithRelations) {
  cancellingContract.value = contract
  cancelDialogOpen.value = true
}

function viewContract(contractId: string) {
  router.push({ name: 'contract-details', params: { id: contractId } })
}

async function loadContracts() {
  await fetchContracts({
    status: filterStatus.value,
    contract_type: filterContractType.value,
  })
}

async function handleDialogSuccess() {
  await loadContracts()
}

async function handleCancelSuccess() {
  cancellingContract.value = null
  await loadContracts()
}

// Fetch contracts when filters change (debounced for search)
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadContracts()
  }, 300)
})

watch([filterStatus, filterContractType], () => {
  loadContracts()
})

onMounted(() => {
  loadContracts()
})
</script>
