<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent :class="inline ? 'max-w-lg' : 'max-w-2xl max-h-[90vh] overflow-y-auto'">
      <DialogHeader>
        <DialogTitle>
          {{ isEditMode ? 'Editar Propietario' : 'Nuevo Propietario' }}
        </DialogTitle>
        <DialogDescription>
          {{ isEditMode
            ? 'Actualice la información del propietario.'
            : 'Complete los datos para registrar un nuevo propietario.'
          }}
        </DialogDescription>
      </DialogHeader>

      <!-- Loading state for edit mode -->
      <div v-if="isEditMode && loadingOwner" class="py-12 text-center">
        <Loader2 class="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        <p class="mt-2 text-sm text-muted-foreground">Cargando propietario...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="loadError" class="py-8 text-center">
        <p class="text-destructive font-medium">{{ loadError }}</p>
        <Button variant="outline" class="mt-4" @click="loadOwnerData">
          Reintentar
        </Button>
      </div>

      <!-- Form -->
      <OwnerForm
        v-else
        :initial-data="ownerData"
        :is-edit="isEditMode"
        :inline="inline"
        @submit="handleSubmit"
        @cancel="$emit('update:open', false)"
      />
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-vue-next'
import OwnerForm from './OwnerForm.vue'
import { useOwners } from '@/composables/useOwners'
import type { Owner, OwnerFormData } from '@/types'

const props = defineProps<{
  open: boolean
  ownerId?: string | null
  inline?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success', owner: Owner): void
}>()

const { fetchOwnerById, createOwner, updateOwner } = useOwners()

const ownerData = ref<Partial<Owner> | undefined>(undefined)
const loadingOwner = ref(false)
const loadError = ref<string | null>(null)
const isSubmitting = ref(false)

const isEditMode = computed(() => !!props.ownerId)

// Load owner data when dialog opens in edit mode
watch([() => props.open, () => props.ownerId], async ([open, id]) => {
  if (open && id) {
    await loadOwnerData()
  } else if (!open) {
    // Reset state when dialog closes
    ownerData.value = undefined
    loadError.value = null
  }
}, { immediate: true })

async function loadOwnerData() {
  if (!props.ownerId) return

  loadingOwner.value = true
  loadError.value = null

  try {
    const data = await fetchOwnerById(props.ownerId)
    if (data) {
      ownerData.value = data
    } else {
      loadError.value = 'Propietario no encontrado'
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Error al cargar propietario'
  } finally {
    loadingOwner.value = false
  }
}

async function handleSubmit(formData: OwnerFormData) {
  isSubmitting.value = true

  try {
    let owner: Owner

    if (isEditMode.value && props.ownerId) {
      owner = await updateOwner(props.ownerId, formData)
      alert('Propietario actualizado correctamente')
    } else {
      owner = await createOwner(formData)
      alert('Propietario creado correctamente')
    }

    emit('success', owner)
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error en la operación'
    alert(`Error: ${message}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>
