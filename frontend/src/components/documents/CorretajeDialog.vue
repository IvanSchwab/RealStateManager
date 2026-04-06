<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Autorización de Corretaje</DialogTitle>
        <DialogDescription>
          {{ stepDescriptions[currentStep] }}
        </DialogDescription>
      </DialogHeader>

      <!-- Step Indicator -->
      <div class="flex items-center justify-between mb-6">
        <div
          v-for="(step, index) in steps"
          :key="index"
          class="flex items-center"
          :class="{ 'flex-1': index < steps.length - 1 }"
        >
          <button
            type="button"
            class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors"
            :class="getStepClass(index)"
            :disabled="index > currentStep"
            @click="goToStep(index)"
          >
            <Check v-if="index < currentStep" class="w-4 h-4" />
            <span v-else>{{ index + 1 }}</span>
          </button>
          <span
            class="ml-2 text-sm hidden lg:inline"
            :class="index <= currentStep ? 'text-foreground' : 'text-muted-foreground'"
          >
            {{ step }}
          </span>
          <div
            v-if="index < steps.length - 1"
            class="flex-1 h-0.5 mx-2"
            :class="index < currentStep ? 'bg-primary' : 'bg-muted'"
          />
        </div>
      </div>

      <div>
        <!-- Step 1: Property Selection -->
        <div v-show="currentStep === 0" class="space-y-4">
          <div class="space-y-2">
            <Label for="property_id">Propiedad *</Label>
            <Select v-model="form.property_id">
              <SelectTrigger :class="{ 'border-destructive': errors.property_id }">
                <SelectValue placeholder="Seleccionar propiedad" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem
                    v-for="prop in availableProperties"
                    :key="prop.id"
                    :value="prop.id"
                  >
                    {{ prop.name }} - {{ prop.address_street }} {{ prop.address_number }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p v-if="errors.property_id" class="text-sm text-destructive">{{ errors.property_id }}</p>
            <p v-else-if="loadingProperties" class="text-sm text-muted-foreground">
              Cargando propiedades...
            </p>
            <p v-else-if="availableProperties.length === 0" class="text-sm text-muted-foreground">
              No hay propiedades disponibles
            </p>
          </div>

          <!-- Owner Info (auto-loaded) -->
          <div v-if="selectedProperty && ownerData" class="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 class="text-sm font-medium text-muted-foreground">Datos del Propietario</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-muted-foreground">Nombre:</span>
                <span class="ml-2 font-medium">{{ ownerData.full_name }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">DNI/CUIT:</span>
                <span class="ml-2 font-medium">{{ ownerData.cuit_cuil || 'No especificado' }}</span>
              </div>
              <div class="md:col-span-2">
                <span class="text-muted-foreground">Domicilio:</span>
                <span class="ml-2 font-medium">{{ ownerData.address || 'No especificado' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Document Data -->
        <div v-show="currentStep === 1" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="agency_name">Nombre de la Inmobiliaria *</Label>
              <Input
                id="agency_name"
                v-model="form.agency_name"
                placeholder="Ej: Inmobiliaria López"
                :class="{ 'border-destructive': errors.agency_name }"
              />
              <p v-if="errors.agency_name" class="text-sm text-destructive">{{ errors.agency_name }}</p>
            </div>
            <div class="space-y-2">
              <Label for="agency_matricula">Matrícula *</Label>
              <Input
                id="agency_matricula"
                v-model="form.agency_matricula"
                placeholder="Ej: 12345"
                :class="{ 'border-destructive': errors.agency_matricula }"
              />
              <p v-if="errors.agency_matricula" class="text-sm text-destructive">{{ errors.agency_matricula }}</p>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Propósito *</Label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="form.purpose"
                  value="venta"
                  class="w-4 h-4"
                />
                <span>Venta</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="form.purpose"
                  value="alquiler"
                  class="w-4 h-4"
                />
                <span>Alquiler</span>
              </label>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Exclusividad *</Label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="form.exclusivity"
                  :value="true"
                  class="w-4 h-4"
                />
                <span>Exclusiva</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="form.exclusivity"
                  :value="false"
                  class="w-4 h-4"
                />
                <span>No exclusiva</span>
              </label>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="commission_percentage">Comisión (%) *</Label>
            <Input
              id="commission_percentage"
              v-model.number="form.commission_percentage"
              type="number"
              min="0"
              max="100"
              step="0.5"
              placeholder="Ej: 3"
              :class="{ 'border-destructive': errors.commission_percentage }"
            />
            <p v-if="errors.commission_percentage" class="text-sm text-destructive">{{ errors.commission_percentage }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="valid_from">Vigencia desde *</Label>
              <Input
                id="valid_from"
                v-model="form.valid_from"
                type="date"
                :class="{ 'border-destructive': errors.valid_from }"
              />
              <p v-if="errors.valid_from" class="text-sm text-destructive">{{ errors.valid_from }}</p>
            </div>
            <div class="space-y-2">
              <Label for="valid_until">Vigencia hasta *</Label>
              <Input
                id="valid_until"
                v-model="form.valid_until"
                type="date"
                :min="form.valid_from"
                :class="{ 'border-destructive': errors.valid_until }"
              />
              <p v-if="errors.valid_until" class="text-sm text-destructive">{{ errors.valid_until }}</p>
            </div>
          </div>
        </div>

        <!-- Step 3: Confirm -->
        <div v-show="currentStep === 2" class="space-y-4">
          <h3 class="text-lg font-medium">Resumen del Documento</h3>

          <div class="p-4 bg-muted/50 rounded-lg space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Propiedad:</span>
              <span class="font-medium">{{ selectedProperty?.name }}</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Propietario:</span>
              <span class="font-medium">{{ ownerData?.full_name }}</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Inmobiliaria:</span>
              <span class="font-medium">{{ form.agency_name }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Matrícula:</span>
              <span class="font-medium">{{ form.agency_matricula }}</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Propósito:</span>
              <span class="font-medium">{{ form.purpose === 'venta' ? 'Venta' : 'Alquiler' }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Exclusividad:</span>
              <span class="font-medium">{{ form.exclusivity ? 'Exclusiva' : 'No exclusiva' }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Comisión:</span>
              <span class="font-medium">{{ form.commission_percentage }}%</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Vigencia:</span>
              <span class="font-medium">{{ formatDate(form.valid_from) }} - {{ formatDate(form.valid_until) }}</span>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            @click="previousStep"
            :disabled="currentStep === 0"
          >
            Anterior
          </Button>

          <Button
            type="button"
            @click="handleNext"
            :disabled="generating"
          >
            <Loader2 v-if="generating" class="w-4 h-4 mr-2 animate-spin" />
            {{ isLastStep ? 'Generar PDF' : 'Siguiente' }}
          </Button>
        </div>
      </div>

      <!-- Error message -->
      <p v-if="generationError" class="text-sm text-destructive mt-4">
        {{ generationError }}
      </p>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, Loader2 } from 'lucide-vue-next'
import { useProperties } from '@/composables/useProperties'
import { useOwners } from '@/composables/useOwners'
import { useOrganization } from '@/composables/useOrganization'
import { useLegalDocumentPDF, type CorretajeFormData } from '@/composables/useLegalDocumentPDF'
import { useDate } from '@/composables/useDate'
import { useToast } from '@/composables/useToast'
import type { Property, Owner } from '@/types'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const { formatDate } = useDate()
const toast = useToast()
const { properties, loading: loadingProperties, fetchProperties } = useProperties()
const { fetchOwnerById } = useOwners()
const { organization } = useOrganization()
const { generateCorretajePDF, loading: generating, error: generationError } = useLegalDocumentPDF()

// Steps
const steps = ['Propiedad', 'Datos', 'Confirmar']
const stepDescriptions = [
  'Selecciona la propiedad para la autorización',
  'Completa los datos del documento',
  'Revisa y genera el documento',
]
const currentStep = ref(0)

// Form state
const form = ref({
  property_id: '',
  agency_name: '',
  agency_matricula: '',
  purpose: 'venta' as 'venta' | 'alquiler',
  exclusivity: true,
  commission_percentage: 3,
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Data state
const selectedProperty = ref<Property | null>(null)
const ownerData = ref<Owner | null>(null)

// Computed
const availableProperties = computed(() => {
  // Filter out sold properties
  return properties.value.filter(p => p.status !== 'vendida')
})

const isLastStep = computed(() => currentStep.value === steps.length - 1)

// Methods
function clearErrors() {
  Object.keys(errors).forEach(key => delete errors[key])
}

function validateStep(step: number): boolean {
  clearErrors()

  switch (step) {
    case 0:
      if (!form.value.property_id) {
        errors.property_id = 'Selecciona una propiedad'
      }
      if (!selectedProperty.value || !ownerData.value) {
        errors.property_id = 'Selecciona una propiedad con propietario'
      }
      break
    case 1:
      if (!form.value.agency_name.trim()) {
        errors.agency_name = 'Ingresa el nombre de la inmobiliaria'
      }
      if (!form.value.agency_matricula.trim()) {
        errors.agency_matricula = 'Ingresa la matrícula'
      }
      if (!form.value.commission_percentage || form.value.commission_percentage <= 0) {
        errors.commission_percentage = 'Ingresa un porcentaje de comisión válido'
      }
      if (!form.value.valid_from) {
        errors.valid_from = 'Selecciona la fecha de inicio'
      }
      if (!form.value.valid_until) {
        errors.valid_until = 'Selecciona la fecha de fin'
      }
      break
    case 2:
      // No validation needed on confirm step
      break
  }

  return Object.keys(errors).length === 0
}

function getStepClass(index: number): string {
  if (index < currentStep.value) {
    return 'bg-primary text-primary-foreground'
  }
  if (index === currentStep.value) {
    return 'bg-primary text-primary-foreground'
  }
  return 'bg-muted text-muted-foreground'
}

function goToStep(index: number) {
  if (index < currentStep.value) {
    clearErrors()
    currentStep.value = index
  }
}

function previousStep() {
  if (currentStep.value > 0) {
    clearErrors()
    currentStep.value--
  }
}

async function handleNext() {
  if (!validateStep(currentStep.value)) return

  if (isLastStep.value) {
    await generateDocument()
  } else {
    currentStep.value++
  }
}

async function loadPropertyOwner(propertyId: string) {
  const property = properties.value.find(p => p.id === propertyId)
  selectedProperty.value = property || null

  if (property?.owner_id) {
    const owner = await fetchOwnerById(property.owner_id)
    ownerData.value = owner
  } else {
    ownerData.value = null
  }
}

async function generateDocument() {
  if (!selectedProperty.value || !ownerData.value) return

  const formData: CorretajeFormData = {
    property_id: form.value.property_id,
    property: {
      name: selectedProperty.value.name,
      address_street: selectedProperty.value.address_street,
      address_number: selectedProperty.value.address_number,
      address_city: selectedProperty.value.address_city,
      address_state: selectedProperty.value.address_state,
    },
    owner: {
      full_name: ownerData.value.full_name,
      dni: ownerData.value.cuit_cuil || '',
      address: ownerData.value.address || '',
    },
    agency: {
      name: form.value.agency_name,
      matricula: form.value.agency_matricula,
    },
    exclusivity: form.value.exclusivity,
    commission_percentage: form.value.commission_percentage,
    valid_from: form.value.valid_from,
    valid_until: form.value.valid_until,
    purpose: form.value.purpose,
  }

  const storagePath = await generateCorretajePDF(formData)

  if (storagePath) {
    toast.success('Documento generado correctamente')
    emit('success')
    emit('update:open', false)
  }
}

function resetForm() {
  currentStep.value = 0
  clearErrors()
  form.value = {
    property_id: '',
    agency_name: organization.value?.name || '',
    agency_matricula: '',
    purpose: 'venta',
    exclusivity: true,
    commission_percentage: 3,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
  }
  selectedProperty.value = null
  ownerData.value = null
}

function handleOpenChange(open: boolean) {
  if (!open) {
    resetForm()
  }
  emit('update:open', open)
}

// Watchers
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    resetForm()
    await fetchProperties()
    // Pre-fill agency name from organization
    if (organization.value?.name) {
      form.value.agency_name = organization.value.name
    }
  }
})

// Watch property selection
watch(() => form.value.property_id, (propertyId) => {
  if (propertyId) {
    loadPropertyOwner(propertyId)
  }
})

// Set default validity period (6 months)
watch(() => form.value.valid_from, (newVal) => {
  if (newVal && !form.value.valid_until) {
    const date = new Date(newVal + 'T00:00:00')
    date.setMonth(date.getMonth() + 6)
    form.value.valid_until = date.toISOString().split('T')[0]
  }
})
</script>
