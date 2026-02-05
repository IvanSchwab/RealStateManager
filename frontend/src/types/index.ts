// ============================================
// Database entity types
// All monetary amounts are in ARS (Argentine Pesos)
// ============================================

// --- User / Profile ---

export type UserRole = 'admin' | 'manager' | 'employee' | 'agent'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

// --- Owner ---

export interface Owner {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  address: string | null
  cuit_cuil: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export type OwnerFormData = Omit<Owner, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>

export interface OwnerWithProperties extends Owner {
  properties?: Property[]
  property_count?: number
}

// --- Property ---

export type PropertyType =
  | 'departamento'
  | 'casa'
  | 'comercial'
  | 'terreno'
  | 'oficina'
  | 'local'
  | 'galpon'

export type PropertyStatus = 'disponible' | 'alquilada' | 'mantenimiento' | 'reservada'

export type PropertyPurpose = 'alquiler' | 'venta'

export interface Property {
  id: string
  owner_id: string | null
  name: string
  property_type: PropertyType
  purpose: PropertyPurpose
  address_street: string
  address_number: string | null
  address_floor: string | null
  address_apartment: string | null
  address_city: string
  address_state: string
  address_zip_code: string | null
  bedrooms: number | null
  bathrooms: number | null
  square_meters: number | null
  description: string | null
  status: PropertyStatus
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Relations
  owner?: Owner
}

// --- Tenant ---

export type TenantStatus = 'activo' | 'inactivo'

export interface Tenant {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string
  dni: string | null
  cuit_cuil: string | null
  address: string | null
  employer: string | null
  employer_phone: string | null
  monthly_income: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  status: TenantStatus
  notes: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type TenantFormData = Omit<Tenant, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>

// --- Contract ---

// Guarantor types for contract guarantees
export type GuarantorType = 'persona_fisica' | 'finaer' | 'propiedad'

export interface GuarantorPersonaFisica {
  type: 'persona_fisica'
  full_name: string
  dni: string
  cuil: string
  phone: string
  address: string
}

export interface GuarantorFinaer {
  type: 'finaer'
  company_name: string
  cuit: string
  guarantee_code: string
  representative_name: string
  representative_dni: string
}

export interface GuarantorPropiedad {
  type: 'propiedad'
  guarantor_name: string
  guarantor_dni: string
  guarantor_cuil: string
  property_address: string
  cadastral_data: string
  cadastral_details?: string
}

export type Guarantor = GuarantorPersonaFisica | GuarantorFinaer | GuarantorPropiedad

// Contract classification
export type ContractType = 'vivienda' | 'comercial' | 'cochera' | 'oficina'

// Contract adjustment settings
export type AdjustmentType = 'ICL' | 'IPC' | 'fijo' | 'ninguno'
export type AdjustmentPeriod = 'trimestral' | 'semestral' | 'anual'
export type AdjustmentFrequency = AdjustmentPeriod // Alias for clarity

// Database status values (Spanish)
export type ContractStatus = 'borrador' | 'activo' | 'vencido' | 'rescindido' | 'renovado'

// Calculated display status (used in UI)
export type ContractDisplayStatus = 'active' | 'expiring_soon' | 'expired' | 'cancelled'

export interface Contract {
  id: string
  property_id: string
  contract_type: ContractType
  base_rent_amount: number
  current_rent_amount: number
  deposit_amount: number | null
  start_date: string
  end_date: string
  first_payment_date: string | null
  /** Day of month when rent is due. 0 = last day of month, 1-31 = specific day. */
  payment_due_day: number
  adjustment_type: AdjustmentType | null
  adjustment_period: AdjustmentPeriod | null
  last_adjustment_date: string | null
  next_adjustment_date: string | null
  late_payment_interest_rate: number
  early_termination_penalty_months: number
  non_return_penalty_rate: number
  insurance_required: boolean
  status: ContractStatus
  guarantors: Guarantor[]
  terms: string | null
  notes: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  // Relations
  property?: Property
  tenants?: ContractTenant[]
}

// Form data for creating/editing contracts
export interface ContractFormData {
  // Step 1: Property & Type
  property_id: string
  contract_type: ContractType

