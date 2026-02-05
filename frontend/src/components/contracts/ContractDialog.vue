<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {{ isEditMode ? 'Editar Contrato' : 'Nuevo Contrato' }}
        </DialogTitle>
        <DialogDescription>
          {{ isEditMode
            ? 'Modifica la información del contrato.'
            : 'Completa los datos para crear un nuevo contrato de alquiler.'
          }}
        </DialogDescription>
      </DialogHeader>

      <!-- Loading state for edit mode -->
      <div v-if="isEditMode && loadingContract" class="py-12 text-center">
        <Loader2 class="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
        <p class="mt-2 text-sm text-muted-foreground">Cargando contrato...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="loadError" class="py-8 text-center">
        <p class="text-destructive font-medium">{{ loadError }}</p>
        <Button variant="outline" class="mt-4" @click="loadContractData">
          Reintentar
        </Button>
      </div>

      <!-- Form Wizard -->
      <ContractFormWizard
        v-else
        :contract="contractData"
        :mode="isEditMode ? 'edit' : 'create'"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </DialogContent>
  </Dialog>

  <!-- Unsaved Changes Confirmation -->
  <AlertDialog :open="showUnsavedChangesDialog" @update:open="showUnsavedChangesDialog = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Cambios sin guardar</AlertDialogTitle>
        <AlertDialogDescription>
          Tienes cambios sin guardar en el formulario. ¿Estás seguro de que quieres salir?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="showUnsavedChangesDialog = false">
          Continuar editando
        </AlertDialogCancel>
        <AlertDialogAction @click="confirmClose">
          Descartar cambios
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
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
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-vue-next'
import ContractFormWizard from './ContractFormWizard.vue'
import { useContracts } from '@/composables/useContracts'
import type { Contract, ContractFormData, ContractWithRelations } from '@/types'

const props = defineProps<{
  open: boolean
  contractId?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const { fetchContractById, createContract, updateContract } = useContracts()

const contractData = ref<ContractWithRelations | null>(null)
const loadingContract = ref(false)
const loadError = ref<string | null>(null)
const isSubmitting = ref(false)
const hasChanges = ref(false)
const showUnsavedChangesDialog = ref(false)
const pendingClose = ref(false)

const isEditMode = computed(() => !!props.contractId)

// Load contract data when dialog opens in edit mode
watch([() => props.open, () => props.contractId], async ([open, id]) => {
  if (open && id) {
    await loadContractData()
  } else if (!open) {
    // Reset state when dialog closes
    contractData.value = null
    loadError.value = null
    hasChanges.value = false
  }
}, { immediate: true })

async function loadContractData() {
  if (!props.contractId) return

  loadingContract.value = true
  loadError.value = null

  try {
    const data = await fetchContractById(props.contractId)
    if (data) {
      contractData.value = data
    } else {
      loadError.value = 'Contrato no encontrado'
    }
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Error al cargar contrato'
  } finally {
    loadingContract.value = false
  }
}

function handleOpenChange(value: boolean) {
  if (!value && hasChanges.value) {
    showUnsavedChangesDialog.value = true
    pendingClose.value = true
    return
  }
  emit('update:open', value)
}

function handleCancel() {
  if (hasChanges.value) {
    showUnsavedChangesDialog.value = true
    pendingClose.value = true
    return
  }
  emit('update:open', false)
}

function confirmClose() {
  showUnsavedChangesDialog.value = false
  hasChanges.value = false
  emit('update:open', false)
}

async function handleSubmit(formData: ContractFormData) {
  isSubmitting.value = true

  try {
    if (isEditMode.value && props.contractId) {
      await updateContract(props.contractId, formData)
      alert('Contrato actualizado correctamente')
    } else {
      await createContract(formData)
      alert('Contrato creado correctamente')
    }

    hasChanges.value = false
    emit('success')
    emit('update:open', false)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error en la operación'
    alert(`Error: ${message}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>
