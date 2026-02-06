<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
      <DialogHeader>
        <DialogTitle>Generar Contrato PDF</DialogTitle>
        <DialogDescription>
          Configure los datos del contrato y genere el documento PDF
        </DialogDescription>
      </DialogHeader>

      <!-- Progress Steps -->
      <div class="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg mb-4">
        <button
          v-for="(step, index) in steps"
          :key="index"
          class="flex items-center gap-2 px-3 py-1 rounded-md transition-colors"
          :class="{
            'bg-primary text-primary-foreground': currentStep === index,
            'text-muted-foreground hover:text-foreground': currentStep !== index,
            'cursor-pointer': index <= maxVisitedStep,
            'cursor-not-allowed opacity-50': index > maxVisitedStep
          }"
          @click="index <= maxVisitedStep && (currentStep = index)"
        >
          <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium"
            :class="{
              'border-primary-foreground bg-primary-foreground/20': currentStep === index,
              'border-muted-foreground': currentStep !== index
            }"
          >
            {{ index + 1 }}
          </span>
          <span class="hidden md:inline text-sm font-medium">{{ step.title }}</span>
        </button>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto px-1">
        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
          <span class="ml-3 text-muted-foreground">Cargando...</span>
        </div>

        <!-- Step 1: Property Description -->
        <div v-else-if="currentStep === 0" class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Descripción del Inmueble</CardTitle>
              <CardDescription>
                Esta descripción se utilizará en la cláusula PRIMERO del contrato.
                Detalle las características del inmueble.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                v-model="formData.property_description"
                placeholder="Ej: Se compone de Cocina-Comedor con muebles bajo mesada, horno empotrado, campana extractora. Living-comedor con balcón. Dos dormitorios con placard. Un baño completo con bañera. Lavadero independiente..."
                class="min-h-[200px]"
              />
              <p class="text-sm text-muted-foreground mt-2">
                {{ formData.property_description?.length || 0 }} caracteres
              </p>
            </CardContent>
          </Card>

          <!-- Property info preview -->
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Datos de la Propiedad</CardTitle>
            </CardHeader>
            <CardContent>
              <dl class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt class="text-muted-foreground">Dirección</dt>
                  <dd class="font-medium">{{ propertyAddress }}</dd>
                </div>
                <div>
                  <dt class="text-muted-foreground">Tipo de Contrato</dt>
                  <dd class="font-medium capitalize">{{ contract?.contract_type }}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <!-- Step 2: Financial & Legal Details -->
        <div v-else-if="currentStep === 1" class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Datos del Propietario</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label>CUIT/CUIL del Propietario</Label>
                  <Input
                    v-model="formData.owner_cuit"
                    placeholder="20-12345678-9"
                  />
                </div>
                <div class="space-y-2">
                  <Label>Domicilio Legal del Propietario</Label>
                  <Input
                    v-model="formData.owner_legal_address"
                    placeholder="Dirección completa para notificaciones"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Lugar y Horarios de Pago</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <Label>Lugar de Pago</Label>
                <Input
                  v-model="formData.payment_location"
                  placeholder="Ej: Olivera de Schwab Propiedades, Lincoln 3598, San Martín"
                />
              </div>
              <div class="space-y-2">
                <Label>Horario de Atención</Label>
                <Input
                  v-model="formData.payment_hours"
                  placeholder="Ej: 9:30 a 12:00 y 16:30 a 18:30"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Tasas de Interés y Penalidades</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label>Interés Diario por Mora (%)</Label>
                  <Input
                    v-model.number="formData.daily_interest_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  <p class="text-xs text-muted-foreground">
                    Porcentaje diario aplicado sobre saldos adeudados
                  </p>
                </div>
                <div class="space-y-2">
                  <Label>Penalidad Diaria por No Devolución (%)</Label>
                  <Input
                    v-model.number="formData.daily_penalty_rate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                  <p class="text-xs text-muted-foreground">
                    Porcentaje diario si el inmueble no se devuelve al vencer
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Step 3: Clause Review & Edit -->
        <div v-else-if="currentStep === 2" class="space-y-2">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-medium">Revisión de Cláusulas</h3>
              <p class="text-sm text-muted-foreground">
                Revise y edite las 24 cláusulas estándar del contrato.
                {{ isPluralVersion ? '(Versión plural - múltiples inquilinos)' : '(Versión singular - un inquilino)' }}
              </p>
            </div>
            <Badge v-if="Object.keys(formData.clause_overrides || {}).length > 0" variant="outline">
              {{ Object.keys(formData.clause_overrides || {}).length }} cláusulas modificadas
            </Badge>
          </div>

          <div class="space-y-2">
            <div
              v-for="clauseNum in 24"
              :key="clauseNum"
              class="border rounded-lg overflow-hidden"
            >
              <button
                type="button"
                class="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors"
                @click="toggleClause(clauseNum)"
              >
                <div class="flex items-center gap-3 text-left">
                  <span class="font-semibold text-sm">{{ getClauseKey(clauseNum) }}</span>
                  <span class="text-muted-foreground text-sm hidden md:inline">{{ getClauseTitle(clauseNum) }}</span>
                  <Badge
                    v-if="isClauseModified(clauseNum)"
                    variant="secondary"
                    class="text-xs"
                  >
                    Modificada
                  </Badge>
                </div>
                <ChevronDown
                  class="w-4 h-4 transition-transform"
                  :class="{ 'rotate-180': expandedClause === clauseNum }"
                />
              </button>
              <div
                v-if="expandedClause === clauseNum"
                class="p-4 border-t space-y-3"
              >
                <Textarea
                  :model-value="getClauseContent(clauseNum)"
                  @update:model-value="updateClause(clauseNum, $event)"
                  class="min-h-[150px] text-sm"
                />
                <div class="flex items-center justify-between">
                  <p class="text-xs text-muted-foreground">
                    {{ (getClauseContent(clauseNum) || '').length }} caracteres
                  </p>
                  <Button
                    v-if="isClauseModified(clauseNum)"
                    variant="ghost"
                    size="sm"
                    @click="resetClause(clauseNum)"
                  >
                    <RotateCcw class="w-4 h-4 mr-1" />
                    Restaurar Original
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Custom Clauses -->
        <div v-else-if="currentStep === 3" class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Cláusulas Adicionales</CardTitle>
              <CardDescription>
                Agregue cláusulas personalizadas más allá de las 24 estándar (opcional)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div v-if="formData.custom_clauses && formData.custom_clauses.length > 0" class="space-y-4 mb-6">
                <div
                  v-for="(clause, index) in formData.custom_clauses"
                  :key="index"
                  class="p-4 border rounded-lg space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <Badge variant="outline">{{ clause.number }}</Badge>
                      <span class="font-medium">{{ clause.title }}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="removeCustomClause(index)"
                    >
                      <Trash2 class="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <p class="text-sm text-muted-foreground line-clamp-2">{{ clause.content }}</p>
                </div>
              </div>

              <div v-else class="py-8 text-center text-muted-foreground">
                <FileText class="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No hay cláusulas adicionales</p>
              </div>

              <Separator class="my-4" />

              <!-- Add new custom clause form -->
              <div class="space-y-4">
                <h4 class="font-medium">Agregar Nueva Cláusula</h4>
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-2">
                    <Label>Número</Label>
                    <Select v-model="newClause.number">
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="num in availableClauseNumbers"
                          :key="num"
                          :value="num"
                        >
                          {{ num }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-2">
                    <Label>Título</Label>
                    <Input
                      v-model="newClause.title"
                      placeholder="Ej: MASCOTAS"
                    />
                  </div>
                </div>
                <div class="space-y-2">
                  <Label>Contenido</Label>
                  <Textarea
                    v-model="newClause.content"
                    placeholder="Escriba el texto de la cláusula..."
                    class="min-h-[100px]"
                  />
                </div>
                <Button
                  @click="addCustomClause"
                  :disabled="!newClause.number || !newClause.title || !newClause.content"
                >
                  <Plus class="w-4 h-4 mr-2" />
                  Agregar Cláusula
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- Step 5: Preview & Generate -->
        <div v-else-if="currentStep === 4" class="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Vista Previa del Contrato</CardTitle>
              <CardDescription>
                Revise el documento antes de generar el PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="bg-white dark:bg-gray-900 border rounded-lg p-6 max-h-[400px] overflow-y-auto">
                <pre class="whitespace-pre-wrap text-sm font-serif leading-relaxed">{{ previewText }}</pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-lg">Generar PDF</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <FileText class="w-10 h-10 text-primary" />
                <div class="flex-1">
                  <p class="font-medium">{{ pdfFilename }}</p>
                  <p class="text-sm text-muted-foreground">
                    Documento PDF listo para generar
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <Button
                  @click="handleSaveAndDownload"
                  :disabled="isSaving"
                  class="flex-1"
                >
                  <Download v-if="!isSaving" class="w-4 h-4 mr-2" />
                  <Loader2 v-else class="w-4 h-4 mr-2 animate-spin" />
                  {{ isSaving ? 'Generando...' : 'Guardar y Descargar PDF' }}
                </Button>
                <Button
                  variant="outline"
                  @click="currentStep = 0"
                >
                  <Pencil class="w-4 h-4 mr-2" />
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- Footer Navigation -->
      <div class="flex items-center justify-between pt-4 border-t mt-4">
        <Button
          variant="outline"
          @click="currentStep > 0 ? currentStep-- : handleClose(false)"
        >
          {{ currentStep === 0 ? 'Cancelar' : 'Anterior' }}
        </Button>
        <div class="flex items-center gap-2">
          <Button
            v-if="currentStep < steps.length - 1"
            @click="nextStep"
          >
            Siguiente
            <ChevronRight class="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Trash2,
  Plus,
  FileText,
  Download,
  Pencil,
} from 'lucide-vue-next'
import { useContractPDF } from '@/composables/useContractPDF'
import { useContracts } from '@/composables/useContracts'
import type { ContractWithRelations, CustomClause } from '@/types'

