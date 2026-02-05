<template>
  <MainLayout>
    <div class="p-6">
      <!-- Loading state -->
      <div v-if="loading" class="py-12 text-center text-muted-foreground">
        <Loader2 class="w-8 h-8 mx-auto animate-spin" />
        <p class="mt-2">Cargando propietario...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">Error al cargar propietario</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadOwner">
          Reintentar
        </Button>
      </div>

      <!-- Not found state -->
      <div v-else-if="!owner" class="py-12 text-center">
        <UserCircle class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-lg font-medium text-muted-foreground mb-2">Propietario no encontrado</p>
        <Button variant="outline" @click="goBack">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Volver a Propietarios
        </Button>
      </div>

      <!-- Owner details -->
      <template v-else>
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <Button variant="ghost" size="sm" class="mb-2" @click="goBack">
              <ArrowLeft class="w-4 h-4 mr-2" />
              Volver a Propietarios
            </Button>
            <h1 class="text-2xl font-bold">{{ owner.full_name }}</h1>
            <p class="text-muted-foreground mt-1">
              <Badge variant="secondary">
                {{ owner.property_count || 0 }}
                {{ owner.property_count === 1 ? 'propiedad' : 'propiedades' }}
              </Badge>
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
            <!-- Personal Information Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Información Personal</CardTitle>
              </CardHeader>
              <CardContent>
                <dl class="grid grid-cols-2 gap-4">
                  <div>
                    <dt class="text-sm text-muted-foreground">Nombre Completo</dt>
                    <dd class="font-medium">{{ owner.full_name }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">CUIT/CUIL</dt>
                    <dd class="font-medium">{{ owner.cuit_cuil ?? '-' }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Email</dt>
                    <dd class="font-medium">
                      <a
                        v-if="owner.email"
                        :href="`mailto:${owner.email}`"
                        class="text-primary hover:underline"
                      >
                        {{ owner.email }}
                      </a>
                      <span v-else>-</span>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Teléfono</dt>
                    <dd class="font-medium">
                      <a
                        v-if="owner.phone"
                        :href="`tel:${owner.phone}`"
                        class="text-primary hover:underline"
                      >
                        {{ owner.phone }}
                      </a>
                      <span v-else>-</span>
                    </dd>
                  </div>
                  <div class="col-span-2">
                    <dt class="text-sm text-muted-foreground">Dirección</dt>
                    <dd class="font-medium">{{ owner.address ?? '-' }}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <!-- Notes Card -->
            <Card v-if="owner.notes">
              <CardHeader>
                <CardTitle class="text-lg">Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p class="text-muted-foreground whitespace-pre-wrap">{{ owner.notes }}</p>
              </CardContent>
            </Card>

            <!-- Properties Card -->
            <Card>
              <CardHeader class="flex flex-row items-center justify-between">
                <CardTitle class="text-lg">Propiedades</CardTitle>
                <Button size="sm" @click="navigateToNewProperty">
                  <Plus class="w-4 h-4 mr-2" />
                  Agregar Propiedad
                </Button>
              </CardHeader>
              <CardContent>
                <!-- Properties list -->
                <div v-if="owner.properties && owner.properties.length > 0" class="space-y-3">
                  <div
                    v-for="property in owner.properties"
                    :key="property.id"
                    class="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                    @click="navigateToProperty(property.id)"
                  >
                    <div class="flex-1">
                      <p class="font-medium text-sm hover:text-primary">
                        {{ property.name }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ property.address_street }}
                        {{ property.address_number ? ` ${property.address_number}` : '' }},
                        {{ property.address_city }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <Badge variant="outline" class="capitalize text-xs">
                        {{ property.property_type }}
                      </Badge>
                      <Badge
                        :variant="property.purpose === 'alquiler' ? 'default' : 'secondary'"
                        class="text-xs"
                      >
                        {{ property.purpose === 'alquiler' ? 'Alquiler' : 'Venta' }}
                      </Badge>
                      <Badge
                        :variant="getStatusVariant(property.status)"
                        class="capitalize text-xs"
                      >
                        {{ property.status }}
                      </Badge>
                    </div>
                  </div>
                </div>

                <!-- Empty state -->
                <div v-else class="py-8 text-center">
                  <Building2 class="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p class="text-sm text-muted-foreground mb-3">
                    Este propietario no tiene propiedades registradas
                  </p>
                  <Button variant="outline" size="sm" @click="navigateToNewProperty">
                    <Plus class="w-4 h-4 mr-2" />
                    Agregar Propiedad
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Metadata Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Detalles</CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <div>
                  <p class="text-sm text-muted-foreground">Creado</p>
                  <p class="font-medium">{{ formatDateTime(owner.created_at) }}</p>
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">Última Actualización</p>
                  <p class="font-medium">{{ formatDateTime(owner.updated_at) }}</p>
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

      <!-- Owner Dialog (Edit) -->
      <OwnerDialog
        v-model:open="dialogOpen"
        :owner-id="ownerId"
        @success="handleEditSuccess"
      />

      <!-- Delete Confirmation Dialog -->
      <DeleteOwnerDialog
        v-if="owner"
        v-model:open="deleteDialogOpen"
        :owner-id="owner.id"
        :owner-name="owner.full_name"
        :property-count="owner.property_count || 0"
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
import OwnerDialog from '@/components/owners/OwnerDialog.vue'
import DeleteOwnerDialog from '@/components/owners/DeleteOwnerDialog.vue'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  UserCircle,
  Loader2,
  Building2,
  Plus
} from 'lucide-vue-next'
import { useOwners } from '@/composables/useOwners'
import type { OwnerWithProperties } from '@/types'

const route = useRoute()
const router = useRouter()
const { fetchOwnerById, loading, error } = useOwners()

const owner = ref<OwnerWithProperties | null>(null)
const dialogOpen = ref(false)
const deleteDialogOpen = ref(false)

const ownerId = computed(() => route.params.id as string)

// Methods
function formatDateTime(dateString: string): string {
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
  router.push({ name: 'owners' })
}

function openEditDialog() {
  dialogOpen.value = true
}

function openDeleteDialog() {
  deleteDialogOpen.value = true
}

function navigateToProperty(propertyId: string) {
  router.push({ name: 'property-details', params: { id: propertyId } })
}

function navigateToNewProperty() {
  // Navigate to properties page with owner pre-selected (could be enhanced with query params)
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
