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
        :initial-property-id="initialPropertyId"
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

  <!-- Success Dialog: Ask to generate payments -->
  <AlertDialog :open="showPaymentsPrompt" @update:open="showPaymentsPrompt = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle class="flex items-center gap-2">
          <CheckCircle class="w-5 h-5 text-green-600" />
          Contrato Creado Exitosamente
        </AlertDialogTitle>
        <AlertDialogDescription>
          El contrato ha sido creado correctamente. ¿Deseas generar los pagos mensuales para este contrato ahora?
          <div class="mt-3 p-3 bg-muted rounded-lg text-sm">
            <p><strong>Propiedad:</strong> {{ createdContractProperty }}</p>
            <p><strong>Duración:</strong> {{ createdContractDuration }} meses</p>
            <p><strong>Alquiler:</strong> {{ formatCurrency(createdContractRent) }}</p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="skipPaymentsGeneration">
          Más tarde
        </AlertDialogCancel>
        <AlertDialogAction @click="openPaymentsGeneration">
          <CreditCard class="w-4 h-4 mr-2" />
          Generar Pagos
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- Generate Payments Dialog -->
  <GeneratePaymentsDialog
    v-if="createdContract"
    v-model:open="showGeneratePaymentsDialog"
    :contract-id="createdContract.id"
    :contract="createdContract"
    @success="handlePaymentsGenerated"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
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
import { Loader2, CheckCircle, CreditCard } from 'lucide-vue-next'
import ContractFormWizard from './ContractFormWizard.vue'
import GeneratePaymentsDialog from '@/components/payments/GeneratePaymentsDialog.vue'
import { useContracts } from '@/composables/useContracts'
import { useToast } from '@/composables/useToast'
import { useFormatCurrency } from '@/composables/useFormatCurrency'
import type { ContractFormData, ContractWithRelations } from '@/types'

const { t } = useI18n()
const toast = useToast()
const { formatCurrency } = useFormatCurrency()

const props = defineProps<{
  open: boolean
  contractId?: string | null
  initialPropertyId?: string
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

// Payment generation after contract creation
const showPaymentsPrompt = ref(false)
const showGeneratePaymentsDialog = ref(false)
const createdContract = ref<ContractWithRelations | null>(null)
const createdContractProperty = ref('')
const createdContractDuration = ref(0)
const createdContractRent = ref(0)

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
      toast.success(t('toast.contractUpdated'))
      hasChanges.value = false
      emit('success')
      emit('update:open', false)
    } else {
      // Create the contract
      const newContract = await createContract(formData)

      hasChanges.value = false
      emit('update:open', false)

      // If contract was created successfully, show payments prompt
      if (newContract) {
        // Fetch the full contract with relations
        const fullContract = await fetchContractById(newContract.id)
        if (fullContract) {
          createdContract.value = fullContract
          createdContractProperty.value = formatPropertyAddress(fullContract)
          createdContractDuration.value = calculateDuration(fullContract.start_date, fullContract.end_date)
          createdContractRent.value = fullContract.base_rent_amount
          showPaymentsPrompt.value = true
        } else {
          emit('success')
        }
      } else {
        emit('success')
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : t('toast.operationError')
    toast.error(`${t('common.error')}: ${message}`)
  } finally {
    isSubmitting.value = false
  }
}

function formatPropertyAddress(contract: ContractWithRelations): string {
  if (!contract.property) return 'Propiedad no disponible'
  const prop = contract.property
  let address = prop.address_street
  if (prop.address_number) address += ` ${prop.address_number}`
  if (prop.address_floor) address += `, Piso ${prop.address_floor}`
  if (prop.address_apartment) address += `, Depto ${prop.address_apartment}`
  return address
}

function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = end.getTime() - start.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24 * 30))
}

function skipPaymentsGeneration() {
  showPaymentsPrompt.value = false
  createdContract.value = null
  emit('success')
}

function openPaymentsGeneration() {
  showPaymentsPrompt.value = false
  showGeneratePaymentsDialog.value = true
}

function handlePaymentsGenerated() {
  showGeneratePaymentsDialog.value = false
  createdContract.value = null
  emit('success')
}
</script>
