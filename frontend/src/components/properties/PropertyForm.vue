<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Owner and Property Name -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label for="owner_id">Owner *</Label>
        <Select v-model="form.owner_id">
          <SelectTrigger>
            <SelectValue placeholder="Select an owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem 
                v-for="owner in owners" 
                :key="owner.id" 
                :value="owner.id"
              >
                {{ owner.full_name }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      
      <div class="space-y-2">
        <Label for="name">Property Name *</Label>
        <Input
          id="name"
          v-model="form.name"
          placeholder="e.g., Depto 2 amb Palermo"
          required
        />
      </div>
    </div>

    <!-- Property Type and Status -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-2">
        <Label for="property_type">Property Type *</Label>
        <Select v-model="form.property_type" required>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
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
      </div>
      
      <div class="space-y-2">
        <Label for="status">Status *</Label>
        <Select v-model="form.status" required>
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="alquilada">Alquilada</SelectItem>
              <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
              <SelectItem value="reservada">Reservada</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- Address Section -->
    <div class="border-t pt-4">
      <h3 class="text-sm font-medium text-muted-foreground mb-4">Address</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-3 space-y-2">
          <Label for="address_street">Street *</Label>
          <Input
            id="address_street"
            v-model="form.address_street"
            placeholder="Av. Corrientes"
            required
          />
        </div>
        
        <div class="space-y-2">
          <Label for="address_number">Number</Label>
          <Input
            id="address_number"
            v-model="form.address_number"
            placeholder="1234"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <div class="space-y-2">
          <Label for="address_floor">Floor</Label>
          <Input
            id="address_floor"
            v-model="form.address_floor"
            placeholder="3"
          />
        </div>
        
        <div class="space-y-2">
          <Label for="address_apartment">Apartment</Label>
          <Input
            id="address_apartment"
            v-model="form.address_apartment"
            placeholder="A"
          />
        </div>

        <div class="space-y-2">
          <Label for="address_city">City *</Label>
          <Input
            id="address_city"
            v-model="form.address_city"
            placeholder="CABA"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="address_state">State</Label>
          <Input
            id="address_state"
            v-model="form.address_state"
            placeholder="CABA"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <div class="space-y-2">
          <Label for="address_zip_code">ZIP Code</Label>
          <Input
            id="address_zip_code"
            v-model="form.address_zip_code"
            placeholder="C1000"
          />
        </div>
      </div>
    </div>

    <!-- Property Features -->
    <div class="border-t pt-4">
      <h3 class="text-sm font-medium text-muted-foreground mb-4">Features</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <Label for="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            v-model.number="form.bedrooms"
            type="number"
            min="0"
            placeholder="2"
          />
        </div>
        
        <div class="space-y-2">
          <Label for="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            v-model.number="form.bathrooms"
            type="number"
            min="0"
            placeholder="1"
          />
        </div>
        
        <div class="space-y-2">
          <Label for="square_meters">Square Meters</Label>
          <Input
            id="square_meters"
            v-model.number="form.square_meters"
            type="number"
            min="0"
            step="0.01"
            placeholder="45.5"
          />
        </div>
      </div>
    </div>

    <!-- Description -->
    <div class="border-t pt-4">
      <div class="space-y-2">
        <Label for="description">Description</Label>
        <Textarea
          id="description"
          v-model="form.description"
          placeholder="Property description..."
          rows="4"
        />
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t">
      <Button type="button" variant="outline" @click="$emit('cancel')">
        Cancel
      </Button>
      <Button type="submit" :disabled="isSubmitting">
        <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
        {{ isEdit ? 'Update Property' : 'Create Property' }}
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-vue-next'
import { useOwners } from '@/composables/useOwners'
import type { Property, PropertyType, PropertyStatus } from '@/types'

interface PropertyFormData {
  owner_id: string
  name: string
  property_type: PropertyType
  status: PropertyStatus
  address_street: string
  address_number: string
  address_floor: string
  address_apartment: string
  address_city: string
  address_state: string
  address_zip_code: string
  bedrooms: number | undefined
  bathrooms: number | undefined
  square_meters: number | undefined
  description: string
}

const props = defineProps<{
  initialData?: Partial<Property>
  isEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: Partial<Property>): void
  (e: 'cancel'): void
}>()

const { owners, fetchOwners } = useOwners()
const isSubmitting = ref(false)

const form = ref<PropertyFormData>({
  owner_id: '',
  name: '',
  property_type: 'departamento',
  status: 'disponible',
  address_street: '',
  address_number: '',
  address_floor: '',
  address_apartment: '',
  address_city: '',
  address_state: 'CABA',
  address_zip_code: '',
  bedrooms: undefined,
  bathrooms: undefined,
  square_meters: undefined,
  description: '',
})

// Reset form when initialData changes (for edit mode)
watch(() => props.initialData, (newData) => {
  if (newData) {
    form.value = {
      owner_id: newData.owner_id ?? '',
      name: newData.name ?? '',
      property_type: newData.property_type ?? 'departamento',
      status: newData.status ?? 'disponible',
      address_street: newData.address_street ?? '',
      address_number: newData.address_number ?? '',
      address_floor: newData.address_floor ?? '',
      address_apartment: newData.address_apartment ?? '',
      address_city: newData.address_city ?? '',
      address_state: newData.address_state ?? 'CABA',
      address_zip_code: newData.address_zip_code ?? '',
      bedrooms: newData.bedrooms ?? undefined,
      bathrooms: newData.bathrooms ?? undefined,
      square_meters: newData.square_meters ?? undefined,
      description: newData.description ?? '',
    }
  }
}, { immediate: true })

onMounted(() => {
  fetchOwners()
})

function handleSubmit() {
  // Basic validation
  if (!form.value.name || !form.value.property_type || !form.value.address_street || !form.value.address_city || !form.value.status) {
    alert('Please fill in all required fields')
    return
  }

  // Build property data
  const propertyData: Partial<Property> = {
    owner_id: form.value.owner_id || null,
    name: form.value.name,
    property_type: form.value.property_type,
    status: form.value.status,
    address_street: form.value.address_street,
    address_number: form.value.address_number || null,
    address_floor: form.value.address_floor || null,
    address_apartment: form.value.address_apartment || null,
    address_city: form.value.address_city,
    address_state: form.value.address_state || 'CABA',
    address_zip_code: form.value.address_zip_code || null,
    bedrooms: form.value.bedrooms ?? null,
    bathrooms: form.value.bathrooms ?? null,
    square_meters: form.value.square_meters ?? null,
    description: form.value.description || null,
  }

  emit('submit', propertyData)
}
</script>
