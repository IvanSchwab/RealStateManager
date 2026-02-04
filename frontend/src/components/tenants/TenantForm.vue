<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Personal Data Section -->
    <div>
      <h3 class="text-sm font-medium text-muted-foreground mb-4">Personal Information</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="first_name">First Name *</Label>
          <Input
            id="first_name"
            v-model="form.first_name"
            placeholder="Juan"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="last_name">Last Name *</Label>
          <Input
            id="last_name"
            v-model="form.last_name"
            placeholder="Pérez"
            required
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="juan@example.com"
          />
        </div>

        <div class="space-y-2">
          <Label for="phone">Phone *</Label>
          <Input
            id="phone"
            v-model="form.phone"
            placeholder="+54 11 1234-5678"
            required
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div class="space-y-2">
          <Label for="dni">DNI</Label>
          <Input
            id="dni"
            v-model="form.dni"
            placeholder="12345678"
          />
        </div>

        <div class="space-y-2">
          <Label for="cuit_cuil">CUIT/CUIL</Label>
          <Input
            id="cuit_cuil"
            v-model="form.cuit_cuil"
            placeholder="20-12345678-9"
          />
        </div>

        <div class="space-y-2">
          <Label for="status">Status *</Label>
          <Select v-model="form.status" required>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="mt-4 space-y-2">
        <Label for="address">Address</Label>
        <Input
          id="address"
          v-model="form.address"
          placeholder="Av. Corrientes 1234, CABA"
        />
      </div>
    </div>

    <!-- Employment Data Section -->
    <div class="border-t pt-4">
      <h3 class="text-sm font-medium text-muted-foreground mb-4">Employment Information</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="employer">Employer</Label>
          <Input
            id="employer"
            v-model="form.employer"
            placeholder="Company name"
          />
        </div>

        <div class="space-y-2">
          <Label for="employer_phone">Employer Phone</Label>
          <Input
            id="employer_phone"
            v-model="form.employer_phone"
            placeholder="+54 11 1234-5678"
          />
        </div>
      </div>

      <div class="mt-4 space-y-2">
        <Label for="monthly_income">Monthly Income (ARS)</Label>
        <Input
          id="monthly_income"
          v-model.number="form.monthly_income"
          type="number"
          min="0"
          step="0.01"
          placeholder="150000"
        />
      </div>
    </div>

    <!-- Emergency Contact Section -->
    <div class="border-t pt-4">
      <h3 class="text-sm font-medium text-muted-foreground mb-4">Emergency Contact</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="emergency_contact_name">Contact Name</Label>
          <Input
            id="emergency_contact_name"
            v-model="form.emergency_contact_name"
            placeholder="María Pérez"
          />
        </div>

        <div class="space-y-2">
          <Label for="emergency_contact_phone">Contact Phone</Label>
          <Input
            id="emergency_contact_phone"
            v-model="form.emergency_contact_phone"
            placeholder="+54 11 1234-5678"
          />
        </div>
      </div>
    </div>

    <!-- Notes Section -->
    <div class="border-t pt-4">
      <div class="space-y-2">
        <Label for="notes">Notes</Label>
        <Textarea
          id="notes"
          v-model="form.notes"
          placeholder="Additional notes about the tenant..."
          rows="3"
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
        {{ isEdit ? 'Update Tenant' : 'Create Tenant' }}
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
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
import type { Tenant, TenantStatus, TenantFormData } from '@/types'

interface TenantFormState {
  first_name: string
  last_name: string
  email: string
  phone: string
  dni: string
  cuit_cuil: string
  address: string
  employer: string
  employer_phone: string
  monthly_income: number | undefined
  emergency_contact_name: string
  emergency_contact_phone: string
  status: TenantStatus
  notes: string
}

const props = defineProps<{
  initialData?: Partial<Tenant>
  isEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: TenantFormData): void
  (e: 'cancel'): void
}>()

const isSubmitting = ref(false)

const form = ref<TenantFormState>({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  dni: '',
  cuit_cuil: '',
  address: '',
  employer: '',
  employer_phone: '',
  monthly_income: undefined,
  emergency_contact_name: '',
  emergency_contact_phone: '',
  status: 'activo',
  notes: '',
})

// Reset form when initialData changes (for edit mode)
watch(() => props.initialData, (newData) => {
  if (newData) {
    form.value = {
      first_name: newData.first_name ?? '',
      last_name: newData.last_name ?? '',
      email: newData.email ?? '',
      phone: newData.phone ?? '',
      dni: newData.dni ?? '',
      cuit_cuil: newData.cuit_cuil ?? '',
      address: newData.address ?? '',
      employer: newData.employer ?? '',
      employer_phone: newData.employer_phone ?? '',
      monthly_income: newData.monthly_income ?? undefined,
      emergency_contact_name: newData.emergency_contact_name ?? '',
      emergency_contact_phone: newData.emergency_contact_phone ?? '',
      status: newData.status ?? 'activo',
      notes: newData.notes ?? '',
    }
  }
}, { immediate: true })

function validateForm(): boolean {
  // Required fields
  if (!form.value.first_name || form.value.first_name.length < 2) {
    alert('First name is required (min 2 characters)')
    return false
  }

  if (!form.value.last_name || form.value.last_name.length < 2) {
    alert('Last name is required (min 2 characters)')
    return false
  }

  if (!form.value.phone) {
    alert('Phone is required')
    return false
  }

  // Email validation if provided
  if (form.value.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.value.email)) {
      alert('Please enter a valid email address')
      return false
    }
  }

  // CUIT/CUIL validation if provided (11 digits)
  if (form.value.cuit_cuil) {
    const cuitDigits = form.value.cuit_cuil.replace(/\D/g, '')
    if (cuitDigits.length !== 11) {
      alert('CUIT/CUIL must have 11 digits')
      return false
    }
  }

  // Monthly income validation
  if (form.value.monthly_income !== undefined && form.value.monthly_income < 0) {
    alert('Monthly income must be a positive number')
    return false
  }

  return true
}

function handleSubmit() {
  if (!validateForm()) return

  // Build tenant data
  const tenantData: TenantFormData = {
    first_name: form.value.first_name,
    last_name: form.value.last_name,
    email: form.value.email || null,
    phone: form.value.phone,
    dni: form.value.dni || null,
    cuit_cuil: form.value.cuit_cuil || null,
    address: form.value.address || null,
    employer: form.value.employer || null,
    employer_phone: form.value.employer_phone || null,
    monthly_income: form.value.monthly_income ?? null,
    emergency_contact_name: form.value.emergency_contact_name || null,
    emergency_contact_phone: form.value.emergency_contact_phone || null,
    status: form.value.status,
    notes: form.value.notes || null,
  }

  emit('submit', tenantData)
}
</script>
