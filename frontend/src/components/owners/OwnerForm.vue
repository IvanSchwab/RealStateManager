<template>
  <form @submit.prevent="handleSubmit" class="space-y-6" novalidate>
    <!-- Personal Information Section -->
    <div>
      <h3 v-if="!inline" class="text-sm font-medium text-muted-foreground mb-4">
        {{ $t('owners.personalInfo') }}
      </h3>

      <div :class="inline ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'">
        <div class="space-y-2">
          <Label for="full_name">{{ $t('owners.fullName') }} *</Label>
          <Input
            id="full_name"
            v-model="form.full_name"
            :placeholder="$t('owners.fullNamePlaceholder', 'Juan Pérez')"
            :class="{ 'border-destructive': errors.full_name }"
            @blur="validateField('full_name')"
          />
          <p v-if="errors.full_name" class="text-sm text-destructive">
            {{ errors.full_name }}
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

      <div :class="inline ? 'space-y-4 mt-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'">
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
          <Label for="cuit_cuil">{{ $t('owners.cuitCuil') }}</Label>
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
      </div>
    </div>

    <!-- Address Section -->
    <div :class="inline ? '' : 'border-t pt-4'">
      <div class="space-y-2">
        <Label for="address">{{ $t('common.address') }}</Label>
        <Textarea
          id="address"
          v-model="form.address"
          placeholder="Av. Corrientes 1234, CABA"
          :rows="inline ? 2 : 3"
        />
      </div>
    </div>

    <!-- Notes Section -->
    <div v-if="!inline" class="border-t pt-4">
      <div class="space-y-2">
        <Label for="notes">{{ $t('common.notes') }}</Label>
        <Textarea
          id="notes"
          v-model="form.notes"
          :placeholder="$t('owners.notesPlaceholder', 'Notas adicionales sobre el propietario...')"
          rows="3"
        />
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end gap-3 pt-4" :class="inline ? '' : 'border-t'">
      <Button type="button" variant="outline" @click="$emit('cancel')">
        {{ $t('common.cancel') }}
      </Button>
      <Button type="submit" :disabled="isSubmitting">
        <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
        {{ isEdit ? $t('owners.updateOwner') : $t('owners.createOwner') }}
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
import { Loader2 } from 'lucide-vue-next'
import type { Owner, OwnerFormData } from '@/types'

interface OwnerFormState {
  full_name: string
  email: string
  phone: string
  cuit_cuil: string
  address: string
  notes: string
}

interface FormErrors {
  full_name: string | null
  email: string | null
  phone: string | null
  cuit_cuil: string | null
}

const props = defineProps<{
  initialData?: Partial<Owner>
  isEdit?: boolean
  inline?: boolean
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: OwnerFormData): void
  (e: 'cancel'): void
}>()

const { t } = useI18n()

const form = ref<OwnerFormState>({
  full_name: '',
  email: '',
  phone: '',
  cuit_cuil: '',
  address: '',
  notes: '',
})

const errors = reactive<FormErrors>({
  full_name: null,
  email: null,
  phone: null,
  cuit_cuil: null,
})

// Reset form when initialData changes (for edit mode)
watch(() => props.initialData, (newData) => {
  if (newData) {
    form.value = {
      full_name: newData.full_name ?? '',
      email: newData.email ?? '',
      phone: newData.phone ?? '',
      cuit_cuil: newData.cuit_cuil ?? '',
      address: newData.address ?? '',
      notes: newData.notes ?? '',
    }
    // Clear errors when loading new data
    clearErrors()
  }
}, { immediate: true })

function clearErrors() {
  errors.full_name = null
  errors.email = null
  errors.phone = null
  errors.cuit_cuil = null
}

function validateField(field: keyof FormErrors): boolean {
  switch (field) {
    case 'full_name':
      if (!form.value.full_name || form.value.full_name.trim().length < 3) {
        errors.full_name = t('validation.fullNameRequired')
        return false
      }
      errors.full_name = null
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

    default:
      return true
  }
}

function validateForm(): boolean {
  const fullNameValid = validateField('full_name')
  const phoneValid = validateField('phone')
  const emailValid = validateField('email')
  const cuitValid = validateField('cuit_cuil')

  return fullNameValid && phoneValid && emailValid && cuitValid
}

function handleSubmit() {
  if (!validateForm()) return

  // Build owner data
  const ownerData: OwnerFormData = {
    full_name: form.value.full_name.trim(),
    email: form.value.email.trim() || null,
    phone: form.value.phone.trim() || null,
    cuit_cuil: form.value.cuit_cuil.trim() || null,
    address: form.value.address.trim() || null,
    notes: form.value.notes.trim() || null,
  }

  emit('submit', ownerData)
}
</script>
