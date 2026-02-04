<template>
  <MainLayout>
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Tenants</h1>
        <Button @click="openCreateDialog">
          <Plus class="w-4 h-4 mr-2" />
          Add Tenant
        </Button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-6">
        <div class="flex-1 min-w-[200px]">
          <Input
            v-model="searchQuery"
            placeholder="Search by name, email or phone..."
            class="w-full"
          >
            <template #prefix>
              <Search class="w-4 h-4 text-muted-foreground" />
            </template>
          </Input>
        </div>

        <Select v-model="filterStatus" class="w-[180px]">
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select v-model="filterEmployer" class="w-[200px]">
          <SelectTrigger>
            <SelectValue placeholder="Employment" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">All Employment</SelectItem>
              <SelectItem value="with">With Employer</SelectItem>
              <SelectItem value="without">Without Employer</SelectItem>
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
          Clear filters
        </Button>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="py-12 text-center text-muted-foreground">
        <Loader2 class="w-8 h-8 mx-auto animate-spin" />
        <p class="mt-2">Loading tenants...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">Error loading tenants</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="fetchTenants()">
          Retry
        </Button>
      </div>

      <!-- Data loaded -->
      <template v-else>
        <!-- Empty state -->
        <div v-if="filteredTenants.length === 0" class="py-12 text-center">
          <Users class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p class="text-lg font-medium text-muted-foreground mb-2">
            {{ hasActiveFilters ? 'No tenants match your filters' : 'No tenants found' }}
          </p>
          <p class="text-sm text-muted-foreground mb-4">
            {{ hasActiveFilters
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first tenant'
            }}
          </p>
          <Button v-if="hasActiveFilters" variant="outline" @click="clearFilters">
            Clear filters
          </Button>
          <Button v-else @click="openCreateDialog">
            <Plus class="w-4 h-4 mr-2" />
            Add Tenant
          </Button>
        </div>

        <!-- Tenants table (desktop) -->
        <div v-else class="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Name</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Phone</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Employer</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Monthly Income</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="tenant in filteredTenants"
                :key="tenant.id"
                class="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
                @click="viewTenant(tenant.id)"
              >
                <td class="px-4 py-3">
                  <span class="text-sm font-medium text-foreground hover:text-primary">
                    {{ tenant.last_name }}, {{ tenant.first_name }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ tenant.email ?? '-' }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ tenant.phone }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ tenant.employer ?? '-' }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatCurrency(tenant.monthly_income) }}
                </td>
                <td class="px-4 py-3">
                  <Badge :variant="getStatusVariant(tenant.status)" class="capitalize">
                    {{ tenant.status }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="viewTenant(tenant.id)"
                      title="View details"
                    >
                      <Eye class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openEditDialog(tenant.id)"
                      title="Edit tenant"
                    >
                      <Pencil class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openDeleteDialog(tenant)"
                      title="Delete tenant"
                    >
                      <Trash2 class="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tenants cards (mobile) -->
        <div v-if="filteredTenants.length > 0" class="md:hidden space-y-4">
          <div
            v-for="tenant in filteredTenants"
            :key="tenant.id"
            class="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/30 transition-colors"
            @click="viewTenant(tenant.id)"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="font-medium">{{ tenant.last_name }}, {{ tenant.first_name }}</h3>
                <p class="text-sm text-muted-foreground">{{ tenant.email ?? 'No email' }}</p>
              </div>
              <Badge :variant="getStatusVariant(tenant.status)" class="capitalize">
                {{ tenant.status }}
              </Badge>
            </div>

            <div class="space-y-1 text-sm mb-3">
              <p><span class="text-muted-foreground">Phone:</span> {{ tenant.phone }}</p>
              <p><span class="text-muted-foreground">Employer:</span> {{ tenant.employer ?? '-' }}</p>
              <p><span class="text-muted-foreground">Income:</span> {{ formatCurrency(tenant.monthly_income) }}</p>
            </div>

            <div class="flex items-center justify-end gap-1 pt-3 border-t" @click.stop>
              <Button
                variant="ghost"
                size="sm"
                @click="viewTenant(tenant.id)"
              >
                <Eye class="w-4 h-4 mr-1" />
                View
              </Button>
              <Button
                variant="ghost"
                size="sm"
                @click="openEditDialog(tenant.id)"
              >
                <Pencil class="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                @click="openDeleteDialog(tenant)"
              >
                <Trash2 class="w-4 h-4 mr-1 text-destructive" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <p class="mt-4 text-sm text-muted-foreground">
          Showing {{ filteredTenants.length }} of {{ tenants.length }}
          {{ tenants.length === 1 ? 'tenant' : 'tenants' }}
        </p>
      </template>

      <!-- Tenant Dialog (Create/Edit) -->
      <TenantDialog
        v-model:open="dialogOpen"
        :tenant-id="editingTenantId"
        @success="handleDialogSuccess"
      />

      <!-- Delete Confirmation Dialog -->
      <DeleteTenantDialog
        v-model:open="deleteDialogOpen"
        :tenant-id="deletingTenant?.id ?? ''"
        :tenant-name="deletingTenantName"
        @confirm="handleDeleteSuccess"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
import TenantDialog from '@/components/tenants/TenantDialog.vue'
import DeleteTenantDialog from '@/components/tenants/DeleteTenantDialog.vue'
import {
  Plus,
  Search,
  X,
  Eye,
  Pencil,
  Trash2,
  Users,
  Loader2
} from 'lucide-vue-next'
import { useTenants } from '@/composables/useTenants'
import type { Tenant } from '@/types'

const router = useRouter()
const { tenants, loading, error, fetchTenants } = useTenants()

// Filter state
const searchQuery = ref('')
const filterStatus = ref('all')
const filterEmployer = ref('all')

// Dialog state
const dialogOpen = ref(false)
const editingTenantId = ref<string | null>(null)
const deleteDialogOpen = ref(false)
const deletingTenant = ref<Tenant | null>(null)

// Computed
const hasActiveFilters = computed(() =>
  searchQuery.value !== '' || filterStatus.value !== 'all' || filterEmployer.value !== 'all'
)

const filteredTenants = computed(() => {
  let result = tenants.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t =>
      t.first_name.toLowerCase().includes(query) ||
      t.last_name.toLowerCase().includes(query) ||
      (t.email?.toLowerCase().includes(query) ?? false) ||
      t.phone.toLowerCase().includes(query)
    )
  }

  // Status filter
  if (filterStatus.value !== 'all') {
    result = result.filter(t => t.status === filterStatus.value)
  }

  // Employer filter
  if (filterEmployer.value === 'with') {
    result = result.filter(t => t.employer !== null)
  } else if (filterEmployer.value === 'without') {
    result = result.filter(t => t.employer === null)
  }

  return result
})

const deletingTenantName = computed(() => {
  if (!deletingTenant.value) return ''
  return `${deletingTenant.value.last_name}, ${deletingTenant.value.first_name}`
})

// Methods
function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'activo':
      return 'default'
    case 'inactivo':
      return 'secondary'
    default:
      return 'default'
  }
}

function clearFilters() {
  searchQuery.value = ''
  filterStatus.value = 'all'
  filterEmployer.value = 'all'
}

function openCreateDialog() {
  editingTenantId.value = null
  dialogOpen.value = true
}

function openEditDialog(tenantId: string) {
  editingTenantId.value = tenantId
  dialogOpen.value = true
}

function openDeleteDialog(tenant: Tenant) {
  deletingTenant.value = tenant
  deleteDialogOpen.value = true
}

function viewTenant(tenantId: string) {
  router.push({ name: 'tenant-details', params: { id: tenantId } })
}

async function handleDialogSuccess() {
  await fetchTenants()
}

async function handleDeleteSuccess() {
  deletingTenant.value = null
  await fetchTenants()
}

onMounted(() => {
  fetchTenants()
})
</script>
