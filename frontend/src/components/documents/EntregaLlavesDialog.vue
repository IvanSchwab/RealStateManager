<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Acta de Entrega de Llaves</DialogTitle>
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

          <!-- Property Info -->
          <div v-if="selectedProperty" class="p-4 bg-muted/50 rounded-lg">
            <h4 class="text-sm font-medium text-muted-foreground mb-2">Propiedad Seleccionada</h4>
            <p class="text-sm font-medium">{{ selectedProperty.name }}</p>
            <p class="text-sm text-muted-foreground">
              {{ selectedProperty.address_street }} {{ selectedProperty.address_number }},
              {{ selectedProperty.address_city }}
            </p>
          </div>
        </div>

        <!-- Step 2: Parties -->
        <div v-show="currentStep === 1" class="space-y-4">
          <h3 class="text-lg font-medium">Quien Entrega</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="deliverer_name">Nombre completo *</Label>
              <Input
                id="deliverer_name"
                v-model="form.deliverer_name"
                placeholder="Ej: Juan Pérez"
                :class="{ 'border-destructive': errors.deliverer_name }"
              />
              <p v-if="errors.deliverer_name" class="text-sm text-destructive">{{ errors.deliverer_name }}</p>
            </div>
            <div class="space-y-2">
              <Label for="deliverer_dni">DNI *</Label>
              <Input
                id="deliverer_dni"
                v-model="form.deliverer_dni"
                placeholder="Ej: 30123456"
                :class="{ 'border-destructive': errors.deliverer_dni }"
              />
              <p v-if="errors.deliverer_dni" class="text-sm text-destructive">{{ errors.deliverer_dni }}</p>
            </div>
          </div>

          <Separator class="my-4" />

          <h3 class="text-lg font-medium">Quien Recibe</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="receiver_name">Nombre completo *</Label>
              <Input
                id="receiver_name"
                v-model="form.receiver_name"
                placeholder="Ej: María García"
                :class="{ 'border-destructive': errors.receiver_name }"
              />
              <p v-if="errors.receiver_name" class="text-sm text-destructive">{{ errors.receiver_name }}</p>
            </div>
            <div class="space-y-2">
              <Label for="receiver_dni">DNI *</Label>
              <Input
                id="receiver_dni"
                v-model="form.receiver_dni"
                placeholder="Ej: 40123456"
                :class="{ 'border-destructive': errors.receiver_dni }"
              />
              <p v-if="errors.receiver_dni" class="text-sm text-destructive">{{ errors.receiver_dni }}</p>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="delivery_date">Fecha de entrega *</Label>
            <Input
              id="delivery_date"
              v-model="form.delivery_date"
              type="date"
              :class="{ 'border-destructive': errors.delivery_date }"
            />
            <p v-if="errors.delivery_date" class="text-sm text-destructive">{{ errors.delivery_date }}</p>
          </div>
        </div>

        <!-- Step 3: Property Condition -->
        <div v-show="currentStep === 2" class="space-y-4">
          <h3 class="text-lg font-medium">Estado del Inmueble</h3>

          <div class="space-y-2">
            <Label for="property_condition">Descripción del estado *</Label>
            <Textarea
              id="property_condition"
              v-model="form.property_condition"
              placeholder="Describa el estado general del inmueble al momento de la entrega"
              rows="3"
              :class="{ 'border-destructive': errors.property_condition }"
            />
            <p v-if="errors.property_condition" class="text-sm text-destructive">{{ errors.property_condition }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label for="keys_count">Cantidad de llaves *</Label>
              <Input
                id="keys_count"
                v-model.number="form.keys_count"
                type="number"
                min="0"
                placeholder="0"
                :class="{ 'border-destructive': errors.keys_count }"
              />
              <p v-if="errors.keys_count" class="text-sm text-destructive">{{ errors.keys_count }}</p>
            </div>
            <div class="space-y-2">
              <Label for="remotes_count">Controles remotos</Label>
              <Input
                id="remotes_count"
                v-model.number="form.remotes_count"
                type="number"
                min="0"
                placeholder="0"
              />
            </div>
            <div class="space-y-2">
              <Label for="tags_count">Tags/Tarjetas</Label>
              <Input
                id="tags_count"
                v-model.number="form.tags_count"
                type="number"
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <Separator class="my-4" />

          <h4 class="text-sm font-medium">Lectura de Medidores (opcional)</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="space-y-2">
              <Label for="meter_electricity">Electricidad</Label>
              <Input
                id="meter_electricity"
                v-model="form.meter_electricity"
                placeholder="Ej: 12345 kWh"
              />
            </div>
            <div class="space-y-2">
              <Label for="meter_gas">Gas</Label>
              <Input
                id="meter_gas"
                v-model="form.meter_gas"
                placeholder="Ej: 1234 m³"
              />
            </div>
            <div class="space-y-2">
              <Label for="meter_water">Agua</Label>
              <Input
                id="meter_water"
                v-model="form.meter_water"
                placeholder="Ej: 567 m³"
              />
            </div>
          </div>

          <Separator class="my-4" />

          <div class="space-y-2">
            <Label for="expenses_from">El receptor asume gastos desde *</Label>
            <Input
              id="expenses_from"
              v-model="form.expenses_from"
              type="date"
              :class="{ 'border-destructive': errors.expenses_from }"
            />
            <p v-if="errors.expenses_from" class="text-sm text-destructive">{{ errors.expenses_from }}</p>
            <p v-else class="text-xs text-muted-foreground">
              Fecha a partir de la cual el receptor asume el pago de servicios, expensas e impuestos
            </p>
          </div>

          <div class="space-y-2">
            <Label for="observations">Observaciones</Label>
            <Textarea
              id="observations"
              v-model="form.observations"
              placeholder="Observaciones adicionales (desperfectos, acuerdos especiales, etc.)"
              rows="2"
            />
          </div>
        </div>

        <!-- Step 4: Confirm -->
        <div v-show="currentStep === 3" class="space-y-4">
          <h3 class="text-lg font-medium">Resumen del Acta</h3>

          <div class="p-4 bg-muted/50 rounded-lg space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Propiedad:</span>
              <span class="font-medium">{{ selectedProperty?.name }}</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Quien entrega:</span>
              <span class="font-medium">{{ form.deliverer_name }} (DNI: {{ form.deliverer_dni }})</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Quien recibe:</span>
              <span class="font-medium">{{ form.receiver_name }} (DNI: {{ form.receiver_dni }})</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Fecha de entrega:</span>
              <span class="font-medium">{{ formatDate(form.delivery_date) }}</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Elementos entregados:</span>
              <span class="font-medium">
                {{ form.keys_count }} llave(s)
                <template v-if="form.remotes_count > 0">, {{ form.remotes_count }} control(es)</template>
                <template v-if="form.tags_count > 0">, {{ form.tags_count }} tag(s)</template>
              </span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Asunción de gastos:</span>
              <span class="font-medium">{{ formatDate(form.expenses_from) }}</span>
            </div>
          </div>

          <div v-if="form.observations" class="p-4 bg-muted/30 rounded-lg">
            <h4 class="text-sm font-medium text-muted-foreground mb-2">Observaciones</h4>
            <p class="text-sm">{{ form.observations }}</p>
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
import { Textarea } from '@/components/ui/textarea'
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
import { useLegalDocumentPDF, type EntregaLlavesFormData } from '@/composables/useLegalDocumentPDF'
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
const { generateEntregaLlavesPDF, loading: generating, error: generationError } = useLegalDocumentPDF()

// Steps
const steps = ['Propiedad', 'Partes', 'Estado', 'Confirmar']
const stepDescriptions = [
  'Selecciona la propiedad',
  'Ingresa los datos de las partes',
  'Describe el estado del inmueble',
  'Revisa y genera el acta',
]
const currentStep = ref(0)

// Form state
const form = ref({
  property_id: '',
  deliverer_name: '',
  deliverer_dni: '',
  receiver_name: '',
  receiver_dni: '',
  delivery_date: new Date().toISOString().split('T')[0],
  property_condition: '',
  keys_count: 1,
  remotes_count: 0,
  tags_count: 0,
  meter_electricity: '',
  meter_gas: '',
  meter_water: '',
  expenses_from: new Date().toISOString().split('T')[0],
  observations: '',
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Data state
const selectedProperty = ref<Property | null>(null)
const ownerData = ref<Owner | null>(null)

// Computed
const availableProperties = computed(() => {
  // All active properties
  return properties.value
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
      if (!form.value.property_id || !selectedProperty.value) {
        errors.property_id = 'Selecciona una propiedad'
      }
      break
    case 1:
      if (!form.value.deliverer_name.trim()) {
        errors.deliverer_name = 'Ingresa el nombre de quien entrega'
      }
      if (!form.value.deliverer_dni.trim()) {
        errors.deliverer_dni = 'Ingresa el DNI de quien entrega'
      }
      if (!form.value.receiver_name.trim()) {
        errors.receiver_name = 'Ingresa el nombre de quien recibe'
      }
      if (!form.value.receiver_dni.trim()) {
        errors.receiver_dni = 'Ingresa el DNI de quien recibe'
      }
      if (!form.value.delivery_date) {
        errors.delivery_date = 'Selecciona la fecha de entrega'
      }
      break
    case 2:
      if (!form.value.property_condition.trim()) {
        errors.property_condition = 'Describe el estado del inmueble'
      }
      if (form.value.keys_count < 0) {
        errors.keys_count = 'La cantidad de llaves no puede ser negativa'
      }
      if (!form.value.expenses_from) {
        errors.expenses_from = 'Selecciona la fecha de asunción de gastos'
      }
      break
    case 3:
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

  // Pre-fill deliverer data from owner if available
  if (property?.owner_id) {
    const owner = await fetchOwnerById(property.owner_id)
    ownerData.value = owner
    if (owner) {
      form.value.deliverer_name = owner.full_name
      form.value.deliverer_dni = owner.cuit_cuil || ''
    }
  } else {
    ownerData.value = null
  }
}

async function generateDocument() {
  if (!selectedProperty.value) return

  const formData: EntregaLlavesFormData = {
    property_id: form.value.property_id,
    property: {
      name: selectedProperty.value.name,
      address_street: selectedProperty.value.address_street,
      address_number: selectedProperty.value.address_number,
      address_city: selectedProperty.value.address_city,
      address_state: selectedProperty.value.address_state,
    },
    deliverer: {
      full_name: form.value.deliverer_name,
      dni: form.value.deliverer_dni,
    },
    receiver: {
      full_name: form.value.receiver_name,
      dni: form.value.receiver_dni,
    },
    delivery_date: form.value.delivery_date,
    keys_count: form.value.keys_count,
    remotes_count: form.value.remotes_count,
    tags_count: form.value.tags_count,
    property_condition: form.value.property_condition,
    meter_readings: {
      electricity: form.value.meter_electricity || undefined,
      gas: form.value.meter_gas || undefined,
      water: form.value.meter_water || undefined,
    },
    observations: form.value.observations,
    expenses_from: form.value.expenses_from,
  }

  const storagePath = await generateEntregaLlavesPDF(formData)

  if (storagePath) {
    toast.success('Acta de entrega generada correctamente')
    emit('success')
    emit('update:open', false)
  }
}

function resetForm() {
  currentStep.value = 0
  clearErrors()
  const today = new Date().toISOString().split('T')[0]
  form.value = {
    property_id: '',
    deliverer_name: '',
    deliverer_dni: '',
    receiver_name: '',
    receiver_dni: '',
    delivery_date: today,
    property_condition: '',
    keys_count: 1,
    remotes_count: 0,
    tags_count: 0,
    meter_electricity: '',
    meter_gas: '',
    meter_water: '',
    expenses_from: today,
    observations: '',
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
  }
})

// Watch property selection
watch(() => form.value.property_id, (propertyId) => {
  if (propertyId) {
    loadPropertyOwner(propertyId)
  }
})

// Sync expenses_from with delivery_date
watch(() => form.value.delivery_date, (newVal) => {
  if (newVal) {
    form.value.expenses_from = newVal
  }
})
</script>
