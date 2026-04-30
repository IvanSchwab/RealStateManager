<template>
  <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
    <!-- Personal Data Section -->
    <div>
      <h3 class="text-sm font-medium text-muted-foreground mb-4">{{ $t('tenants.personalInfo') }}</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="first_name">{{ $t('tenants.firstName') }} *</Label>
          <Input
            id="first_name"
            v-model="form.first_name"
            placeholder="Juan"
            :class="{ 'border-destructive': errors.first_name }"
            @blur="validateField('first_name')"
          />
          <p v-if="errors.first_name" class="text-sm text-destructive">
            {{ errors.first_name }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="last_name">{{ $t('tenants.lastName') }} *</Label>
          <Input
            id="last_name"
            v-model="form.last_name"
            placeholder="Perez"
            :class="{ 'border-destructive': errors.last_name }"
            @blur="validateField('last_name')"
          />
          <p v-if="errors.last_name" class="text-sm text-destructive">
            {{ errors.last_name }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div class="space-y-2">
          <Label for="email">{{ $t('common.email') }}</Label>
          <Input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="juan@example.com"
            :class="{ 'border-destructive': errors.email }"
            @blur="validateField('email')"
          />
          <p v-if="errors.email" class="text-sm text-destructive">
            {{ errors.email }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="phone">{{ $t('common.phone') }} *</Label>
          <Input
            id="phone"
            v-model="form.phone"
            placeholder="+54 11 1234-5678"
            :class="{ 'border-destructive': errors.phone }"
            @blur="validateField('phone')"
          />
          <p v-if="errors.phone" class="text-sm text-destructive">
            {{ errors.phone }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div class="space-y-2">
          <Label for="dni">{{ $t('tenants.dni') }}</Label>
          <Input
            id="dni"
            v-model="form.dni"
            placeholder="12345678"
          />
        </div>

        <div class="space-y-2">
          <Label for="cuit_cuil">{{ $t('tenants.cuitCuil') }}</Label>
          <Input
            id="cuit_cuil"
            v-model="form.cuit_cuil"
            placeholder="20-12345678-9"
            :class="{ 'border-destructive': errors.cuit_cuil }"
            @blur="validateField('cuit_cuil')"
          />
          <p v-if="errors.cuit_cuil" class="text-sm text-destructive">
            {{ errors.cuit_cuil }}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="status">{{ $t('common.status') }} *</Label>
          <Select v-model="form.status">
            <SelectTrigger :class="{ 'border-destructive': errors.status }">
              <SelectValue :placeholder="$t('tenants.selectStatus')" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="activo">{{ $t('tenants.activo') }}</SelectItem>
                <SelectItem value="inactivo">{{ $t('tenants.inactivo') }}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <p v-if="errors.status" class="text-sm text-destructive">
            {{ errors.status }}
          </p>
        </div>
      </div>

      <div class="mt-4 space-y-2">
        <Label for="address">{{ $t('common.address') }}</Label>
        <Input
          id="address"
          v-model="form.address"
          placeholder="Av. Corrientes 1234, CABA"
        />
      </div>
    </div>

    <!-- Employment Data Section -->
    <div class="border-t pt-4">
      <h3 class="text-sm font-medium text-muted-foreground mb-4">{{ $t('tenants.employmentInfo') }}</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="employer">{{ $t('tenants.employer') }}</Label>
          <Input
            id="employer"
            v-model="form.employer"
            :placeholder="$t('tenants.companyName')"
          />
        </div>

        <div class="space-y-2">
          <Label for="employer_phone">{{ $t('tenants.employerPhone') }}</Label>
          <Input
            id="employer_phone"
            v-model="form.employer_phone"
            placeholder="+54 11 1234-5678"
          />
        </div>
      </div>

      <div class="mt-4 space-y-2">
        <Label for="monthly_income">{{ $t('tenants.monthlyIncome') }} (ARS)</Label>
        <Input
          id="monthly_income"
          v-model.number="form.monthly_income"
          type="number"
          min="0"
          step="0.01"
          placeholder="150000"
          :class="{ 'border-destructive': errors.monthly_income }"
          @blur="validateField('monthly_income')"
        />
        <p v-if="errors.monthly_income" class="text-sm text-destructive">
          {{ errors.monthly_income }}
        </p>
      </div>
    </div>

    <!-- Emergency Contact Section -->
    <div class="border-t pt-4">
      <h3 class="text-sm font-medium text-muted-foreground mb-4">{{ $t('tenants.emergencyContact') }}</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <Label for="emergency_contact_name">{{ $t('tenants.contactName') }}</Label>
          <Input
            id="emergency_contact_name"
            v-model="form.emergency_contact_name"
            placeholder="Maria Perez"
          />
        </div>

        <div class="space-y-2">
          <Label for="emergency_contact_phone">{{ $t('tenants.contactPhone') }}</Label>
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
        <Label for="notes">{{ $t('common.notes') }}</Label>
        <Textarea
          id="notes"
          v-model="form.notes"
          :placeholder="$t('tenants.additionalNotes')"
          rows="3"
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
        {{ isEdit ? $t('tenants.updateTenant') : $t('tenants.createTenant') }}
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
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

interface FormErrors {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  cuit_cuil: string | null
  status: string | null
  monthly_income: string | null
}

const props = defineProps<{
  initialData?: Partial<Tenant>
  isEdit?: boolean
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: TenantFormData): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

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

const errors = reactive<FormErrors>({
  first_name: null,
  last_name: null,
  email: null,
  phone: null,
  cuit_cuil: null,
  status: null,
  monthly_income: null,
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
    clearErrors()
  }
}, { immediate: true })

function clearErrors() {
  errors.first_name = null
  errors.last_name = null
  errors.email = null
  errors.phone = null
  errors.cuit_cuil = null
  errors.status = null
  errors.monthly_income = null
}

function validateField(field: keyof FormErrors): boolean {
  switch (field) {
    case 'first_name':
      if (!form.value.first_name || form.value.first_name.trim().length < 2) {
        errors.first_name = t('validation.firstNameRequired')
        return false
      }
      errors.first_name = null
      return true

    case 'last_name':
      if (!form.value.last_name || form.value.last_name.trim().length < 2) {
        errors.last_name = t('validation.lastNameRequired')
        return false
      }
      errors.last_name = null
      return true

    case 'phone':
      if (!form.value.phone || form.value.phone.trim().length === 0) {
        errors.phone = t('validation.phoneRequired')
        return false
      }
      errors.phone = null
      return true

    case 'email':
      if (form.value.email && form.value.email.trim().length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(form.value.email)) {
          errors.email = t('validation.invalidEmail')
          return false
        }
      }
      errors.email = null
      return true

    case 'cuit_cuil':
      if (form.value.cuit_cuil && form.value.cuit_cuil.trim().length > 0) {
        const cuitDigits = form.value.cuit_cuil.replace(/\D/g, '')
        if (cuitDigits.length !== 11) {
          errors.cuit_cuil = t('validation.cuitLength')
          return false
        }
      }
      errors.cuit_cuil = null
      return true

    case 'status':
      if (!form.value.status) {
        errors.status = t('validation.required')
        return false
      }
      errors.status = null
      return true

    case 'monthly_income':
      if (form.value.monthly_income !== undefined && form.value.monthly_income < 0) {
        errors.monthly_income = t('validation.positiveNumber')
        return false
      }
      errors.monthly_income = null
      return true

    default:
      return true
  }
}

function validateForm(): boolean {
  const firstNameValid = validateField('first_name')
  const lastNameValid = validateField('last_name')
  const phoneValid = validateField('phone')
  const emailValid = validateField('email')
  const cuitValid = validateField('cuit_cuil')
  const statusValid = validateField('status')
  const monthlyIncomeValid = validateField('monthly_income')

  return firstNameValid && lastNameValid && phoneValid && emailValid && cuitValid && statusValid && monthlyIncomeValid
}

function handleSubmit() {
  if (!validateForm()) return

  // Build tenant data
  const tenantData: TenantFormData = {
    first_name: form.value.first_name.trim(),
    last_name: form.value.last_name.trim(),
    email: form.value.email.trim() || null,
    phone: form.value.phone.trim(),
    dni: form.value.dni.trim() || null,
    cuit_cuil: form.value.cuit_cuil.trim() || null,
    address: form.value.address.trim() || null,
    employer: form.value.employer.trim() || null,
    employer_phone: form.value.employer_phone.trim() || null,
    monthly_income: form.value.monthly_income ?? null,
    emergency_contact_name: form.value.emergency_contact_name.trim() || null,
    emergency_contact_phone: form.value.emergency_contact_phone.trim() || null,
    status: form.value.status,
    notes: form.value.notes.trim() || null,
  }

  emit('submit', tenantData)
}
</script>