const props = defineProps<{
  open: boolean
  contractId: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'success'): void
}>()

const { fetchContractById } = useContracts()
const {
  loading: pdfLoading,
  getClauseKey,
  CLAUSE_TITLES,
  getDefaultClauseText,
  generateContractText,
  downloadPDF,
  saveContractPDFData,
  getPropertyAddress,
  getTitular,
  getCoTitulares,
  isPluralContract,
} = useContractPDF()

const loading = ref(true)
const isSaving = ref(false)
const currentStep = ref(0)
const maxVisitedStep = ref(0)
const contract = ref<ContractWithRelations | null>(null)

// Form data
const formData = ref({
  property_description: '',
  owner_cuit: '',
  owner_legal_address: '',
  payment_location: 'Olivera de Schwab Propiedades, Lincoln 3598, San Martín',
  payment_hours: '9:30 a 12:00 y 16:30 a 18:30',
  daily_interest_rate: 0.5,
  daily_penalty_rate: 10,
  clause_overrides: {} as Record<string, string>,
  custom_clauses: [] as CustomClause[],
})

// Clause editor state
const expandedClause = ref<number | null>(null)

// New custom clause form
const newClause = ref({
  number: '',
  title: '',
  content: '',
})

// Steps configuration
const steps = [
  { title: 'Descripción' },
  { title: 'Datos Legales' },
  { title: 'Cláusulas' },
  { title: 'Adicionales' },
  { title: 'Generar' },
]

