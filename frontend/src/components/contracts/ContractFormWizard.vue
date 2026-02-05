<template>
  <div class="space-y-6">
    <!-- Stepper -->
    <div class="flex items-center justify-between mb-8">
      <div
        v-for="(step, index) in steps"
        :key="index"
        class="flex items-center"
        :class="{ 'flex-1': index < steps.length - 1 }"
      >
        <!-- Step circle -->
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

        <!-- Step label (hidden on mobile) -->
        <span
          class="ml-2 text-sm hidden lg:inline"
          :class="index <= currentStep ? 'text-foreground' : 'text-muted-foreground'"
        >
          {{ step.label }}
        </span>

        <!-- Connector line -->
        <div
          v-if="index < steps.length - 1"
          class="flex-1 h-0.5 mx-2"
          :class="index < currentStep ? 'bg-primary' : 'bg-muted'"
        />
      </div>
    </div>

    <!-- Step Content -->
    <form @submit.prevent="handleNext">
      <!-- Step 1: Property & Type -->
      <div v-show="currentStep === 0" class="space-y-4">
        <h3 class="text-lg font-medium">Propiedad y Tipo de Contrato</h3>

        <div class="space-y-2">
          <Label for="property_id">Propiedad *</Label>
          <Select v-model="form.property_id" :disabled="mode === 'edit'">
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar propiedad" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  v-for="prop in availableProperties"
                  :key="prop.id"
                  :value="prop.id"
                >
                  {{ formatPropertyOption(prop) }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <p v-if="mode === 'edit'" class="text-sm text-muted-foreground">
            La propiedad no puede ser modificada después de crear el contrato.
          </p>
        </div>

        <div class="space-y-2">
          <Label for="contract_type">Tipo de Contrato *</Label>
          <Select v-model="form.contract_type">
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="vivienda">Vivienda</SelectItem>
                <SelectItem value="comercial">Comercial</SelectItem>
                <SelectItem value="cochera">Cochera</SelectItem>
                <SelectItem value="oficina">Oficina</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <!-- Step 2: Dates -->
      <div v-show="currentStep === 1" class="space-y-4">
        <h3 class="text-lg font-medium">Fechas y Duración</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="start_date">Fecha de Inicio *</Label>
            <Input
              id="start_date"
              v-model="form.start_date"
              type="date"
              :min="minStartDate"
              :disabled="mode === 'edit' && contractStarted"
            />
          </div>

          <div class="space-y-2">
            <Label for="duration_months">Duración (meses) *</Label>
            <Input
              id="duration_months"
              v-model.number="form.duration_months"
              type="number"
              min="1"
              max="120"
              placeholder="36"
            />
          </div>
        </div>

        <div class="p-4 bg-muted rounded-lg">
          <p class="text-sm font-medium">Fecha de Finalización:</p>
          <p class="text-lg font-bold text-primary">{{ calculatedEndDate }}</p>
        </div>

        <div class="space-y-2">
          <Label for="first_payment_date">Fecha del Primer Pago *</Label>
          <Input
            id="first_payment_date"
            v-model="form.first_payment_date"
            type="date"
          />
          <p class="text-sm text-muted-foreground">
            Puede diferir de la fecha de inicio del contrato.
          </p>
        </div>
      </div>

      <!-- Step 3: Financial -->
      <div v-show="currentStep === 2" class="space-y-4">
        <h3 class="text-lg font-medium">Términos Financieros</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="base_rent_amount">Alquiler Base (ARS) *</Label>
            <Input
              id="base_rent_amount"
              v-model.number="form.base_rent_amount"
              type="number"
              min="0"
              step="100"
              placeholder="650000"
            />
          </div>

          <div class="space-y-2">
            <Label for="deposit_amount">Depósito (ARS) *</Label>
            <Input
              id="deposit_amount"
              v-model.number="form.deposit_amount"
              type="number"
              min="0"
              step="100"
              placeholder="650000"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="payment_due_day">Día de Pago del Mes (1-28) *</Label>
          <Input
            id="payment_due_day"
            v-model.number="form.payment_due_day"
            type="number"
            min="1"
            max="28"
            placeholder="10"
          />
          <p class="text-sm text-muted-foreground">
            Día del mes en que vence el pago del alquiler.
          </p>
        </div>

        <Separator class="my-4" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="adjustment_type">Tipo de Ajuste *</Label>
            <Select v-model="form.adjustment_type">
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="IPC">IPC (Índice de Precios al Consumidor)</SelectItem>
                  <SelectItem value="ICL">ICL (Índice de Contratos de Locación)</SelectItem>
                  <SelectItem value="fijo">Fijo</SelectItem>
                  <SelectItem value="ninguno">Sin Ajuste</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="adjustment_period">Frecuencia de Ajuste</Label>
            <Select v-model="form.adjustment_period" :disabled="form.adjustment_type === 'ninguno'">
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="space-y-2">
          <Label for="late_payment_interest_rate">Interés por Mora (% diario) *</Label>
          <Input
            id="late_payment_interest_rate"
            v-model.number="form.late_payment_interest_rate"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0.5"
          />
          <p class="text-sm text-muted-foreground">
            Porcentaje de interés diario aplicado a pagos atrasados.
          </p>
        </div>
      </div>

      <!-- Step 4: Tenants -->
      <div v-show="currentStep === 3" class="space-y-4">
        <h3 class="text-lg font-medium">Inquilinos</h3>

        <div class="space-y-2">
          <Label for="titular_id">Titular del Contrato *</Label>
          <Select v-model="form.titular_id">
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar inquilino" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem
                  v-for="tenant in availableTenants"
                  :key="tenant.id"
                  :value="tenant.id"
                >
                  {{ tenant.first_name }} {{ tenant.last_name }}
                  <span class="text-muted-foreground ml-2">{{ tenant.phone }}</span>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>Co-titulares (opcional)</Label>
          <div class="space-y-2">
            <div
              v-for="tenant in availableTenants.filter(t => t.id !== form.titular_id)"
              :key="tenant.id"
              class="flex items-center space-x-2"
            >
              <Checkbox
                :id="`co_titular_${tenant.id}`"
                :checked="form.co_titular_ids.includes(tenant.id)"
                @update:checked="toggleCoTitular(tenant.id, $event)"
              />
              <Label :for="`co_titular_${tenant.id}`" class="font-normal cursor-pointer">
                {{ tenant.first_name }} {{ tenant.last_name }}
                <span class="text-muted-foreground">- {{ tenant.phone }}</span>
              </Label>
            </div>
          </div>
          <p v-if="availableTenants.length === 0" class="text-sm text-muted-foreground">
            No hay inquilinos disponibles. Crea uno primero en la sección de Inquilinos.
          </p>
        </div>
      </div>

      <!-- Step 5: Guarantors -->
      <div v-show="currentStep === 4" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-medium">Garantes</h3>
          <Button type="button" variant="outline" size="sm" @click="addGuarantor">
            <Plus class="w-4 h-4 mr-2" />
            Agregar Garante
          </Button>
        </div>

        <p class="text-sm text-muted-foreground">
          Se requiere al menos un garante para el contrato.
        </p>

        <div v-if="form.guarantors.length === 0" class="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
          <Users class="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay garantes agregados.</p>
          <Button type="button" variant="outline" class="mt-4" @click="addGuarantor">
            Agregar Primer Garante
          </Button>
        </div>

        <div v-for="(guarantor, index) in form.guarantors" :key="index" class="border rounded-lg p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h4 class="font-medium">Garante {{ index + 1 }}</h4>
            <Button type="button" variant="ghost" size="sm" @click="removeGuarantor(index)">
              <X class="w-4 h-4" />
            </Button>
          </div>

          <div class="space-y-2">
            <Label>Tipo de Garante *</Label>
            <Select v-model="guarantor.type" @update:modelValue="resetGuarantorFields(index, $event)">
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="persona_fisica">Persona Física</SelectItem>
                  <SelectItem value="finaer">FINAER</SelectItem>
                  <SelectItem value="propiedad">Propiedad en Garantía</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <!-- Persona Física Fields -->
          <template v-if="guarantor.type === 'persona_fisica'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>Nombre Completo *</Label>
                <Input v-model="(guarantor as GuarantorPersonaFisica).full_name" placeholder="Juan Pérez" />
              </div>
              <div class="space-y-2">
                <Label>DNI *</Label>
                <Input v-model="(guarantor as GuarantorPersonaFisica).dni" placeholder="12345678" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>CUIL *</Label>
                <Input v-model="(guarantor as GuarantorPersonaFisica).cuil" placeholder="20-12345678-9" />
              </div>
              <div class="space-y-2">
                <Label>Teléfono</Label>
                <Input v-model="(guarantor as GuarantorPersonaFisica).phone" placeholder="+54 11 1234-5678" />
              </div>
            </div>
            <div class="space-y-2">
              <Label>Dirección</Label>
              <Input v-model="(guarantor as GuarantorPersonaFisica).address" placeholder="Av. Corrientes 1234, CABA" />
            </div>
          </template>

          <!-- FINAER Fields -->
          <template v-if="guarantor.type === 'finaer'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>Empresa *</Label>
                <Input v-model="(guarantor as GuarantorFinaer).company_name" placeholder="FINAER SA" />
              </div>
              <div class="space-y-2">
                <Label>CUIT *</Label>
                <Input v-model="(guarantor as GuarantorFinaer).cuit" placeholder="30-71528749-4" />
              </div>
            </div>
            <div class="space-y-2">
              <Label>Código de Garantía *</Label>
              <Input v-model="(guarantor as GuarantorFinaer).guarantee_code" placeholder="A-8G7VX8" />
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>Nombre del Representante *</Label>
                <Input v-model="(guarantor as GuarantorFinaer).representative_name" placeholder="María González" />
              </div>
              <div class="space-y-2">
                <Label>DNI del Representante *</Label>
                <Input v-model="(guarantor as GuarantorFinaer).representative_dni" placeholder="23456789" />
              </div>
            </div>
          </template>

          <!-- Propiedad Fields -->
          <template v-if="guarantor.type === 'propiedad'">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>Nombre del Garante *</Label>
                <Input v-model="(guarantor as GuarantorPropiedad).guarantor_name" placeholder="Carlos Rodríguez" />
              </div>
              <div class="space-y-2">
                <Label>DNI del Garante *</Label>
                <Input v-model="(guarantor as GuarantorPropiedad).guarantor_dni" placeholder="34567890" />
              </div>
            </div>
            <div class="space-y-2">
              <Label>CUIL del Garante</Label>
              <Input v-model="(guarantor as GuarantorPropiedad).guarantor_cuil" placeholder="20-34567890-1" />
            </div>
            <div class="space-y-2">
              <Label>Dirección de la Propiedad *</Label>
              <Textarea v-model="(guarantor as GuarantorPropiedad).property_address" placeholder="Av. Libertador 1234, CABA" rows="2" />
            </div>
            <div class="space-y-2">
              <Label>Datos Catastrales *</Label>
              <Textarea v-model="(guarantor as GuarantorPropiedad).cadastral_data" placeholder="Circ III, Sec K, Manzana 45, Parcela 2" rows="2" />
            </div>
            <div class="space-y-2">
              <Label>Detalles Catastrales</Label>
              <Input v-model="(guarantor as GuarantorPropiedad).cadastral_details" placeholder="Partida 123-456-789" />
            </div>
          </template>
        </div>
      </div>

      <!-- Step 6: Special Clauses -->
      <div v-show="currentStep === 5" class="space-y-4">
        <h3 class="text-lg font-medium">Cláusulas Especiales</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="early_termination_penalty_months">Penalidad por Rescisión Anticipada *</Label>
            <Input
              id="early_termination_penalty_months"
              v-model.number="form.early_termination_penalty_months"
              type="number"
              min="0"
              max="12"
              step="0.5"
              placeholder="1.5"
            />
            <p class="text-sm text-muted-foreground">
              Meses de alquiler como penalidad por terminar el contrato antes de tiempo.
            </p>
          </div>

          <div class="space-y-2">
            <Label for="non_return_penalty_rate">Penalidad por No Devolución (% diario) *</Label>
            <Input
              id="non_return_penalty_rate"
              v-model.number="form.non_return_penalty_rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="10"
            />
            <p class="text-sm text-muted-foreground">
              Porcentaje diario si no se devuelve la propiedad al finalizar el contrato.
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2">
          <Checkbox
            id="insurance_required"
            :checked="form.insurance_required"
            @update:checked="form.insurance_required = $event"
          />
          <Label for="insurance_required" class="font-normal cursor-pointer">
            Seguro de inquilino requerido
          </Label>
        </div>

        <div class="space-y-2">
          <Label for="notes">Notas Adicionales</Label>
          <Textarea
            id="notes"
            v-model="form.notes"
            placeholder="Cláusulas especiales, acuerdos adicionales, observaciones..."
            rows="4"
          />
        </div>
      </div>

      <!-- Step 7: Review -->
      <div v-show="currentStep === 6" class="space-y-4">
        <h3 class="text-lg font-medium">Resumen del Contrato</h3>

        <!-- Property Card -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-muted-foreground">Propiedad</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="font-medium">{{ selectedPropertyAddress }}</p>
            <Badge class="mt-2">{{ contractTypeLabels[form.contract_type] }}</Badge>
          </CardContent>
        </Card>

        <!-- Dates Card -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-muted-foreground">Fechas</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="flex justify-between">
              <span>Inicio:</span>
              <span class="font-medium">{{ formatDate(form.start_date) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Fin:</span>
              <span class="font-medium">{{ calculatedEndDate }}</span>
            </div>
            <div class="flex justify-between">
              <span>Duración:</span>
              <span class="font-medium">{{ form.duration_months }} meses</span>
            </div>
            <div class="flex justify-between">
              <span>Primer Pago:</span>
              <span class="font-medium">{{ formatDate(form.first_payment_date) }}</span>
            </div>
          </CardContent>
        </Card>

        <!-- Financial Card -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-muted-foreground">Términos Financieros</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="flex justify-between">
              <span>Alquiler:</span>
              <span class="font-medium text-lg">{{ formatCurrency(form.base_rent_amount) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Depósito:</span>
              <span class="font-medium">{{ formatCurrency(form.deposit_amount) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Día de Pago:</span>
              <span class="font-medium">Día {{ form.payment_due_day }}</span>
            </div>
            <div class="flex justify-between">
              <span>Ajuste:</span>
              <span class="font-medium">{{ form.adjustment_type }} {{ adjustmentPeriodLabels[form.adjustment_period] || '' }}</span>
            </div>
            <div class="flex justify-between">
              <span>Interés por Mora:</span>
              <span class="font-medium">{{ form.late_payment_interest_rate }}% diario</span>
            </div>
          </CardContent>
        </Card>

        <!-- Tenants Card -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-muted-foreground">Inquilinos</CardTitle>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div>
                <span class="text-muted-foreground">Titular:</span>
                <span class="ml-2 font-medium">{{ selectedTitularName }}</span>
              </div>
              <div v-if="form.co_titular_ids.length > 0">
                <span class="text-muted-foreground">Co-titulares:</span>
                <span class="ml-2">{{ selectedCoTitularNames }}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Guarantors Card -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-muted-foreground">Garantes ({{ form.guarantors.length }})</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-for="(guarantor, index) in form.guarantors" :key="index" class="flex items-center gap-2 mb-2">
              <Badge variant="outline">{{ guarantorTypeLabels[guarantor.type] }}</Badge>
              <span>{{ getGuarantorDisplayName(guarantor) }}</span>
            </div>
          </CardContent>
        </Card>

        <!-- Special Clauses Card -->
        <Card>
          <CardHeader class="pb-2">
            <CardTitle class="text-sm text-muted-foreground">Cláusulas Especiales</CardTitle>
          </CardHeader>
          <CardContent class="space-y-2">
            <div class="flex justify-between">
              <span>Penalidad por Rescisión:</span>
              <span class="font-medium">{{ form.early_termination_penalty_months }} meses</span>
            </div>
            <div class="flex justify-between">
              <span>Penalidad por No Devolución:</span>
              <span class="font-medium">{{ form.non_return_penalty_rate }}% diario</span>
            </div>
            <div class="flex justify-between">
              <span>Seguro Requerido:</span>
              <span class="font-medium">{{ form.insurance_required ? 'Sí' : 'No' }}</span>
            </div>
            <div v-if="form.notes" class="pt-2">
              <span class="text-muted-foreground">Notas:</span>
              <p class="mt-1 text-sm">{{ form.notes }}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Navigation Buttons -->
      <div class="flex justify-between pt-6 border-t mt-6">
        <Button
          type="button"
          variant="outline"
          @click="handleBack"
          :disabled="currentStep === 0"
        >
          <ChevronLeft class="w-4 h-4 mr-2" />
          Anterior
        </Button>

        <div class="flex gap-2">
          <Button type="button" variant="ghost" @click="$emit('cancel')">
            Cancelar
          </Button>

          <Button
            v-if="currentStep < steps.length - 1"
            type="submit"
            :disabled="!isCurrentStepValid"
          >
            Siguiente
            <ChevronRight class="w-4 h-4 ml-2" />
          </Button>

          <Button
            v-else
            type="button"
            @click="handleSubmit"
            :disabled="isSubmitting"
          >
            <Loader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
            {{ mode === 'edit' ? 'Actualizar Contrato' : 'Crear Contrato' }}
          </Button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Users,
  Loader2,
} from 'lucide-vue-next'
import { useProperties } from '@/composables/useProperties'
import { useTenants } from '@/composables/useTenants'
import { useContracts } from '@/composables/useContracts'
import type {
  Contract,
  ContractFormData,
  ContractType,
  AdjustmentType,
  AdjustmentPeriod,
  Property,
  Tenant,
  Guarantor,
  GuarantorPersonaFisica,
  GuarantorFinaer,
  GuarantorPropiedad,
  GuarantorType,
} from '@/types'

interface Props {
  contract?: Contract | null
  mode: 'create' | 'edit'
}

const props = withDefaults(defineProps<Props>(), {
  contract: null,
  mode: 'create',
})

const emit = defineEmits<{
  submit: [data: ContractFormData]
  cancel: []
}>()

const { properties, fetchProperties } = useProperties()
const { tenants, fetchTenants } = useTenants()
const { calculateEndDate } = useContracts()

const currentStep = ref(0)
const isSubmitting = ref(false)

const steps = [
  { label: 'Propiedad' },
  { label: 'Fechas' },
  { label: 'Financiero' },
  { label: 'Inquilinos' },
  { label: 'Garantes' },
  { label: 'Cláusulas' },
  { label: 'Resumen' },
]

// Form state
const form = ref<ContractFormData>({
  property_id: '',
  contract_type: 'vivienda',
  start_date: new Date().toISOString().split('T')[0],
  duration_months: 36,
  end_date: '',
  first_payment_date: new Date().toISOString().split('T')[0],
  base_rent_amount: 0,
  deposit_amount: 0,
  payment_due_day: 10,
  adjustment_type: 'IPC',
  adjustment_period: 'trimestral',
  late_payment_interest_rate: 0.5,
  titular_id: '',
  co_titular_ids: [],
  guarantors: [],
  early_termination_penalty_months: 1.5,
  non_return_penalty_rate: 10,
  insurance_required: true,
  notes: '',
})

// Labels
const contractTypeLabels: Record<ContractType, string> = {
  vivienda: 'Vivienda',
  comercial: 'Comercial',
  cochera: 'Cochera',
  oficina: 'Oficina',
}

const adjustmentPeriodLabels: Record<AdjustmentPeriod, string> = {
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}

const guarantorTypeLabels: Record<GuarantorType, string> = {
  persona_fisica: 'Persona Física',
  finaer: 'FINAER',
  propiedad: 'Propiedad en Garantía',
}

// Computed
const minStartDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const contractStarted = computed(() => {
  if (!props.contract) return false
  return new Date(props.contract.start_date) <= new Date()
})

const calculatedEndDate = computed(() => {
  if (!form.value.start_date || !form.value.duration_months) return '-'
  const endDate = calculateEndDate(form.value.start_date, form.value.duration_months)
  return formatDate(endDate)
})

const availableProperties = computed(() => {
  if (props.mode === 'edit' && props.contract) {
    // In edit mode, show the current property
    return properties.value.filter(
      p => p.id === props.contract?.property_id || p.status === 'disponible'
    )
  }
  // In create mode, only show available properties
  return properties.value.filter(p => p.status === 'disponible')
})

const availableTenants = computed(() => {
  return tenants.value.filter(t => t.status === 'activo')
})

const selectedPropertyAddress = computed(() => {
  const prop = properties.value.find(p => p.id === form.value.property_id)
  if (!prop) return 'No seleccionada'
  return formatPropertyOption(prop)
})

const selectedTitularName = computed(() => {
  const tenant = tenants.value.find(t => t.id === form.value.titular_id)
  if (!tenant) return 'No seleccionado'
  return `${tenant.first_name} ${tenant.last_name}`
})

const selectedCoTitularNames = computed(() => {
  return form.value.co_titular_ids
    .map(id => {
      const tenant = tenants.value.find(t => t.id === id)
      return tenant ? `${tenant.first_name} ${tenant.last_name}` : ''
    })
    .filter(Boolean)
    .join(', ')
})

const isCurrentStepValid = computed(() => {
  switch (currentStep.value) {
    case 0: // Property & Type
      return !!form.value.property_id && !!form.value.contract_type
    case 1: // Dates
      return !!form.value.start_date && form.value.duration_months > 0 && !!form.value.first_payment_date
    case 2: // Financial
      return (
        form.value.base_rent_amount > 0 &&
        form.value.deposit_amount >= 0 &&
        form.value.payment_due_day >= 1 &&
        form.value.payment_due_day <= 28 &&
        !!form.value.adjustment_type
      )
    case 3: // Tenants
      return !!form.value.titular_id
    case 4: // Guarantors
      return form.value.guarantors.length > 0 && areGuarantorsValid()
    case 5: // Special Clauses
      return (
        form.value.early_termination_penalty_months >= 0 &&
        form.value.non_return_penalty_rate >= 0
      )
    case 6: // Review
      return true
    default:
      return false
  }
})

// Methods
function formatPropertyOption(prop: Property): string {
  let address = prop.address_street
  if (prop.address_number) address += ` ${prop.address_number}`
  if (prop.address_floor) address += `, Piso ${prop.address_floor}`
  if (prop.address_apartment) address += `, Depto ${prop.address_apartment}`
  return address
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStepClass(index: number): string {
  if (index < currentStep.value) {
    return 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90'
  }
  if (index === currentStep.value) {
    return 'bg-primary text-primary-foreground'
  }
  return 'bg-muted text-muted-foreground'
}

function goToStep(index: number) {
  if (index < currentStep.value) {
    currentStep.value = index
  }
}

function handleBack() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function handleNext() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  }
}

function toggleCoTitular(tenantId: string, checked: boolean) {
  if (checked) {
    if (!form.value.co_titular_ids.includes(tenantId)) {
      form.value.co_titular_ids.push(tenantId)
    }
  } else {
    form.value.co_titular_ids = form.value.co_titular_ids.filter(id => id !== tenantId)
  }
}

function addGuarantor() {
  const newGuarantor: GuarantorPersonaFisica = {
    type: 'persona_fisica',
    full_name: '',
    dni: '',
    cuil: '',
    phone: '',
    address: '',
  }
  form.value.guarantors.push(newGuarantor)
}

function removeGuarantor(index: number) {
  form.value.guarantors.splice(index, 1)
}

function resetGuarantorFields(index: number, newType: GuarantorType) {
  if (newType === 'persona_fisica') {
    form.value.guarantors[index] = {
      type: 'persona_fisica',
      full_name: '',
      dni: '',
      cuil: '',
      phone: '',
      address: '',
    }
  } else if (newType === 'finaer') {
    form.value.guarantors[index] = {
      type: 'finaer',
      company_name: 'FINAER SA',
      cuit: '',
      guarantee_code: '',
      representative_name: '',
      representative_dni: '',
    }
  } else if (newType === 'propiedad') {
    form.value.guarantors[index] = {
      type: 'propiedad',
      guarantor_name: '',
      guarantor_dni: '',
      guarantor_cuil: '',
      property_address: '',
      cadastral_data: '',
      cadastral_details: '',
    }
  }
}

function areGuarantorsValid(): boolean {
  for (const g of form.value.guarantors) {
    if (g.type === 'persona_fisica') {
      const gf = g as GuarantorPersonaFisica
      if (!gf.full_name || !gf.dni || !gf.cuil) return false
    } else if (g.type === 'finaer') {
      const gf = g as GuarantorFinaer
      if (!gf.company_name || !gf.cuit || !gf.guarantee_code || !gf.representative_name || !gf.representative_dni) return false
    } else if (g.type === 'propiedad') {
      const gf = g as GuarantorPropiedad
      if (!gf.guarantor_name || !gf.guarantor_dni || !gf.property_address || !gf.cadastral_data) return false
    }
  }
  return true
}

function getGuarantorDisplayName(guarantor: Guarantor): string {
  if (guarantor.type === 'persona_fisica') {
    return (guarantor as GuarantorPersonaFisica).full_name || 'Sin nombre'
  } else if (guarantor.type === 'finaer') {
    return (guarantor as GuarantorFinaer).company_name || 'Sin empresa'
  } else if (guarantor.type === 'propiedad') {
    return (guarantor as GuarantorPropiedad).guarantor_name || 'Sin garante'
  }
  return 'Desconocido'
}

function handleSubmit() {
  if (!isCurrentStepValid.value) return

  // Calculate end_date before submitting
  form.value.end_date = calculateEndDate(form.value.start_date, form.value.duration_months)

  isSubmitting.value = true
  emit('submit', { ...form.value })
}

// Initialize form with existing contract data in edit mode
watch(
  () => props.contract,
  (contract) => {
    if (contract && props.mode === 'edit') {
      // Calculate duration from dates
      const startDate = new Date(contract.start_date)
      const endDate = new Date(contract.end_date)
      const durationMonths = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      )

      form.value = {
        property_id: contract.property_id,
        contract_type: contract.contract_type,
        start_date: contract.start_date,
        duration_months: durationMonths,
        end_date: contract.end_date,
        first_payment_date: contract.first_payment_date || contract.start_date,
        base_rent_amount: contract.base_rent_amount,
        deposit_amount: contract.deposit_amount || 0,
        payment_due_day: contract.payment_due_day,
        adjustment_type: contract.adjustment_type || 'ninguno',
        adjustment_period: contract.adjustment_period || 'trimestral',
        late_payment_interest_rate: contract.late_payment_interest_rate,
        titular_id: '', // Will be set from tenants relation
        co_titular_ids: [],
        guarantors: contract.guarantors || [],
        early_termination_penalty_months: contract.early_termination_penalty_months,
        non_return_penalty_rate: contract.non_return_penalty_rate,
        insurance_required: contract.insurance_required,
        notes: contract.notes || '',
      }

      // Set tenant IDs from relations
      if (contract.tenants) {
        const titular = contract.tenants.find(ct => ct.role === 'titular')
        if (titular) {
          form.value.titular_id = titular.tenant_id
        }
        form.value.co_titular_ids = contract.tenants
          .filter(ct => ct.role === 'co_titular')
          .map(ct => ct.tenant_id)
      }
    }
  },
  { immediate: true }
)

// Fetch properties and tenants on mount
onMounted(async () => {
  await Promise.all([
    fetchProperties(),
    fetchTenants(),
  ])
})
</script>
