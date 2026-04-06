<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Boleto de Compraventa</DialogTitle>
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
              No hay propiedades disponibles para venta
            </p>
          </div>

          <!-- Seller Info (auto-loaded from owner) -->
          <div v-if="selectedProperty && sellerData" class="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 class="text-sm font-medium text-muted-foreground">Datos del Vendedor (Propietario)</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-muted-foreground">Nombre:</span>
                <span class="ml-2 font-medium">{{ sellerData.full_name }}</span>
              </div>
              <div>
                <span class="text-muted-foreground">DNI/CUIT:</span>
                <span class="ml-2 font-medium">{{ sellerData.cuit_cuil || 'No especificado' }}</span>
              </div>
              <div class="md:col-span-2">
                <span class="text-muted-foreground">Domicilio:</span>
                <span class="ml-2 font-medium">{{ sellerData.address || 'No especificado' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Buyer Data -->
        <div v-show="currentStep === 1" class="space-y-4">
          <h3 class="text-lg font-medium">Datos del Comprador</h3>

          <div class="space-y-2">
            <Label for="buyer_name">Nombre completo *</Label>
            <Input
              id="buyer_name"
              v-model="form.buyer_name"
              placeholder="Ej: Juan Pérez"
              :class="{ 'border-destructive': errors.buyer_name }"
            />
            <p v-if="errors.buyer_name" class="text-sm text-destructive">{{ errors.buyer_name }}</p>
          </div>

          <div class="space-y-2">
            <Label for="buyer_dni">DNI/CUIT *</Label>
            <Input
              id="buyer_dni"
              v-model="form.buyer_dni"
              placeholder="Ej: 30123456"
              :class="{ 'border-destructive': errors.buyer_dni }"
            />
            <p v-if="errors.buyer_dni" class="text-sm text-destructive">{{ errors.buyer_dni }}</p>
          </div>

          <div class="space-y-2">
            <Label for="buyer_address">Domicilio *</Label>
            <Input
              id="buyer_address"
              v-model="form.buyer_address"
              placeholder="Ej: Av. Corrientes 1234, CABA"
              :class="{ 'border-destructive': errors.buyer_address }"
            />
            <p v-if="errors.buyer_address" class="text-sm text-destructive">{{ errors.buyer_address }}</p>
          </div>
        </div>

        <!-- Step 3: Sale Conditions -->
        <div v-show="currentStep === 2" class="space-y-4">
          <h3 class="text-lg font-medium">Condiciones de la Venta</h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="price">Precio de venta *</Label>
              <Input
                id="price"
                v-model.number="form.price"
                type="number"
                min="0"
                step="1000"
                placeholder="Ej: 100000"
                :class="{ 'border-destructive': errors.price }"
              />
              <p v-if="errors.price" class="text-sm text-destructive">{{ errors.price }}</p>
            </div>
            <div class="space-y-2">
              <Label for="currency">Moneda *</Label>
              <Select v-model="form.currency">
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                    <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="payment_conditions">Condiciones de pago *</Label>
            <Textarea
              id="payment_conditions"
              v-model="form.payment_conditions"
              placeholder="Detalle las condiciones de pago (seña, cuotas, forma de pago, etc.)"
              rows="3"
              :class="{ 'border-destructive': errors.payment_conditions }"
            />
            <p v-if="errors.payment_conditions" class="text-sm text-destructive">{{ errors.payment_conditions }}</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="possession_date">Fecha de posesión *</Label>
              <Input
                id="possession_date"
                v-model="form.possession_date"
                type="date"
                :class="{ 'border-destructive': errors.possession_date }"
              />
              <p v-if="errors.possession_date" class="text-sm text-destructive">{{ errors.possession_date }}</p>
            </div>
            <div class="space-y-2">
              <Label for="escritura_date">Fecha de escrituración *</Label>
              <Input
                id="escritura_date"
                v-model="form.escritura_date"
                type="date"
                :min="form.possession_date"
                :class="{ 'border-destructive': errors.escritura_date }"
              />
              <p v-if="errors.escritura_date" class="text-sm text-destructive">{{ errors.escritura_date }}</p>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="penalty_clause">Cláusula penal *</Label>
            <Textarea
              id="penalty_clause"
              v-model="form.penalty_clause"
              rows="3"
              :class="{ 'border-destructive': errors.penalty_clause }"
            />
            <p v-if="errors.penalty_clause" class="text-sm text-destructive">{{ errors.penalty_clause }}</p>
            <p v-else class="text-xs text-muted-foreground">
              Se ha pre-cargado una cláusula estándar. Puede modificarla según sea necesario.
            </p>
          </div>
        </div>

        <!-- Step 4: Confirm -->
        <div v-show="currentStep === 3" class="space-y-4">
          <h3 class="text-lg font-medium">Resumen del Boleto</h3>

          <!-- Warning Banner -->
          <div class="flex items-start gap-3 p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 rounded-lg">
            <AlertTriangle class="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-yellow-700 dark:text-yellow-400">
              <p class="font-medium">Atención</p>
              <p>Al generar este documento, la propiedad quedará marcada como vendida.</p>
            </div>
          </div>

          <div class="p-4 bg-muted/50 rounded-lg space-y-3">
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Propiedad:</span>
              <span class="font-medium">{{ selectedProperty?.name }}</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Vendedor:</span>
              <span class="font-medium">{{ sellerData?.full_name }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Comprador:</span>
              <span class="font-medium">{{ form.buyer_name }}</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Precio:</span>
              <span class="font-medium">{{ formatPrice(form.price, form.currency) }}</span>
            </div>
            <Separator />
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Posesión:</span>
              <span class="font-medium">{{ formatDate(form.possession_date) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">Escrituración:</span>
              <span class="font-medium">{{ formatDate(form.escritura_date) }}</span>
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
import { Check, Loader2, AlertTriangle } from 'lucide-vue-next'
import { useProperties } from '@/composables/useProperties'
import { useOwners } from '@/composables/useOwners'
import { useLegalDocumentPDF, type BoletoFormData } from '@/composables/useLegalDocumentPDF'
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
const { generateBoletoPDF, loading: generating, error: generationError } = useLegalDocumentPDF()

// Default penalty clause (Argentine standard)
const DEFAULT_PENALTY_CLAUSE = `En caso de incumplimiento por cualquiera de las partes, la parte incumplidora deberá abonar a la parte cumplidora, en concepto de cláusula penal, una suma equivalente al DIEZ POR CIENTO (10%) del precio total de la operación, sin perjuicio de las acciones legales que correspondan para exigir el cumplimiento del contrato.`

// Steps
const steps = ['Propiedad', 'Comprador', 'Condiciones', 'Confirmar']
const stepDescriptions = [
  'Selecciona la propiedad a vender',
  'Ingresa los datos del comprador',
  'Define las condiciones de la venta',
  'Revisa y genera el boleto',
]
const currentStep = ref(0)

// Form state
const form = ref({
  property_id: '',
  buyer_name: '',
  buyer_dni: '',
  buyer_address: '',
  price: 0,
  currency: 'USD' as 'ARS' | 'USD',
  payment_conditions: '',
  possession_date: '',
  escritura_date: '',
  penalty_clause: DEFAULT_PENALTY_CLAUSE,
})

// Validation errors
const errors = reactive<Record<string, string>>({})

// Data state
const selectedProperty = ref<Property | null>(null)
const sellerData = ref<Owner | null>(null)

// Computed
const availableProperties = computed(() => {
  // Only properties for sale that are not sold
  return properties.value.filter(p => p.purpose === 'venta' && p.status !== 'vendida')
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
      if (!selectedProperty.value || !sellerData.value) {
        errors.property_id = 'Selecciona una propiedad con propietario'
      }
      break
    case 1:
      if (!form.value.buyer_name.trim()) {
        errors.buyer_name = 'Ingresa el nombre del comprador'
      }
      if (!form.value.buyer_dni.trim()) {
        errors.buyer_dni = 'Ingresa el DNI/CUIT del comprador'
      }
      if (!form.value.buyer_address.trim()) {
        errors.buyer_address = 'Ingresa el domicilio del comprador'
      }
      break
    case 2:
      if (!form.value.price || form.value.price <= 0) {
        errors.price = 'Ingresa un precio válido'
      }
      if (!form.value.payment_conditions.trim()) {
        errors.payment_conditions = 'Ingresa las condiciones de pago'
      }
      if (!form.value.possession_date) {
        errors.possession_date = 'Selecciona la fecha de posesión'
      }
      if (!form.value.escritura_date) {
        errors.escritura_date = 'Selecciona la fecha de escrituración'
      }
      if (!form.value.penalty_clause.trim()) {
        errors.penalty_clause = 'Ingresa la cláusula penal'
      }
      break
    case 3:
      // No validation needed on confirm step
      break
  }

  return Object.keys(errors).length === 0
}

function formatPrice(amount: number, currency: 'ARS' | 'USD'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
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
    sellerData.value = owner
  } else {
    sellerData.value = null
  }
}

async function generateDocument() {
  if (!selectedProperty.value || !sellerData.value) return

  const formData: BoletoFormData = {
    property_id: form.value.property_id,
    property: {
      name: selectedProperty.value.name,
      address_street: selectedProperty.value.address_street,
      address_number: selectedProperty.value.address_number,
      address_city: selectedProperty.value.address_city,
      address_state: selectedProperty.value.address_state,
    },
    seller: {
      full_name: sellerData.value.full_name,
      dni: sellerData.value.cuit_cuil || '',
      address: sellerData.value.address || '',
    },
    buyer: {
      full_name: form.value.buyer_name,
      dni: form.value.buyer_dni,
      address: form.value.buyer_address,
    },
    price: form.value.price,
    currency: form.value.currency,
    payment_conditions: form.value.payment_conditions,
    possession_date: form.value.possession_date,
    escritura_date: form.value.escritura_date,
    penalty_clause: form.value.penalty_clause,
  }

  const storagePath = await generateBoletoPDF(formData)

  if (storagePath) {
    toast.success('Boleto de compraventa generado correctamente')
    emit('success')
    emit('update:open', false)
  }
}

function resetForm() {
  currentStep.value = 0
  clearErrors()
  form.value = {
    property_id: '',
    buyer_name: '',
    buyer_dni: '',
    buyer_address: '',
    price: 0,
    currency: 'USD',
    payment_conditions: '',
    possession_date: '',
    escritura_date: '',
    penalty_clause: DEFAULT_PENALTY_CLAUSE,
  }
  selectedProperty.value = null
  sellerData.value = null
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

// Set default escritura date (60 days after possession)
watch(() => form.value.possession_date, (newVal) => {
  if (newVal && !form.value.escritura_date) {
    const date = new Date(newVal + 'T00:00:00')
    date.setDate(date.getDate() + 60)
    form.value.escritura_date = date.toISOString().split('T')[0]
  }
})
</script>