// Available clause numbers for custom clauses
const availableClauseNumbers = computed(() => {
  const used = new Set((formData.value.custom_clauses || []).map(c => c.number))
  const numbers = [
    'VIGÉSIMA QUINTA',
    'VIGÉSIMA SEXTA',
    'VIGÉSIMA SÉPTIMA',
    'VIGÉSIMA OCTAVA',
    'VIGÉSIMA NOVENA',
    'TRIGÉSIMA',
  ]
  return numbers.filter(n => !used.has(n))
})

// Computed
const propertyAddress = computed(() => {
  if (!contract.value) return ''
  return getPropertyAddress(contract.value)
})

const isPluralVersion = computed(() => {
  if (!contract.value) return false
  return isPluralContract(contract.value)
})

const previewText = computed(() => {
  if (!contract.value) return ''
  // Create a copy of contract with form data
  const contractWithEdits = {
    ...contract.value,
    property_description: formData.value.property_description,
    owner_cuit: formData.value.owner_cuit,
    owner_legal_address: formData.value.owner_legal_address,
    payment_location: formData.value.payment_location,
    payment_hours: formData.value.payment_hours,
    daily_interest_rate: formData.value.daily_interest_rate,
    daily_penalty_rate: formData.value.daily_penalty_rate,
    clause_overrides: formData.value.clause_overrides,
    custom_clauses: formData.value.custom_clauses,
  }
  return generateContractText(contractWithEdits as ContractWithRelations)
})

const pdfFilename = computed(() => {
  if (!contract.value) return 'Contrato.pdf'
  const titular = getTitular(contract.value)
  const address = propertyAddress.value.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)
  const tenant = titular
    ? `${titular.first_name}_${titular.last_name}`.replace(/[^a-zA-Z0-9]/g, '_')
    : 'Inquilino'
  const date = contract.value.start_date.replace(/-/g, '')
  return `Contrato_${address}_${tenant}_${date}.pdf`
})

// Methods
function getClauseTitle(clauseNum: number): string {
  const key = getClauseKey(clauseNum)
  return CLAUSE_TITLES[key] || ''
}

function getClauseContent(clauseNum: number): string {
  const key = getClauseKey(clauseNum)
  const override = formData.value.clause_overrides?.[key]
  if (override) return override
  if (!contract.value) return ''
  return getDefaultClauseText(clauseNum, {
    ...contract.value,
    property_description: formData.value.property_description,
    owner_cuit: formData.value.owner_cuit,
    owner_legal_address: formData.value.owner_legal_address,
    payment_location: formData.value.payment_location,
    payment_hours: formData.value.payment_hours,
    daily_interest_rate: formData.value.daily_interest_rate,
    daily_penalty_rate: formData.value.daily_penalty_rate,
  } as ContractWithRelations)
}

