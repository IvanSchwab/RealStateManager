<template>
  <MainLayout>
    <div class="p-6">
      <!-- Loading state -->
      <div v-if="loading" class="py-12 text-center text-muted-foreground">
        <Loader2 class="w-8 h-8 mx-auto animate-spin" />
        <p class="mt-2">Cargando contrato...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-12 text-center">
        <p class="text-destructive font-medium mb-2">Error al cargar contrato</p>
        <p class="text-sm text-muted-foreground mb-4">{{ error }}</p>
        <Button variant="outline" @click="loadContract">
          Reintentar
        </Button>
      </div>

      <!-- Not found state -->
      <div v-else-if="!contract" class="py-12 text-center">
        <FileText class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p class="text-lg font-medium text-muted-foreground mb-2">Contrato no encontrado</p>
        <Button variant="outline" @click="goBack">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Volver al listado
        </Button>
      </div>

      <!-- Contract details -->
      <template v-else>
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <Button variant="ghost" size="sm" class="mb-2" @click="goBack">
              <ArrowLeft class="w-4 h-4 mr-2" />
              Volver a Contratos
            </Button>
            <h1 class="text-2xl font-bold">Contrato - {{ propertyAddress }}</h1>
            <div class="flex items-center gap-2 mt-2">
              <Badge :class="getStatusBadgeClass(displayStatus)">
                {{ statusLabels[displayStatus] }}
              </Badge>
              <Badge variant="outline" class="capitalize">
                {{ contractTypeLabels[contract.contract_type] }}
              </Badge>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" @click="openEditDialog">
              <Pencil class="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" @click="openPDFEditor">
              <FileText class="w-4 h-4 mr-2" />
              Generar PDF
            </Button>
            <Button variant="destructive" @click="openCancelDialog">
              <XCircle class="w-4 h-4 mr-2" />
              Cancelar Contrato
            </Button>
          </div>
        </div>

        <!-- Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Main Column -->
          <div class="lg:col-span-2 space-y-6">
            <!-- General Information Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Información General</CardTitle>
              </CardHeader>
              <CardContent>
                <dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="md:col-span-2">
                    <dt class="text-sm text-muted-foreground">Propiedad</dt>
                    <dd class="font-medium">
                      <RouterLink
                        :to="{ name: 'property-details', params: { id: contract.property_id } }"
                        class="text-primary hover:underline"
                      >
                        {{ propertyAddress }}
                      </RouterLink>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Tipo de Contrato</dt>
                    <dd class="font-medium capitalize">{{ contractTypeLabels[contract.contract_type] }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Estado</dt>
                    <dd>
                      <Badge :class="['mt-1', getStatusBadgeClass(displayStatus)]">
                        {{ statusLabels[displayStatus] }}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Fecha Inicio</dt>
                    <dd class="font-medium">{{ formatDate(contract.start_date) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Fecha Fin</dt>
                    <dd class="font-medium">{{ formatDate(contract.end_date) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Duración</dt>
                    <dd class="font-medium">{{ contractDuration }} meses</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Primer Pago</dt>
                    <dd class="font-medium">{{ formatDate(contract.first_payment_date) }}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <!-- Financial Terms Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Condiciones Financieras</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Rent amounts - highlighted -->
                  <div class="md:col-span-2 p-4 bg-primary/5 rounded-lg">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <p class="text-sm text-muted-foreground">Alquiler Base</p>
                        <p class="text-2xl font-bold text-primary">
                          {{ formatCurrency(contract.base_rent_amount) }}
                        </p>
                      </div>
                      <div v-if="contract.current_rent_amount !== contract.base_rent_amount">
                        <p class="text-sm text-muted-foreground">Alquiler Actual</p>
                        <p class="text-2xl font-bold text-primary">
                          {{ formatCurrency(contract.current_rent_amount) }}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <dt class="text-sm text-muted-foreground">Depósito</dt>
                    <dd class="font-medium">{{ formatCurrency(contract.deposit_amount) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Día de Pago</dt>
                    <dd class="font-medium">Día {{ contract.payment_due_day }} de cada mes</dd>
                  </div>

                  <Separator class="md:col-span-2" />

                  <div>
                    <dt class="text-sm text-muted-foreground">Tipo de Ajuste</dt>
                    <dd class="font-medium">
                      {{ contract.adjustment_type ?? 'Sin ajuste' }}
                      {{ contract.adjustment_period ? adjustmentPeriodLabels[contract.adjustment_period] : '' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Próximo Ajuste</dt>
                    <dd class="font-medium">
                      <span v-if="contract.next_adjustment_date" :class="isAdjustmentSoon ? 'text-yellow-600' : ''">
                        {{ formatDate(contract.next_adjustment_date) }}
                      </span>
                      <span v-else class="text-muted-foreground">-</span>
                    </dd>
                  </div>

                  <Separator class="md:col-span-2" />

                  <div>
                    <dt class="text-sm text-muted-foreground">Interés por Mora</dt>
                    <dd class="font-medium">{{ contract.late_payment_interest_rate }}% diario</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Penalidad Rescisión Anticipada</dt>
                    <dd class="font-medium">{{ contract.early_termination_penalty_months }} meses de alquiler</dd>
                  </div>
                  <div>
                    <dt class="text-sm text-muted-foreground">Penalidad por No Devolución</dt>
                    <dd class="font-medium">{{ contract.non_return_penalty_rate }}% diario</dd>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Guarantors Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Garantes ({{ contract.guarantors?.length ?? 0 }})</CardTitle>
              </CardHeader>
              <CardContent>
                <div v-if="contract.guarantors && contract.guarantors.length > 0" class="space-y-4">
                  <div
                    v-for="(guarantor, index) in contract.guarantors"
                    :key="index"
                    class="p-4 border border-border rounded-lg"
                  >
                    <!-- Persona Física -->
                    <template v-if="guarantor.type === 'persona_fisica'">
                      <div class="flex items-center gap-2 mb-3">
                        <Badge variant="outline">Persona Física</Badge>
                      </div>
                      <dl class="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt class="text-muted-foreground">Nombre</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPersonaFisica).full_name }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">DNI</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPersonaFisica).dni }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">CUIL</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPersonaFisica).cuil }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">Teléfono</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPersonaFisica).phone || '-' }}</dd>
                        </div>
                        <div class="col-span-2">
                          <dt class="text-muted-foreground">Dirección</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPersonaFisica).address || '-' }}</dd>
                        </div>
                      </dl>
                    </template>

                    <!-- FINAER -->
                    <template v-else-if="guarantor.type === 'finaer'">
                      <div class="flex items-center gap-2 mb-3">
                        <Badge variant="outline">FINAER</Badge>
                      </div>
                      <dl class="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt class="text-muted-foreground">Empresa</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorFinaer).company_name }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">CUIT</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorFinaer).cuit }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">Código Garantía</dt>
                          <dd class="font-medium font-mono">{{ (guarantor as GuarantorFinaer).guarantee_code }}</dd>
                        </div>
                        <div>
                          <dt class="text-muted-foreground">Representante</dt>
                          <dd class="font-medium">
                            {{ (guarantor as GuarantorFinaer).representative_name }}
                            <span class="text-muted-foreground">(DNI: {{ (guarantor as GuarantorFinaer).representative_dni }})</span>
                          </dd>
                        </div>
                      </dl>
                    </template>

                    <!-- Propiedad en Garantía -->
                    <template v-else-if="guarantor.type === 'propiedad'">
                      <div class="flex items-center gap-2 mb-3">
                        <Badge variant="outline">Propiedad en Garantía</Badge>
                      </div>
                      <dl class="grid grid-cols-2 gap-3 text-sm">
                        <div class="col-span-2">
                          <dt class="text-muted-foreground">Garante</dt>
                          <dd class="font-medium">
                            {{ (guarantor as GuarantorPropiedad).guarantor_name }}
                            <span class="text-muted-foreground">
                              (DNI: {{ (guarantor as GuarantorPropiedad).guarantor_dni }}
                              <span v-if="(guarantor as GuarantorPropiedad).guarantor_cuil">
                                , CUIL: {{ (guarantor as GuarantorPropiedad).guarantor_cuil }}
                              </span>)
                            </span>
                          </dd>
                        </div>
                        <div class="col-span-2">
                          <dt class="text-muted-foreground">Dirección Propiedad</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPropiedad).property_address }}</dd>
                        </div>
                        <div class="col-span-2">
                          <dt class="text-muted-foreground">Datos Catastrales</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPropiedad).cadastral_data }}</dd>
                        </div>
                        <div v-if="(guarantor as GuarantorPropiedad).cadastral_details" class="col-span-2">
                          <dt class="text-muted-foreground">Detalles Catastrales</dt>
                          <dd class="font-medium">{{ (guarantor as GuarantorPropiedad).cadastral_details }}</dd>
                        </div>
                      </dl>
                    </template>
                  </div>
                </div>

                <div v-else class="py-8 text-center">
                  <Shield class="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p class="text-sm text-muted-foreground">No hay garantes registrados</p>
                </div>
              </CardContent>
            </Card>

            <!-- Special Clauses Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Cláusulas Especiales</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center"
                      :class="contract.insurance_required ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'"
                    >
                      <ShieldCheck v-if="contract.insurance_required" class="w-4 h-4" />
                      <ShieldX v-else class="w-4 h-4" />
                    </div>
                    <div>
                      <p class="font-medium">Seguro de Inquilino</p>
                      <p class="text-sm text-muted-foreground">
                        {{ contract.insurance_required ? 'Requerido' : 'No requerido' }}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p class="text-sm text-muted-foreground mb-2">Notas Adicionales</p>
                    <p v-if="contract.notes" class="whitespace-pre-wrap">{{ contract.notes }}</p>
                    <p v-else class="text-muted-foreground italic">Sin notas adicionales</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Documents Placeholder Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Documentos del Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="py-8 text-center">
                  <FileText class="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p class="text-sm text-muted-foreground">
                    La funcionalidad de carga de documentos estará disponible en Fase 2.
                  </p>
                </div>
              </CardContent>
            </Card>

            <!-- Payments Placeholder Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Historial de Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="py-8 text-center">
                  <CreditCard class="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p class="text-sm text-muted-foreground">
                    Los pagos se implementarán próximamente.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- Sidebar -->
          <div class="space-y-6">
            <!-- Tenants Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Inquilinos</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="space-y-4">
                  <!-- Titular -->
                  <div v-if="titular">
                    <p class="text-sm text-muted-foreground mb-2">Titular</p>
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User class="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <RouterLink
                          :to="{ name: 'tenant-details', params: { id: titular.id } }"
                          class="font-medium text-primary hover:underline"
                        >
                          {{ titular.first_name }} {{ titular.last_name }}
                        </RouterLink>
                        <p class="text-sm text-muted-foreground">{{ titular.phone }}</p>
                        <p v-if="titular.email" class="text-sm text-muted-foreground">{{ titular.email }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Co-titulares -->
                  <div v-if="coTitulares.length > 0">
                    <Separator class="my-3" />
                    <p class="text-sm text-muted-foreground mb-2">Co-titulares</p>
                    <div class="space-y-3">
                      <div v-for="coTitular in coTitulares" :key="coTitular.id" class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                          <User class="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <RouterLink
                            :to="{ name: 'tenant-details', params: { id: coTitular.id } }"
                            class="font-medium text-primary hover:underline text-sm"
                          >
                            {{ coTitular.first_name }} {{ coTitular.last_name }}
                          </RouterLink>
                          <p class="text-xs text-muted-foreground">{{ coTitular.phone }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="!titular && coTitulares.length === 0" class="text-center py-4">
                    <p class="text-sm text-muted-foreground">Sin inquilinos asignados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Metadata Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Detalles</CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <div>
                  <p class="text-sm text-muted-foreground">Creado</p>
                  <p class="font-medium">{{ formatDateTime(contract.created_at) }}</p>
                </div>
                <div>
                  <p class="text-sm text-muted-foreground">Última Actualización</p>
                  <p class="font-medium">{{ formatDateTime(contract.updated_at) }}</p>
                </div>
              </CardContent>
            </Card>

            <!-- Quick Actions Card -->
            <Card>
              <CardHeader>
                <CardTitle class="text-lg">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent class="space-y-2">
                <Button variant="outline" class="w-full justify-start" @click="openEditDialog">
                  <Pencil class="w-4 h-4 mr-2" />
                  Editar Contrato
                </Button>
                <Button variant="outline" class="w-full justify-start" @click="openPDFEditor">
                  <FileText class="w-4 h-4 mr-2" />
                  Generar PDF
                </Button>
                <Button variant="outline" class="w-full justify-start text-destructive hover:text-destructive" @click="openCancelDialog">
                  <XCircle class="w-4 h-4 mr-2" />
                  Cancelar Contrato
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </template>

      <!-- Contract Dialog (Edit) -->
      <ContractDialog
        v-model:open="dialogOpen"
        :contract-id="contractId"
        @success="handleEditSuccess"
      />

      <!-- Cancel Contract Confirmation Dialog -->
      <CancelContractDialog
        v-if="contract"
        v-model:open="cancelDialogOpen"
        :contract-id="contract.id"
        :property-address="propertyAddress"
        :tenant-name="titularName"
        @confirm="handleCancelSuccess"
      />

      <!-- PDF Editor Dialog -->
      <ContractPDFEditor
        v-if="contract"
        v-model:open="pdfEditorOpen"
        :contract-id="contract.id"
        @success="handlePDFSuccess"
      />
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import MainLayout from '@/components/layout/MainLayout.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import ContractDialog from '@/components/contracts/ContractDialog.vue'
import CancelContractDialog from '@/components/contracts/CancelContractDialog.vue'
import ContractPDFEditor from '@/components/contracts/ContractPDFEditor.vue'
import {
  ArrowLeft,
  Pencil,
  XCircle,
  FileText,
  Loader2,
  User,
  Shield,
  ShieldCheck,
  ShieldX,
  CreditCard,
} from 'lucide-vue-next'
import { useContracts } from '@/composables/useContracts'
import type {
  ContractWithRelations,
  ContractType,
  ContractDisplayStatus,
  AdjustmentPeriod,
  Tenant,
  GuarantorPersonaFisica,
  GuarantorFinaer,
  GuarantorPropiedad,
} from '@/types'

const route = useRoute()
const router = useRouter()
const {
  loading,
  error,
  fetchContractById,
  calculateDisplayStatus,
  formatPropertyAddress,
  getTitular,
  getCoTitulares,
} = useContracts()

const contract = ref<ContractWithRelations | null>(null)
const dialogOpen = ref(false)
const cancelDialogOpen = ref(false)
const pdfEditorOpen = ref(false)

const contractId = computed(() => route.params.id as string)

// Labels
const contractTypeLabels: Record<ContractType, string> = {
  vivienda: 'Vivienda',
  comercial: 'Comercial',
  cochera: 'Cochera',
  oficina: 'Oficina',
}

const statusLabels: Record<ContractDisplayStatus, string> = {
  active: 'Activo',
  expiring_soon: 'Por Vencer',
  expired: 'Vencido',
  cancelled: 'Cancelado',
}

const adjustmentPeriodLabels: Record<AdjustmentPeriod, string> = {
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}

// Computed
const displayStatus = computed<ContractDisplayStatus>(() => {
  if (!contract.value) return 'active'
  return calculateDisplayStatus(contract.value)
})

const propertyAddress = computed(() => {
  if (!contract.value) return ''
  return formatPropertyAddress(contract.value)
})

const titular = computed<Tenant | null>(() => {
  if (!contract.value) return null
  return getTitular(contract.value)
})

const titularName = computed(() => {
  if (!titular.value) return ''
  return `${titular.value.first_name} ${titular.value.last_name}`
})

const coTitulares = computed<Tenant[]>(() => {
  if (!contract.value) return []
  return getCoTitulares(contract.value) as Tenant[]
})

const contractDuration = computed(() => {
  if (!contract.value) return 0
  const start = new Date(contract.value.start_date)
  const end = new Date(contract.value.end_date)
  const diffTime = end.getTime() - start.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24 * 30))
})

const isAdjustmentSoon = computed(() => {
  if (!contract.value?.next_adjustment_date) return false
  const nextAdjustment = new Date(contract.value.next_adjustment_date)
  const today = new Date()
  const diffDays = Math.ceil((nextAdjustment.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 30 && diffDays >= 0
})

// Methods
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStatusBadgeClass(status: ContractDisplayStatus): string {
  const classes: Record<ContractDisplayStatus, string> = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    expiring_soon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800',
  }
  return classes[status] ?? classes.active
}

function goBack() {
  router.push({ name: 'Contracts' })
}

function openEditDialog() {
  dialogOpen.value = true
}

function openCancelDialog() {
  cancelDialogOpen.value = true
}

async function loadContract() {
  const data = await fetchContractById(contractId.value)
  contract.value = data
}

async function handleEditSuccess() {
  await loadContract()
}

function handleCancelSuccess() {
  router.push({ name: 'Contracts' })
}

function openPDFEditor() {
  pdfEditorOpen.value = true
}

async function handlePDFSuccess() {
  await loadContract()
}

onMounted(() => {
  loadContract()
})
</script>
