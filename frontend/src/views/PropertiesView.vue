<template>
  <MainLayout>
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Propiedades</h1>
        <Button @click="openCreateDialog">
          <Plus class="w-4 h-4 mr-2" />
          Nueva Propiedad
        </Button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-4 mb-6">
        <div class="flex-1 min-w-[200px]">
          <Input
            v-model="searchQuery"
            placeholder="Buscar por nombre o dirección..."
            class="w-full"
          >
            <template #prefix>
              <Search class="w-4 h-4 text-muted-foreground" />
            </template>
          </Input>
        </div>
        
        <Select v-model="filterType" class="w-[180px]">
          <SelectTrigger>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todos los Tipos</SelectItem>
              <SelectItem value="departamento">Departamento</SelectItem>
              <SelectItem value="casa">Casa</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="terreno">Terreno</SelectItem>
              <SelectItem value="oficina">Oficina</SelectItem>
              <SelectItem value="local">Local</SelectItem>
              <SelectItem value="galpon">Galpón</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select v-model="filterStatus" class="w-[180px]">
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="alquilada">Alquilada</SelectItem>
              <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
              <SelectItem value="reservada">Reservada</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select v-model="filterPurpose" class="w-[180px]">
          <SelectTrigger>
            <SelectValue placeholder="Finalidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="alquiler">Alquiler</SelectItem>
              <SelectItem value="venta">Venta</SelectItem>
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
        <p class="mt-2">Cargando propiedades...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">Error al cargar propiedades</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="fetchProperties">
          Reintentar
        </Button>
      </div>

      <!-- Data loaded -->
      <template v-else>
        <!-- Empty state -->
        <div v-if="filteredProperties.length === 0" class="py-12 text-center">
          <Building class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p class="text-lg font-medium text-muted-foreground mb-2">
            {{ hasActiveFilters ? 'No se encontraron propiedades' : 'No hay propiedades registradas' }}
          </p>
          <p class="text-sm text-muted-foreground mb-4">
            {{ hasActiveFilters
              ? 'Intente ajustar los filtros de búsqueda'
              : 'Comience agregando su primera propiedad'
            }}
          </p>
          <Button v-if="hasActiveFilters" variant="outline" @click="clearFilters">
            Limpiar filtros
          </Button>
          <Button v-else @click="openCreateDialog">
            <Plus class="w-4 h-4 mr-2" />
            Nueva Propiedad
          </Button>
        </div>

        <!-- Properties table -->
        <div v-else class="bg-card border border-border rounded-lg overflow-hidden">
          <table class="w-full">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Propiedad</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Finalidad</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Dirección</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Propietario</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                <th class="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="property in filteredProperties"
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
                <td class="px-4 py-3 text-sm text-muted-foreground capitalize">
                  {{ property.property_type }}
                </td>
                <td class="px-4 py-3">
                  <Badge :variant="property.purpose === 'alquiler' ? 'default' : 'secondary'">
                    {{ property.purpose === 'alquiler' ? 'Alquiler' : 'Venta' }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ formatAddress(property) }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ property.owner?.full_name ?? '-' }}
                </td>
                <td class="px-4 py-3">
                  <Badge :variant="getStatusVariant(property.status)" class="capitalize">
                    {{ property.status }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="viewProperty(property.id)"
                      title="View details"
                    >
                      <Eye class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openEditDialog(property.id)"
                      title="Edit property"
                    >
                      <Pencil class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openDeleteDialog(property)"
                      title="Delete property"
                    >
                      <Trash2 class="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="mt-4 text-sm text-muted-foreground">
          Mostrando {{ filteredProperties.length }} de {{ properties.length }}
          {{ properties.length === 1 ? 'propiedad' : 'propiedades' }}
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
import type { Property } from '@/types'

const router = useRouter()
const { properties, loading, error, fetchProperties } = useProperties()

// Filter state
const searchQuery = ref('')
const filterType = ref('all')
const filterStatus = ref('all')
const filterPurpose = ref('all')

// Dialog state
const dialogOpen = ref(false)
const editingPropertyId = ref<string | null>(null)
const deleteDialogOpen = ref(false)
const deletingProperty = ref<Property | null>(null)

// Computed
const hasActiveFilters = computed(() =>
  searchQuery.value !== '' || filterType.value !== 'all' ||
  filterStatus.value !== 'all' || filterPurpose.value !== 'all'
)

const filteredProperties = computed(() => {
  let result = properties.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.address_street.toLowerCase().includes(query) ||
      p.address_city.toLowerCase().includes(query)
    )
  }

  // Type filter
  if (filterType.value !== 'all') {
    result = result.filter(p => p.property_type === filterType.value)
  }

  // Status filter
  if (filterStatus.value !== 'all') {
    result = result.filter(p => p.status === filterStatus.value)
  }

  // Purpose filter
  if (filterPurpose.value !== 'all') {
    result = result.filter(p => p.purpose === filterPurpose.value)
  }

  return result
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
  searchQuery.value = ''
  filterType.value = 'all'
  filterStatus.value = 'all'
  filterPurpose.value = 'all'
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

async function handleDialogSuccess() {
  await fetchProperties()
}

async function handleDeleteSuccess() {
  deletingProperty.value = null
  await fetchProperties()
}

onMounted(() => {
  fetchProperties()
})
</script>
