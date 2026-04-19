<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mb-6">
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
          v-model="search"
          placeholder="Buscar por nombre, dirección o ciudad..."
          class="w-full"
        >
          <template #prefix>
            <Search class="w-4 h-4 text-muted-foreground" />
          </template>
        </Input>
      </div>

      <Select v-model="typeFilter" class="w-full sm:w-auto">
        <SelectTrigger>
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">Todos los tipos</SelectItem>
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

      <Select v-model="statusFilter" class="w-full sm:w-auto">
        <SelectTrigger>
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="alquilada">Alquilada</SelectItem>
            <SelectItem value="mantenimiento">En mantenimiento</SelectItem>
            <SelectItem value="reservada">Reservada</SelectItem>
            <SelectItem value="vendida">Vendida</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select v-model="purposeFilter" class="w-full sm:w-auto">
        <SelectTrigger>
          <SelectValue placeholder="Finalidad" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">Todas las finalidades</SelectItem>
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
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in 6"
        :key="i"
        class="bg-card border border-border rounded-lg p-4"
      >
        <div class="flex items-center gap-2 mb-3">
          <Skeleton class="h-5 w-24" />
          <Skeleton class="h-5 w-16" />
        </div>
        <Skeleton class="h-6 w-3/4 mb-2" />
        <Skeleton class="h-4 w-full mb-3" />
        <Skeleton class="h-4 w-1/2 mb-4" />
        <div class="flex items-center gap-4 mb-4">
          <Skeleton class="h-4 w-12" />
          <Skeleton class="h-4 w-12" />
          <Skeleton class="h-4 w-16" />
        </div>
        <Skeleton class="h-5 w-20" />
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="py-12 text-center">
      <p class="text-destructive font-medium mb-2">Error al cargar propiedades</p>
      <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
      <Button variant="outline" @click="loadProperties">
        Reintentar
      </Button>
    </div>

    <!-- Data loaded -->
    <template v-else>
      <!-- Empty state -->
      <div v-if="filteredProperties.length === 0" class="py-12 text-center">
        <Building2 class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-lg font-medium text-muted-foreground mb-2">
          {{ hasActiveFilters ? 'No se encontraron propiedades' : 'No hay propiedades' }}
        </p>
        <p class="text-sm text-muted-foreground mb-4">
          {{ hasActiveFilters
            ? 'Intenta ajustar los filtros de búsqueda'
            : 'Comienza agregando tu primera propiedad'
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

      <!-- Properties grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="property in filteredProperties"
          :key="property.id"
          class="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/30 hover:border-primary/50 transition-colors"
          @click="navigateToProperty(property.id)"
        >
          <!-- Badges row -->
          <div class="flex items-center gap-2 mb-3">
            <Badge :class="getTypeBadgeClass(property.property_type)">
              {{ getTypeLabel(property.property_type) }}
            </Badge>
            <Badge :class="getPurposeBadgeClass(property.purpose)">
              {{ property.purpose === 'alquiler' ? 'Alquiler' : 'Venta' }}
            </Badge>
          </div>

          <!-- Title -->
          <h3 class="font-semibold text-foreground mb-1 truncate">
            {{ property.name }}
          </h3>

          <!-- Address -->
          <p class="text-sm text-muted-foreground mb-3 truncate">
            {{ formatAddress(property) }}
          </p>

          <!-- Owner -->
          <div v-if="property.owner" class="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <User class="w-4 h-4" />
            <span class="truncate">{{ property.owner.full_name }}</span>
          </div>

          <!-- Stats row -->
          <div class="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div v-if="property.bedrooms" class="flex items-center gap-1">
              <Bed class="w-4 h-4" />
              <span>{{ property.bedrooms }}</span>
            </div>
            <div v-if="property.bathrooms" class="flex items-center gap-1">
              <Bath class="w-4 h-4" />
              <span>{{ property.bathrooms }}</span>
            </div>
            <div v-if="property.square_meters" class="flex items-center gap-1">
              <Ruler class="w-4 h-4" />
              <span>{{ property.square_meters }} m²</span>
            </div>
          </div>

          <!-- Footer with status and actions -->
          <div class="flex items-center justify-between pt-3 border-t border-border">
            <Badge :class="getStatusBadgeClass(property.status)">
              {{ getStatusLabel(property.status) }}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild @click.stop>
                <Button variant="ghost" size="icon" class="h-8 w-8">
                  <MoreVertical class="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" @click.stop>
                <DropdownMenuItem @click.stop="navigateToProperty(property.id)">
                  <Eye class="w-4 h-4 mr-2" />
                  Ver detalle
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  class="text-destructive focus:text-destructive"
                  @click.stop="confirmDelete(property)"
                >
                  <Trash2 class="w-4 h-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <p v-if="filteredProperties.length > 0" class="mt-4 text-sm text-muted-foreground">
        Mostrando {{ filteredProperties.length }} de {{ properties.length }} propiedades
      </p>
    </template>

    <!-- Property Dialog (Create) -->
    <PropertyDialog
      v-model:open="createDialogOpen"
      @success="handleCreateSuccess"
    />

    <!-- Delete Confirmation Dialog -->
    <AlertDialog v-model:open="deleteDialogOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar propiedad</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar "{{ propertyToDelete?.name }}"? Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleting">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="deleting"
            @click="executeDelete"
          >
            <Loader2 v-if="deleting" class="w-4 h-4 mr-2 animate-spin" />
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Plus,
  Search,
  X,
  Eye,
  Trash2,
  Building2,
  Loader2,
  MoreVertical,
  User,
  Bed,
  Bath,
  Ruler,
} from 'lucide-vue-next'
import { useProperties } from '@/composables/useProperties'
import { useToast } from '@/composables/useToast'
import { useDebounce } from '@/composables/useDebounce'
import type { Property, PropertyType, PropertyStatus, PropertyPurpose } from '@/types'

const router = useRouter()
const toast = useToast()
const {
  properties,
  loading,
  error,
  fetchProperties,
  deleteProperty,
} = useProperties()

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
    const searchLower = debouncedSearch.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.address_street.toLowerCase().includes(searchLower) ||
      p.address_city.toLowerCase().includes(searchLower)
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
    departamento: 'Departamento',
    casa: 'Casa',
    comercial: 'Comercial',
    terreno: 'Terreno',
    oficina: 'Oficina',
    local: 'Local',
    galpon: 'Galpón',
  }
  return labels[type] || type
}

