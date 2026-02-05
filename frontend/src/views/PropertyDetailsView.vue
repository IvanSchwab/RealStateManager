<template>
  <MainLayout>
    <div class="p-6">
      <!-- Loading state -->
      <div v-if="loading" class="py-12 text-center text-muted-foreground">
        <Loader2 class="w-8 h-8 mx-auto animate-spin" />
        <p class="mt-2">Cargando propiedad...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">Error al cargar propiedad</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadProperty">
          Reintentar
        </Button>
      </div>

      <!-- Not found state -->
      <div v-else-if="!property" class="py-12 text-center">
        <Building class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-lg font-medium text-muted-foreground mb-2">Propiedad no encontrada</p>
        <Button variant="outline" @click="goBack">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Volver a Propiedades
        </Button>
      </div>

      <!-- Property details -->
      <template v-else>
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <Button variant="ghost" size="sm" class="mb-2" @click="goBack">
              <ArrowLeft class="w-4 h-4 mr-2" />
              Volver a Propiedades
            </Button>
            <h1 class="text-2xl font-bold">{{ property.name }}</h1>
            <p class="text-muted-foreground mt-1">
              {{ property.property_type }} · {{ formatFullAddress(property) }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" @click="openEditDialog">
              <Pencil class="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="destructive" @click="openDeleteDialog">
              <Trash2 class="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          </div>
        </div>

        <!-- Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Column -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Property Info Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Información de la Propiedad</CardTitle>
              </CardHeader>
              <CardContent>
                <dl class="grid grid-cols-3 gap-4">
                  <div>
                    <dt class="text-sm text-muted-foreground">Tipo</dt>
                    <dd class="font-medium capitalize">{{ property.property_type }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Finalidad</dt>
                    <dd>
                      <Badge :variant="property.purpose === 'alquiler' ? 'default' : 'secondary'">
                        {{ property.purpose === 'alquiler' ? 'Alquiler' : 'Venta' }}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Estado</dt>
                    <dd>
                      <Badge :variant="getStatusVariant(property.status)" class="capitalize">
                        {{ property.status }}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <!-- Address Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Dirección</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="flex items-start gap-3">
                  <MapPin class="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p class="font-medium">
                      {{ property.address_street }}
                      {{ property.address_number ? ' ' + property.address_number : '' }}
                    </p>
                    <p v-if="property.address_floor || property.address_apartment" class="text-sm text-muted-foreground">
                      {{ property.address_floor ? 'Piso ' + property.address_floor : '' }}
                      {{ property.address_apartment ? ', Depto ' + property.address_apartment : '' }}
                    </p>
                    <p class="text-sm text-muted-foreground">
                      {{ property.address_city }}
                      {{ property.address_state ? ', ' + property.address_state : '' }}
                      {{ property.address_zip_code ? ' ' + property.address_zip_code : '' }}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Features Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Características</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="grid grid-cols-3 gap-4">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-muted rounded-lg">
                      <BedDouble class="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p class="text-sm text-muted-foreground">Dormitorios</p>
                      <p class="font-medium">{{ property.bedrooms ?? '-' }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-muted rounded-lg">
                      <Bath class="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p class="text-sm text-muted-foreground">Baños</p>
                      <p class="font-medium">{{ property.bathrooms ?? '-' }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-muted rounded-lg">
                      <Ruler class="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p class="text-sm text-muted-foreground">Superficie</p>
                      <p class="font-medium">
                        {{ property.square_meters ? property.square_meters + ' m²' : '-' }}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Description Card -->
            <Card v-if="property.description">
              <CardHeader>
                <CardTitle class="text-lg">Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p class="text-muted-foreground whitespace-pre-wrap">{{ property.description }}</p>
              </CardContent>
            </Card>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Owner Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Propietario</CardTitle>
              </CardHeader>
              <CardContent>
                <div v-if="property.owner" class="space-y-3">
                  <router-link
                    :to="{ name: 'owner-details', params: { id: property.owner.id } }"
                    class="flex items-center gap-3 hover:bg-muted/30 -m-2 p-2 rounded-lg transition-colors"
                  >
                    <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User class="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p class="font-medium hover:text-primary">{{ property.owner.full_name }}</p>
                      <p v-if="property.owner.email" class="text-sm text-muted-foreground">
                        {{ property.owner.email }}
                      </p>
                    </div>
                  </router-link>
                </div>
                <p v-else class="text-muted-foreground text-sm">Sin propietario asignado</p>
              </CardContent>
            </Card>

            <!-- Metadata Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Detalles</CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <div>
                  <p class="text-sm text-muted-foreground">Creado</p>
                  <p class="font-medium">{{ formatDate(property.created_at) }}</p>
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">Última Actualización</p>
                  <p class="font-medium">{{ formatDate(property.updated_at) }}</p>
                </div>
              </CardContent>
            </Card>

            <!-- Contracts Placeholder -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Contratos</CardTitle>
              </CardHeader>
              <CardContent>
                <p class="text-sm text-muted-foreground">
                  El historial de contratos se mostrará aquí en una actualización futura.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </template>

      <!-- Property Dialog (Edit) -->
      <PropertyDialog
        v-model:open="dialogOpen"
        :property-id="propertyId"
        @success="handleEditSuccess"
      />

      <!-- Delete Confirmation Dialog -->
      <DeletePropertyDialog
        v-if="property"
        v-model:open="deleteDialogOpen"
        :property-id="property.id"
        :property-name="property.name"
        @confirm="handleDeleteSuccess"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PropertyDialog from '@/components/properties/PropertyDialog.vue'
import DeletePropertyDialog from '@/components/properties/DeletePropertyDialog.vue'
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Building, 
  Loader2,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  User
} from 'lucide-vue-next'
import { useProperties } from '@/composables/useProperties'
import type { Property } from '@/types'

const route = useRoute()
const router = useRouter()
const { fetchPropertyById, loading, error } = useProperties()

const property = ref<Property | null>(null)
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)

const propertyId = computed(() => route.params.id as string)

// Methods
function formatFullAddress(p: Property): string {
  const parts = [p.address_street]
  if (p.address_number) parts[0] += ` ${p.address_number}`
  parts.push(p.address_city)
  if (p.address_state && p.address_state !== p.address_city) {
    parts.push(p.address_state)
  }
  return parts.join(', ')
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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

function goBack() {
  router.push({ name: 'properties' })
}

function openEditDialog() {
  dialogOpen.value = true
}

function openDeleteDialog() {
  deleteDialogOpen.value = true
}

async function loadProperty() {
  const data = await fetchPropertyById(propertyId.value)
  property.value = data
}

async function handleEditSuccess() {
  await loadProperty()
}

function handleDeleteSuccess() {
  router.push({ name: 'properties' })
}

onMounted(() => {
  loadProperty()
})
</script>
