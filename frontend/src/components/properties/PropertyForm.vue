<template>
  <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
    <!-- Owner and Property Name -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CreateOwnerInline
        v-model="form.owner_id"
        :owners="owners"
        :disabled="!!props.lockedOwnerId"
        @owner-created="handleOwnerCreated"
      />

      <div class="space-y-2">
        <Label for="name">{{ $t('properties.propertyName') }} *</Label>
        <Input
          id="name"
          v-model="form.name"
          :placeholder="$t('properties.propertyNamePlaceholder')"
          :class="{ 'border-destructive': errors.name }"
          @blur="validateField('name')"
        />
        <p v-if="errors.name" class="text-sm text-destructive">
          {{ errors.name }}
        </p>
      </div>
    </div>

    <!-- Property Type, Purpose and Status -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="space-y-2">
        <Label for="property_type">{{ $t('properties.type') }} *</Label>
        <Select v-model="form.property_type">
          <SelectTrigger :class="{ 'border-destructive': errors.property_type }">
            <SelectValue :placeholder="$t('properties.selectType')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
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
        <p v-if="errors.property_type" class="text-sm text-destructive">
          {{ errors.property_type }}
        </p>
      </div>

      <div class="space-y-2">
        <Label for="purpose">{{ $t('properties.purpose') }} *</Label>
        <Select v-model="form.purpose">
          <SelectTrigger :class="{ 'border-destructive': errors.purpose }">
            <SelectValue :placeholder="$t('properties.selectPurpose')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="alquiler">{{ $t('properties.alquiler') }}</SelectItem>
              <SelectItem value="venta">{{ $t('properties.venta') }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <p v-if="errors.purpose" class="text-sm text-destructive">
          {{ errors.purpose }}
        </p>
      </div>

      <div class="space-y-2">
        <Label for="status">{{ $t('common.status') }} *</Label>
        <Select v-model="form.status">
          <SelectTrigger :class="{ 'border-destructive': errors.status }">
            <SelectValue :placeholder="$t('properties.selectStatus')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="disponible">{{ $t('properties.disponible') }}</SelectItem>
              <SelectItem value="alquilada">{{ $t('properties.alquilada') }}</SelectItem>
              <SelectItem value="mantenimiento">{{ $t('properties.mantenimiento') }}</SelectItem>
              <SelectItem value="reservada">{{ $t('properties.reservada') }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <p v-if="errors.status" class="text-sm text-destructive">
          {{ errors.status }}
        </p>
      </div>
    </div>

    <!-- Address Section -->
    <div class="border-t pt-4">
      <h3 class="text-sm font-medium text-muted-foreground mb-4">{{ $t('properties.addressSection') }}</h3>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-3 space-y-2">
          <Label for="address_street">{{ $t('properties.street') }} *</Label>
          <Input
            id="address_street"
            v-model="form.address_street"
            placeholder="Av. Corrientes"
            :class="{ 'border-destructive': errors.address_street }"
            @blur="validateField('address_street')"
          />
          <p v-if="errors.address_street" class="text-sm text-destructive">
            {{ errors.address_street }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="address_number">{{ $t('properties.number') }}</Label>
          <Input
            id="address_number"
            v-model="form.address_number"
            placeholder="1234"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <div class="space-y-2">
          <Label for="address_floor">{{ $t('properties.floor') }}</Label>
          <Input
            id="address_floor"
            v-model="form.address_floor"
            placeholder="3"
          />
        </div>

        <div class="space-y-2">
          <Label for="address_apartment">{{ $t('properties.apartment') }}</Label>
          <Input
            id="address_apartment"
            v-model="form.address_apartment"
            placeholder="A"
          />
        </div>

        <div class="space-y-2">
          <Label for="address_city">{{ $t('properties.city') }} *</Label>
          <Input
            id="address_city"
            v-model="form.address_city"
            placeholder="CABA"
            :class="{ 'border-destructive': errors.address_city }"
            @blur="validateField('address_city')"
          />
          <p v-if="errors.address_city" class="text-sm text-destructive">
            {{ errors.address_city }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="address_state">{{ $t('properties.state') }}</Label>
          <Input
            id="address_state"
            v-model="form.address_state"
            placeholder="CABA"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <div class="space-y-2">
          <Label for="address_zip_code">{{ $t('properties.zipCode') }}</Label>
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
      <h3 class="text-sm font-medium text-muted-foreground mb-4">{{ $t('properties.features') }}</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="space-y-2">
          <Label for="bedrooms">{{ $t('properties.bedrooms') }}</Label>
          <Input
            id="bedrooms"
            v-model.number="form.bedrooms"
            type="number"
            min="0"
            placeholder="2"
          />
        </div>

        <div class="space-y-2">
          <Label for="bathrooms">{{ $t('properties.bathrooms') }}</Label>
          <Input
            id="bathrooms"
            v-model.number="form.bathrooms"
            type="number"
            min="0"
            placeholder="1"
          />
        </div>

        <div class="space-y-2">
          <Label for="square_meters">{{ $t('properties.squareMeters') }}</Label>
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
        <Label for="description">{{ $t('common.description') }}</Label>
        <Textarea
          id="description"
          v-model="form.description"
          :placeholder="$t('properties.descriptionPlaceholder')"
          rows="4"
        />
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end gap-3 pt-4 border-t">
      <Button type="button" variant="outline" @click="$emit('cancel')">
        {{ $t('common.cancel') }}
      </Button>
      <Button type="submit" :disabled="isSubmitting">
        <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
        {{ isEdit ? $t('properties.updateProperty') : $t('properties.createProperty') }}
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
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
import CreateOwnerInline from '@/components/owners/CreateOwnerInline.vue'
import type { Property, PropertyType, PropertyStatus, PropertyPurpose, Owner } from '@/types'

interface PropertyFormData {
  owner_id: string
  name: string
  property_type: PropertyType
  purpose: PropertyPurpose
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

interface FormErrors {
  name: string | null
  property_type: string | null
  purpose: string | null
  status: string | null
  address_street: string | null
  address_city: string | null
}

const props = defineProps<{
  initialData?: Partial<Property>
  isEdit?: boolean
  isSubmitting?: boolean
  lockedOwnerId?: string
}>()

const emit = defineEmits<{
  (e: 'submit', data: Partial<Property>): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()
const { owners, fetchOwners } = useOwners()

const form = ref<PropertyFormData>({
  owner_id: props.lockedOwnerId || '',
  name: '',
  property_type: 'departamento',
  purpose: 'alquiler',
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

const errors = reactive<FormErrors>({
  name: null,
  property_type: null,
  purpose: null,
  status: null,
  address_street: null,
  address_city: null,
})

// Reset form when initialData changes (for edit mode)
watch(() => props.initialData, (newData) => {
  if (newData) {
    form.value = {
      owner_id: newData.owner_id ?? props.lockedOwnerId ?? '',
      name: newData.name ?? '',
      property_type: newData.property_type ?? 'departamento',
      purpose: newData.purpose ?? 'alquiler',
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
    clearErrors()
  }
}, { immediate: true })

function clearErrors() {
  errors.name = null
  errors.property_type = null
  errors.purpose = null
  errors.status = null
  errors.address_street = null
  errors.address_city = null
}

function validateField(field: keyof FormErrors): boolean {
  switch (field) {
    case 'name':
      if (!form.value.name || form.value.name.trim().length === 0) {
        errors.name = t('validation.required')
        return false
      }
      errors.name = null
      return true

    case 'property_type':
      if (!form.value.property_type) {
        errors.property_type = t('validation.required')
        return false
      }
      errors.property_type = null
      return true

    case 'purpose':
      if (!form.value.purpose) {
        errors.purpose = t('validation.required')
        return false
      }
      errors.purpose = null
      return true

    case 'status':
      if (!form.value.status) {
        errors.status = t('validation.required')
        return false
      }
      errors.status = null
      return true

    case 'address_street':
      if (!form.value.address_street || form.value.address_street.trim().length === 0) {
        errors.address_street = t('validation.required')
        return false
      }
      errors.address_street = null
      return true

    case 'address_city':
      if (!form.value.address_city || form.value.address_city.trim().length === 0) {
        errors.address_city = t('validation.required')
        return false
      }
      errors.address_city = null
      return true

    default:
      return true
  }
}

function validateForm(): boolean {
  const nameValid = validateField('name')
  const propertyTypeValid = validateField('property_type')
  const purposeValid = validateField('purpose')
  const statusValid = validateField('status')
  const streetValid = validateField('address_street')
  const cityValid = validateField('address_city')

  return nameValid && propertyTypeValid && purposeValid && statusValid && streetValid && cityValid
}

// Handle owner created from inline dialog
async function handleOwnerCreated(_owner: Owner) {
  // Refresh owners list
  await fetchOwners()
  // Owner is already selected by CreateOwnerInline component
}

onMounted(() => {
  fetchOwners()
})

function handleSubmit() {
  if (!validateForm()) return

  // Build property data
  const propertyData: Partial<Property> = {
    owner_id: form.value.owner_id || null,
    name: form.value.name.trim(),
    property_type: form.value.property_type,
    purpose: form.value.purpose,
    status: form.value.status,
    address_street: form.value.address_street.trim(),
    address_number: form.value.address_number.trim() || null,
    address_floor: form.value.address_floor.trim() || null,
    address_apartment: form.value.address_apartment.trim() || null,
    address_city: form.value.address_city.trim(),
    address_state: form.value.address_state.trim() || 'CABA',
    address_zip_code: form.value.address_zip_code.trim() || null,
    bedrooms: form.value.bedrooms ?? null,
    bathrooms: form.value.bathrooms ?? null,
    square_meters: form.value.square_meters ?? null,
    description: form.value.description.trim() || null,
  }

  emit('submit', propertyData)
}
</script>