  // Step 2: Dates
  start_date: string
  duration_months: number
  end_date: string // Calculated
  first_payment_date: string

  // Step 3: Financial
  base_rent_amount: number
  deposit_amount: number
  payment_due_day: number
  adjustment_type: AdjustmentType
  adjustment_period: AdjustmentPeriod
  late_payment_interest_rate: number

  // Step 4: Tenants
  titular_id: string
  co_titular_ids: string[]

  // Step 5: Guarantors
  guarantors: Guarantor[]

  // Step 6: Special Clauses
  early_termination_penalty_months: number
  non_return_penalty_rate: number
  insurance_required: boolean
  notes: string
}

// --- Contract Tenant (junction) ---

export type ContractTenantRole = 'titular' | 'co_titular' | 'garante'

export interface ContractTenant {
  contract_id: string
  tenant_id: string
  role: ContractTenantRole
  created_at: string
  // Relations
  tenant?: Tenant
  contract?: Contract
}

// Contract with fully populated relations for detail views
export interface ContractWithRelations extends Contract {
  property: Property
  tenants: (ContractTenant & { tenant: Tenant })[]
}

// --- Payment ---

export type PaymentStatus = 'pendiente' | 'pagado' | 'vencido' | 'pago_parcial'
export type PaymentMethod = 'efectivo' | 'transferencia' | 'cheque' | 'tarjeta' | 'deposito'

export interface Payment {
  id: string
  contract_id: string
  period_month: number
  period_year: number
  expected_amount: number
  actual_amount: number | null
  due_date: string
  payment_date: string | null
  status: PaymentStatus
  payment_method: PaymentMethod | null
  reference_number: string | null
  paid_by_tenant_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  contract?: Contract
  paid_by_tenant?: Tenant
}

// --- Document ---

export type DocumentEntityType = 'tenant' | 'contract' | 'payment' | 'property'
export type DocumentType =
  | 'dni_frente'
  | 'dni_dorso'
  | 'recibo_sueldo'
  | 'contrato_firmado'
  | 'comprobante_pago'
  | 'inventario'
  | 'foto_propiedad'
  | 'garantia'
  | 'otro'

export interface Document {
  id: string
  entity_type: DocumentEntityType
  entity_id: string
  document_type: DocumentType
  file_name: string
  file_size: number | null
  mime_type: string | null
  storage_path: string
  uploaded_by: string | null
  created_at: string
}

// --- Notification ---

export type NotificationType =
  | 'vencimiento_contrato'
  | 'pago_proximo'
  | 'pago_vencido'
  | 'contrato_nuevo'
  | 'ajuste_aplicado'
  | 'general'

export type NotificationStatus = 'no_leida' | 'leida' | 'archivada'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  contract_id: string | null
  payment_id: string | null
  status: NotificationStatus
  is_archived: boolean
  expires_at: string | null
  created_at: string
}

// --- Adjustment History ---

export type AdjustmentSource = 'automatico' | 'manual'

export interface AdjustmentHistory {
  id: string
  contract_id: string
  executed_at: string
  /** Period in YYYY-MM format */
  effective_from_period: string
  adjustment_type: Exclude<AdjustmentType, 'ninguno'>
  index_value_used: number | null
  previous_amount: number
  new_amount: number
  source: AdjustmentSource
  notes: string | null
  created_at: string
  // Relations
  contract?: Contract
}

// --- Index Values ---

export type IndexType = 'ICL' | 'IPC' | 'USD_OFICIAL' | 'USD_MEP'
export type IndexSource = 'api_bcra' | 'api_indec' | 'manual'

export interface IndexValue {
  id: string
  index_type: IndexType
  /** Period in YYYY-MM format */
  period: string
  value: number
  source: IndexSource | null
  created_at: string
}

// --- Agent Assignment ---

export interface AgentAssignment {
  id: string
  agent_id: string
  property_id: string
  assigned_at: string
  assigned_by: string | null
  // Relations
  agent?: Profile
  property?: Property
}

// ============================================
// API / utility types
// ============================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}