function updateClause(clauseNum: number, content: string) {
  const key = getClauseKey(clauseNum)
  if (!formData.value.clause_overrides) {
    formData.value.clause_overrides = {}
  }
  formData.value.clause_overrides[key] = content
}

function resetClause(clauseNum: number) {
  const key = getClauseKey(clauseNum)
  if (formData.value.clause_overrides) {
    delete formData.value.clause_overrides[key]
  }
}

function isClauseModified(clauseNum: number): boolean {
  const key = getClauseKey(clauseNum)
  return !!formData.value.clause_overrides?.[key]
}

function toggleClause(clauseNum: number) {
  expandedClause.value = expandedClause.value === clauseNum ? null : clauseNum
}

function addCustomClause() {
  if (!newClause.value.number || !newClause.value.title || !newClause.value.content) return
  if (!formData.value.custom_clauses) {
    formData.value.custom_clauses = []
  }
  formData.value.custom_clauses.push({ ...newClause.value })
  newClause.value = { number: '', title: '', content: '' }
}

function removeCustomClause(index: number) {
  formData.value.custom_clauses?.splice(index, 1)
}

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    if (currentStep.value > maxVisitedStep.value) {
      maxVisitedStep.value = currentStep.value
    }
  }
}

async function handleSaveAndDownload() {
  if (!contract.value) return

  isSaving.value = true
  try {
    // Try to save to database (may fail if migration not applied)
    try {
      await saveContractPDFData(props.contractId, {
        property_description: formData.value.property_description || undefined,
        custom_clauses: formData.value.custom_clauses.length > 0 ? formData.value.custom_clauses : undefined,
        clause_overrides: Object.keys(formData.value.clause_overrides).length > 0 ? formData.value.clause_overrides : undefined,
        owner_legal_address: formData.value.owner_legal_address || undefined,
        owner_cuit: formData.value.owner_cuit || undefined,
        daily_penalty_rate: formData.value.daily_penalty_rate,
        daily_interest_rate: formData.value.daily_interest_rate,
        payment_location: formData.value.payment_location || undefined,
        payment_hours: formData.value.payment_hours || undefined,
      })
    } catch (saveError) {
      // Database save failed (likely migration not applied), continue with PDF generation
      console.warn('Could not save PDF data to database (migration may not be applied):', saveError)
    }

    // Generate and download PDF
    const contractWithEdits = {
      ...contract.value,
      property_description: formData.value.property_description,
      owner_cuit: formData.value.owner_cuit,
      owner_legal_address: formData.value.owner_legal_address,
      payment_location: formData.value.payment_location,
      payment_hours: formData.value.payment_hours,
      daily_interest_rate: formData.value.daily_interest_rate,
      daily_penalty_rate: formData.value.daily_penalty_rate,
      clause_overrides: formData.value.clause_overrides,
      custom_clauses: formData.value.custom_clauses,
    }

    await downloadPDF(contractWithEdits as ContractWithRelations)

    emit('success')
    alert('PDF generado correctamente')
  } catch (e) {
    console.error('Error generating PDF:', e)
    alert('Error al generar el PDF: ' + (e instanceof Error ? e.message : 'Error desconocido'))
  } finally {
    isSaving.value = false
  }
}

function handleClose(value: boolean) {
  if (!value) {
    // Reset state
    currentStep.value = 0
    maxVisitedStep.value = 0
  }
  emit('update:open', value)
}

async function loadContract() {
  loading.value = true
  try {
    const data = await fetchContractById(props.contractId)
    if (data) {
      contract.value = data
      // Initialize form data from contract
      formData.value = {
        property_description: data.property_description || '',
        owner_cuit: data.owner_cuit || data.property?.owner?.cuit_cuil || '',
        owner_legal_address: data.owner_legal_address || data.property?.owner?.address || '',
        payment_location: data.payment_location || 'Olivera de Schwab Propiedades, Lincoln 3598, San Martín',
        payment_hours: data.payment_hours || '9:30 a 12:00 y 16:30 a 18:30',
        daily_interest_rate: data.daily_interest_rate ?? data.late_payment_interest_rate ?? 0.5,
        daily_penalty_rate: data.daily_penalty_rate ?? data.non_return_penalty_rate ?? 10,
        clause_overrides: data.clause_overrides || {},
        custom_clauses: data.custom_clauses || [],
      }
    }
  } catch (e) {
    console.error('Error loading contract:', e)
  } finally {
    loading.value = false
  }
}

// Watch for dialog open to load contract
watch(() => props.open, (isOpen) => {
  if (isOpen && props.contractId) {
    loadContract()
  }
}, { immediate: true })
</script>
