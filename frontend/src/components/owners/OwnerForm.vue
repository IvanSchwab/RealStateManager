<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Personal Information Section -->
    <div>
      <h3 v-if="!inline" class="text-sm font-medium text-muted-foreground mb-4">
        Información Personal
      </h3>

      <div :class="inline ? 'space-y-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4'">
        <div class="space-y-2">
          <Label for="full_name">Nombre Completo *</Label>
          <Input
            id="full_name"
            v-model="form.full_name"
            placeholder="Juan Pérez"
            required
          />
        </div>

        <div class="space-y-2">
          <Label for="phone">Teléfono *</Label>
          <Input
            id="phone"
            v-model="form.phone"
            placeholder="+54 11 1234-5678"
            required
          />
        </div>
      </div>

      <div :class="inline ? 'space-y-4 mt-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'">
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
          <Label for="cuit_cuil">CUIT/CUIL</Label>
          <Input
            id="cuit_cuil"
            v-model="form.cuit_cuil"
            placeholder="20-12345678-9"
          />
        </div>
      </div>
    </div>

    <!-- Address Section -->
    <div :class="inline ? '' : 'border-t pt-4'">
      <div class="space-y-2">
        <Label for="address">Dirección</Label>
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
        <Label for="notes">Notas</Label>
        <Textarea
          id="notes"
          v-model="form.notes"
          placeholder="Notas adicionales sobre el propietario..."
          rows="3"
        />
      </div>
    </div>

    <!-- Form Actions -->
    <div class="flex justify-end gap-3 pt-4" :class="inline ? '' : 'border-t'">
      <Button type="button" variant="outline" @click="$emit('cancel')">
        Cancelar
      </Button>
      <Button type="submit" :disabled="isSubmitting">
        <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
        {{ isEdit ? 'Actualizar' : 'Crear' }} Propietario
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

const props = defineProps<{
  initialData?: Partial<Owner>
  isEdit?: boolean
  inline?: boolean
}>()

const emit = defineEmits<{
  (e: 'submit', data: OwnerFormData): void
  (e: 'cancel'): void
}>()

const isSubmitting = ref(false)

const form = ref<OwnerFormState>({
  full_name: '',
  email: '',
  phone: '',
  cuit_cuil: '',
  address: '',
  notes: '',
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
  }
}, { immediate: true })

function validateForm(): boolean {
  // Required: full_name (min 3 chars)
  if (!form.value.full_name || form.value.full_name.length < 3) {
    alert('El nombre completo es obligatorio (mínimo 3 caracteres)')
    return false
  }

  // Required: phone
  if (!form.value.phone) {
    alert('El teléfono es obligatorio')
    return false
  }

  // Email validation if provided
  if (form.value.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.value.email)) {
      alert('Por favor, ingrese un email válido')
      return false
    }
  }

  // CUIT/CUIL validation if provided (11 digits)
  if (form.value.cuit_cuil) {
    const cuitDigits = form.value.cuit_cuil.replace(/\D/g, '')
    if (cuitDigits.length !== 11) {
      alert('El CUIT/CUIL debe tener 11 dígitos')
      return false
    }
  }

  return true
}

function handleSubmit() {
  if (!validateForm()) return

  // Build owner data
  const ownerData: OwnerFormData = {
    full_name: form.value.full_name,
    email: form.value.email || null,
    phone: form.value.phone || null,
    cuit_cuil: form.value.cuit_cuil || null,
    address: form.value.address || null,
    notes: form.value.notes || null,
  }

  emit('submit', ownerData)
}
</script>