function getTypeBadgeClass(type: PropertyType): string {
  const classes: Record<PropertyType, string> = {
    departamento: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    casa: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    comercial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    terreno: 'bg-stone-100 text-stone-800 dark:bg-stone-900/30 dark:text-stone-400 border-stone-200 dark:border-stone-800',
    oficina: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
    local: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
    galpon: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  }
  return classes[type] || ''
}

function getPurposeBadgeClass(purpose: PropertyPurpose): string {
  if (purpose === 'alquiler') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
  }
  return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800'
}

function getStatusLabel(status: PropertyStatus): string {
  const labels: Record<PropertyStatus, string> = {
    disponible: 'Disponible',
    alquilada: 'Alquilada',
    mantenimiento: 'En mantenimiento',
    reservada: 'Reservada',
    vendida: 'Vendida',
  }
  return labels[status] || status
}

function getStatusBadgeClass(status: PropertyStatus): string {
  const classes: Record<PropertyStatus, string> = {
    disponible: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    alquilada: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    mantenimiento: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    reservada: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    vendida: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
  }
  return classes[status] || ''
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
    toast.success('Propiedad eliminada correctamente')
    deleteDialogOpen.value = false
    propertyToDelete.value = null
  } catch (e) {
    console.error('Error deleting property:', e)
    toast.error('Error al eliminar la propiedad')
  } finally {
    deleting.value = false
  }
}

async function loadProperties() {
  await fetchProperties()
}

onMounted(() => {
  loadProperties()
})
</script>
