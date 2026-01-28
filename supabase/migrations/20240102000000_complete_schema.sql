-- ============================================
-- REAL ESTATE MANAGEMENT SYSTEM - COMPLETE SCHEMA
-- ============================================
-- Migration: 20240102000000_complete_schema.sql
-- Description: Creates all business tables, indexes, triggers, and RLS policies.
-- Depends on: 20240101000000_initial_setup.sql (profiles table, update_updated_at_column function)
--
-- Currency: All monetary amounts are in ARS (Argentine Pesos).
--           Multi-currency support can be added in a future version.
--
-- Soft delete strategy:
--   WITH deleted_at: properties, tenants, contracts
--   WITHOUT (hard delete / cascade): payments, documents, notifications, junction tables
--
-- payment_due_day convention:
--   0 = last day of the month
--   1-31 = specific day (app logic handles months with fewer days)

-- ============================================
-- EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Returns the role of the currently authenticated user.
-- Used in RLS policies to avoid repeated subqueries against profiles.

-- ============================================
-- UPDATE PROFILES TABLE
-- ============================================
-- Add 'agent' to the allowed roles.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'employee', 'agent'));

COMMENT ON TABLE profiles IS
  'Application user profiles, auto-created on auth.users registration. Extends Supabase Auth with role-based access.';

-- ============================================
-- TABLE: owners
-- ============================================
-- Property owners / landlords. Separate from system users because an owner
-- may not have an account in the system.

CREATE TABLE owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  cuit_cuil TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE owners IS
  'Property owners / landlords. An owner may manage multiple properties and may or may not have a system account.';
COMMENT ON COLUMN owners.cuit_cuil IS
  'Argentine tax identification number (CUIT/CUIL).';

-- ============================================
-- TABLE: properties
-- ============================================

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN (
    'departamento', 'casa', 'comercial', 'terreno', 'oficina', 'local', 'galpon'
  )),
  -- Address fields split for structured queries and display
  address_street TEXT NOT NULL,
  address_number TEXT,
  address_floor TEXT,
  address_apartment TEXT,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL DEFAULT 'CABA',
  address_zip_code TEXT,
  -- Property characteristics
  bedrooms INTEGER CHECK (bedrooms >= 0),
  bathrooms INTEGER CHECK (bathrooms >= 0),
  square_meters NUMERIC(10, 2) CHECK (square_meters > 0),
  description TEXT,
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'disponible' CHECK (status IN (
    'disponible', 'alquilada', 'mantenimiento', 'reservada'
  )),
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE properties IS
  'Real estate units available for rental. Supports soft delete via deleted_at.';
COMMENT ON COLUMN properties.property_type IS
  'Type of property: departamento, casa, comercial, terreno, oficina, local, galpon.';
COMMENT ON COLUMN properties.status IS
  'Current availability: disponible, alquilada, mantenimiento, reservada.';
COMMENT ON COLUMN properties.address_state IS
  'Province or autonomous city. Defaults to CABA (Ciudad Autonoma de Buenos Aires).';

-- ============================================
-- TABLE: tenants
-- ============================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  dni TEXT,
  cuit_cuil TEXT,
  -- Current address (before moving into rented property)
  address TEXT,
  -- Employment information (used for tenant qualification)
  employer TEXT,
  employer_phone TEXT,
  monthly_income NUMERIC(12, 2) CHECK (monthly_income >= 0),
  -- Emergency contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo')),
  notes TEXT,
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tenants IS
  'Tenants (inquilinos) who rent properties. Supports soft delete via deleted_at.';
COMMENT ON COLUMN tenants.dni IS
  'Argentine national identity document number (DNI).';
COMMENT ON COLUMN tenants.cuit_cuil IS
  'Argentine tax identification number (CUIT/CUIL).';
COMMENT ON COLUMN tenants.monthly_income IS
  'Declared monthly income in ARS, used for tenant qualification.';

-- ============================================
-- TABLE: contracts
-- ============================================

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  -- Financial terms
  base_rent_amount NUMERIC(12, 2) NOT NULL CHECK (base_rent_amount > 0),
  current_rent_amount NUMERIC(12, 2) NOT NULL CHECK (current_rent_amount > 0),
  deposit_amount NUMERIC(12, 2) CHECK (deposit_amount >= 0),
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  -- Payment settings
  payment_due_day INTEGER NOT NULL DEFAULT 10
    CHECK (payment_due_day BETWEEN 0 AND 31),
  -- Rent adjustment configuration
  adjustment_type TEXT CHECK (adjustment_type IN ('ICL', 'IPC', 'fijo', 'ninguno')),
  adjustment_period TEXT CHECK (adjustment_period IN ('trimestral', 'semestral', 'anual')),
  last_adjustment_date DATE,
  next_adjustment_date DATE,
  -- Status
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN (
    'borrador', 'activo', 'vencido', 'rescindido', 'renovado'
  )),
  terms TEXT,
  notes TEXT,
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Business rule: end date must be after start date
  CONSTRAINT chk_contract_dates CHECK (end_date > start_date),
  CONSTRAINT chk_adjustment_consistency CHECK (
  (adjustment_type = 'ninguno' AND adjustment_period IS NULL) OR
  (adjustment_type != 'ninguno' AND adjustment_period IS NOT NULL)
)
);

COMMENT ON TABLE contracts IS
  'Rental agreements linking a property to one or more tenants via contract_tenants. Supports soft delete.';
COMMENT ON COLUMN contracts.base_rent_amount IS
  'Original rent amount at contract signing, in ARS. Does not change after adjustments.';
COMMENT ON COLUMN contracts.current_rent_amount IS
  'Current effective rent amount after adjustments, in ARS. Updated by adjustment logic.';
COMMENT ON COLUMN contracts.payment_due_day IS
  'Day of month when rent is due. 0 = last day of the month; 1-31 = specific day.';
COMMENT ON COLUMN contracts.adjustment_type IS
  'Index used for periodic rent adjustments: ICL (Indice de Contratos de Locacion), IPC, fijo (fixed %), or ninguno.';
COMMENT ON COLUMN contracts.adjustment_period IS
  'How often rent is adjusted: trimestral (every 3 months), semestral (every 6), anual (every 12).';

-- ============================================
-- TABLE: contract_tenants (junction)
-- ============================================
-- Many-to-many relationship between contracts and tenants.
-- A contract can have multiple tenants with different roles.

CREATE TABLE contract_tenants (
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'titular' CHECK (role IN ('titular', 'co_titular', 'garante')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contract_id, tenant_id)
);

COMMENT ON TABLE contract_tenants IS
  'Junction table linking contracts to tenants with their role (titular, co_titular, garante). Cascades on contract delete.';
COMMENT ON COLUMN contract_tenants.role IS
  'Tenant role in the contract: titular (primary), co_titular (co-signer), garante (guarantor).';

-- ============================================
-- TABLE: payments
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  -- Period identification
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  -- Amounts
  expected_amount NUMERIC(12, 2) NOT NULL CHECK (expected_amount > 0),
  actual_amount NUMERIC(12, 2) CHECK (actual_amount >= 0),
  -- Dates
  due_date DATE NOT NULL,
  payment_date DATE,
  -- Status and method
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente', 'pagado', 'vencido', 'pago_parcial'
  )),
  payment_method TEXT CHECK (payment_method IN (
    'efectivo', 'transferencia', 'cheque', 'tarjeta', 'deposito'
  )),
  reference_number TEXT,
  -- Who physically made the payment (may differ from contract titular)
  paid_by_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One payment record per contract per period
  CONSTRAINT uq_payment_period UNIQUE (contract_id, period_year, period_month)
);

COMMENT ON TABLE payments IS
  'Monthly rent payment records. One record per contract per period. Hard delete (cascades with contract).';
COMMENT ON COLUMN payments.expected_amount IS
  'Amount due for this period, in ARS. Derived from contract current_rent_amount at generation time.';
COMMENT ON COLUMN payments.actual_amount IS
  'Amount actually paid, in ARS. NULL until payment is recorded. Can be less than expected (partial payment).';
COMMENT ON COLUMN payments.paid_by_tenant_id IS
  'Optional: the tenant who physically made the payment. May differ from contract titular (e.g., guarantor paying).';
COMMENT ON COLUMN payments.status IS
  'pendiente = awaiting payment, pagado = fully paid, vencido = overdue, pago_parcial = partially paid.';

-- ============================================
-- TABLE: documents
-- ============================================
-- Polymorphic design: entity_type + entity_id reference any parent table.
-- No FK constraint on entity_id because it can point to different tables.
-- This is an intentional trade-off:
--   Pro: Flexible, single table for all document types
--   Con: No referential integrity at DB level
--   Mitigation: Soft deletes on parent tables preserve entity_id validity.
--              Application logic validates references on insert.
--              Orphaned documents are acceptable (storage cleanup job).

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'tenant', 'contract', 'payment', 'property'
  )),
  entity_id UUID NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'dni_frente', 'dni_dorso', 'recibo_sueldo', 'contrato_firmado',
    'comprobante_pago', 'inventario', 'foto_propiedad', 'garantia', 'otro'
  )),
  file_name TEXT NOT NULL,
  file_size INTEGER CHECK (file_size > 0),
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE documents IS
  'File storage metadata using polymorphic references (entity_type + entity_id). '
  'NO FK constraint on entity_id — integrity maintained via application logic and soft deletes on parent tables. '
  'See design decision notes in migration comments.';
COMMENT ON COLUMN documents.entity_type IS
  'Parent table: tenant, contract, payment, or property.';
COMMENT ON COLUMN documents.entity_id IS
  'UUID of the parent record. No FK constraint (polymorphic). Validated by application on insert.';
COMMENT ON COLUMN documents.storage_path IS
  'Path in Supabase Storage bucket where the file is stored.';

-- ============================================
-- TABLE: notifications
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'vencimiento_contrato', 'pago_proximo', 'pago_vencido',
    'contrato_nuevo', 'ajuste_aplicado', 'general'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  -- Optional references to related entities
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  -- Status
  status TEXT NOT NULL DEFAULT 'no_leida' CHECK (status IN (
    'no_leida', 'leida', 'archivada'
  )),
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS
  'System alerts and notifications for users. Uses is_archived instead of soft delete. Supports auto-expiry via expires_at.';
COMMENT ON COLUMN notifications.expires_at IS
  'Optional expiration timestamp. Application or cron job should archive notifications past this date.';
COMMENT ON COLUMN notifications.is_archived IS
  'When TRUE, notification is hidden from default views. Used instead of soft delete.';

-- ============================================
-- TABLE: adjustment_history
-- ============================================

CREATE TABLE adjustment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_from_period TEXT NOT NULL,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('ICL', 'IPC', 'fijo')),
  index_value_used NUMERIC(10, 6),
  previous_amount NUMERIC(12, 2) NOT NULL CHECK (previous_amount > 0),
  new_amount NUMERIC(12, 2) NOT NULL CHECK (new_amount > 0),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('automatico', 'manual')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE adjustment_history IS
  'Audit trail of rent adjustments applied to contracts. Hard delete (cascades with contract).';
COMMENT ON COLUMN adjustment_history.executed_at IS
  'Timestamp when the adjustment calculation was executed.';
COMMENT ON COLUMN adjustment_history.effective_from_period IS
  'The period (YYYY-MM) from which the new amount applies. Adjustments apply to the NEXT payment period after execution.';
COMMENT ON COLUMN adjustment_history.index_value_used IS
  'The index multiplier value used for the calculation (e.g., 1.0523 for 5.23% increase). NULL for fixed adjustments.';
COMMENT ON COLUMN adjustment_history.source IS
  'automatico = calculated by system from index_values table; manual = entered by user.';

-- ============================================
-- TABLE: index_values
-- ============================================

CREATE TABLE index_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  index_type TEXT NOT NULL CHECK (index_type IN ('ICL', 'IPC', 'USD_OFICIAL', 'USD_MEP')),
  period TEXT NOT NULL,
  value NUMERIC(12, 6) NOT NULL,
  source TEXT CHECK (source IN ('api_bcra', 'api_indec', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_index_type_period UNIQUE (index_type, period)
);

COMMENT ON TABLE index_values IS
  'Reference table storing economic index values used for rent adjustments. One row per index type per period.';
COMMENT ON COLUMN index_values.index_type IS
  'ICL = Indice de Contratos de Locacion, IPC = Indice de Precios al Consumidor, USD_OFICIAL, USD_MEP.';
COMMENT ON COLUMN index_values.period IS
  'Period in YYYY-MM format (e.g., 2024-03 for March 2024).';
COMMENT ON COLUMN index_values.value IS
  'The index value or multiplier for this period. Interpretation depends on index_type.';
COMMENT ON COLUMN index_values.source IS
  'Where this value came from: api_bcra, api_indec, or manual entry as fallback.';

-- ============================================
-- TABLE: agent_assignments
-- ============================================

CREATE TABLE agent_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  CONSTRAINT uq_agent_property UNIQUE (agent_id, property_id)
);

COMMENT ON TABLE agent_assignments IS
  'Maps agents to properties they manage. Used by RLS policies to restrict agent access to assigned properties only.';
COMMENT ON COLUMN agent_assignments.assigned_by IS
  'The admin or manager who created this assignment. SET NULL if that user is deleted.';


CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_role() IS
  'Returns the role of the current authenticated user. SECURITY DEFINER ensures it bypasses RLS on profiles.';

-- Checks whether the current user (agent) is assigned to a given property.
-- SECURITY DEFINER so it can read agent_assignments regardless of RLS.
CREATE OR REPLACE FUNCTION is_agent_assigned(property_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agent_assignments
    WHERE agent_id = auth.uid()
      AND property_id = property_uuid
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_agent_assigned(UUID) IS
  'Returns TRUE if the current user is assigned as agent to the given property. Used in RLS policies.';

-- ============================================
-- INDEXES
-- ============================================
-- Naming convention: idx_{table}_{columns}
-- Partial indexes use WHERE to exclude soft-deleted rows for better performance.

-- Owners
CREATE INDEX idx_owners_cuit_cuil ON owners(cuit_cuil) WHERE cuit_cuil IS NOT NULL;

-- Properties
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_status ON properties(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_type ON properties(property_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_city ON properties(address_city) WHERE deleted_at IS NULL;

-- Tenants
CREATE INDEX idx_tenants_status ON tenants(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_email ON tenants(email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_tenants_dni ON tenants(dni) WHERE dni IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_tenants_last_name ON tenants(last_name) WHERE deleted_at IS NULL;

-- Contracts
CREATE INDEX idx_contracts_property_id ON contracts(property_id);
CREATE INDEX idx_contracts_status ON contracts(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date) WHERE deleted_at IS NULL;
-- Used by cron/scheduler to find contracts needing rent adjustments
CREATE INDEX idx_contracts_next_adjustment ON contracts(next_adjustment_date)
  WHERE status = 'activo' AND deleted_at IS NULL AND next_adjustment_date IS NOT NULL;
-- Used to find contracts expiring soon (for notifications)
CREATE INDEX idx_contracts_end_date_active ON contracts(end_date)
  WHERE status = 'activo' AND deleted_at IS NULL;

-- Contract Tenants
-- PK already indexes (contract_id, tenant_id); add reverse lookup
CREATE INDEX idx_contract_tenants_tenant_id ON contract_tenants(tenant_id);

-- Payments
CREATE INDEX idx_payments_contract_id ON payments(contract_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
-- Composite: find overdue payments efficiently
CREATE INDEX idx_payments_overdue ON payments(due_date, status)
  WHERE status IN ('pendiente', 'vencido');
-- Composite: lookup by period across all contracts
CREATE INDEX idx_payments_period ON payments(period_year, period_month);

-- Documents
-- Primary lookup pattern: find all documents for a given entity
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by) WHERE uploaded_by IS NOT NULL;

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
-- Unread notifications for a user (most common query)
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC)
  WHERE status = 'no_leida' AND is_archived = FALSE;
-- Expiring notifications (used by cleanup cron)
CREATE INDEX idx_notifications_expires ON notifications(expires_at)
  WHERE expires_at IS NOT NULL AND is_archived = FALSE;

-- Adjustment History
CREATE INDEX idx_adjustments_contract_id ON adjustment_history(contract_id);
CREATE INDEX idx_adjustments_effective_period ON adjustment_history(effective_from_period);

-- Agent Assignments
-- UNIQUE constraint already creates index on (agent_id, property_id)
CREATE INDEX idx_agent_assignments_property ON agent_assignments(property_id);

-- ============================================
-- TRIGGERS: auto-update updated_at
-- ============================================
-- Reuses the update_updated_at_column() function created in the initial migration.

CREATE TRIGGER update_owners_updated_at
  BEFORE UPDATE ON owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- ------------------------------------------------
-- Profiles (update existing policies)
-- ------------------------------------------------
-- Drop existing restrictive policies and replace with role-aware ones.

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Admins can read all profiles (needed for user management)
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (get_user_role() = 'admin');

-- Non-admin users can read their own profile
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Non-admin users can update their own profile (but not their role)
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------
-- Owners
-- ------------------------------------------------
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_all_owners" ON owners
  FOR ALL USING (get_user_role() = 'admin');

-- Employees and managers: read, insert, update
CREATE POLICY "staff_select_owners" ON owners
  FOR SELECT USING (get_user_role() IN ('employee', 'manager'));

CREATE POLICY "staff_insert_owners" ON owners
  FOR INSERT WITH CHECK (get_user_role() IN ('employee', 'manager'));

CREATE POLICY "staff_update_owners" ON owners
  FOR UPDATE
  USING (get_user_role() IN ('employee', 'manager'))
  WITH CHECK (get_user_role() IN ('employee', 'manager'));

-- Agents: read only (owners of their assigned properties)
CREATE POLICY "agent_select_owners" ON owners
  FOR SELECT USING (
    get_user_role() = 'agent'
    AND id IN (
      SELECT p.owner_id FROM properties p
      WHERE is_agent_assigned(p.id) AND p.owner_id IS NOT NULL
    )
  );

-- ------------------------------------------------
-- Properties
-- ------------------------------------------------
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- TEMPORARY: Allow public reads for development (before auth is implemented)
-- TODO: Remove this policy once authentication is implemented
CREATE POLICY "temp_public_read_properties" ON properties
  FOR SELECT USING (deleted_at IS NULL);

-- Admins: full access including soft-deleted rows
CREATE POLICY "admin_all_properties" ON properties
  FOR ALL USING (get_user_role() = 'admin');

-- Employees/managers: read non-deleted
CREATE POLICY "staff_select_properties" ON properties
  FOR SELECT USING (
    get_user_role() IN ('employee', 'manager')
    AND deleted_at IS NULL
  );

-- Employees/managers: insert new properties
CREATE POLICY "staff_insert_properties" ON properties
  FOR INSERT WITH CHECK (
    get_user_role() IN ('employee', 'manager')
  );

-- Employees/managers: update non-deleted, but cannot set deleted_at
-- The WITH CHECK ensures deleted_at remains NULL after update, preventing soft-delete by non-admins.
CREATE POLICY "staff_update_properties" ON properties
  FOR UPDATE
  USING (
    get_user_role() IN ('employee', 'manager')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    deleted_at IS NULL
  );

-- Agents: read only assigned, non-deleted properties
CREATE POLICY "agent_select_properties" ON properties
  FOR SELECT USING (
    get_user_role() = 'agent'
    AND deleted_at IS NULL
    AND is_agent_assigned(id)
  );

-- Agents: update only assigned properties (e.g., status, description), cannot soft-delete
CREATE POLICY "agent_update_properties" ON properties
  FOR UPDATE
  USING (
    get_user_role() = 'agent'
    AND deleted_at IS NULL
    AND is_agent_assigned(id)
  )
  WITH CHECK (
    deleted_at IS NULL
  );

-- ------------------------------------------------
-- Tenants
-- ------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_all_tenants" ON tenants
  FOR ALL USING (get_user_role() = 'admin');

-- Employees/managers: read non-deleted
CREATE POLICY "staff_select_tenants" ON tenants
  FOR SELECT USING (
    get_user_role() IN ('employee', 'manager')
    AND deleted_at IS NULL
  );

-- Employees/managers: insert
CREATE POLICY "staff_insert_tenants" ON tenants
  FOR INSERT WITH CHECK (
    get_user_role() IN ('employee', 'manager')
  );

-- Employees/managers: update non-deleted, cannot soft-delete
CREATE POLICY "staff_update_tenants" ON tenants
  FOR UPDATE
  USING (
    get_user_role() IN ('employee', 'manager')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    deleted_at IS NULL
  );

-- Agents: read tenants linked to their assigned properties via contracts
CREATE POLICY "agent_select_tenants" ON tenants
  FOR SELECT USING (
    get_user_role() = 'agent'
    AND deleted_at IS NULL
    AND id IN (
      SELECT ct.tenant_id
      FROM contract_tenants ct
      JOIN contracts c ON c.id = ct.contract_id
      WHERE is_agent_assigned(c.property_id)
        AND c.deleted_at IS NULL
    )
  );

-- ------------------------------------------------
-- Contracts
-- ------------------------------------------------
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_all_contracts" ON contracts
  FOR ALL USING (get_user_role() = 'admin');

-- Employees/managers: read non-deleted
CREATE POLICY "staff_select_contracts" ON contracts
  FOR SELECT USING (
    get_user_role() IN ('employee', 'manager')
    AND deleted_at IS NULL
  );

-- Employees/managers: insert
CREATE POLICY "staff_insert_contracts" ON contracts
  FOR INSERT WITH CHECK (
    get_user_role() IN ('employee', 'manager')
  );

-- Employees/managers: update non-deleted, cannot soft-delete
CREATE POLICY "staff_update_contracts" ON contracts
  FOR UPDATE
  USING (
    get_user_role() IN ('employee', 'manager')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    deleted_at IS NULL
  );

-- Agents: read contracts for their assigned properties
CREATE POLICY "agent_select_contracts" ON contracts
  FOR SELECT USING (
    get_user_role() = 'agent'
    AND deleted_at IS NULL
    AND is_agent_assigned(property_id)
  );

-- ------------------------------------------------
-- Contract Tenants
-- ------------------------------------------------
ALTER TABLE contract_tenants ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_all_contract_tenants" ON contract_tenants
  FOR ALL USING (get_user_role() = 'admin');

-- Employees/managers: read, insert, delete (manage contract participants)
CREATE POLICY "staff_select_contract_tenants" ON contract_tenants
  FOR SELECT USING (get_user_role() IN ('employee', 'manager'));

CREATE POLICY "staff_insert_contract_tenants" ON contract_tenants
  FOR INSERT WITH CHECK (get_user_role() IN ('employee', 'manager'));

CREATE POLICY "staff_delete_contract_tenants" ON contract_tenants
  FOR DELETE USING (get_user_role() IN ('employee', 'manager'));

-- Agents: read only for assigned property contracts
CREATE POLICY "agent_select_contract_tenants" ON contract_tenants
  FOR SELECT USING (
    get_user_role() = 'agent'
    AND contract_id IN (
      SELECT c.id FROM contracts c
      WHERE is_agent_assigned(c.property_id)
        AND c.deleted_at IS NULL
    )
  );

-- ------------------------------------------------
-- Payments
-- ------------------------------------------------
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_all_payments" ON payments
  FOR ALL USING (get_user_role() = 'admin');

-- Employees/managers: read all payments (for non-deleted contracts)
CREATE POLICY "staff_select_payments" ON payments
  FOR SELECT USING (
    get_user_role() IN ('employee', 'manager')
    AND contract_id IN (
      SELECT id FROM contracts WHERE deleted_at IS NULL
    )
  );

-- Employees/managers: insert and update payments
CREATE POLICY "staff_insert_payments" ON payments
  FOR INSERT WITH CHECK (get_user_role() IN ('employee', 'manager'));

CREATE POLICY "staff_update_payments" ON payments
  FOR UPDATE
  USING (get_user_role() IN ('employee', 'manager'))
  WITH CHECK (get_user_role() IN ('employee', 'manager'));

-- Agents: read payments for assigned property contracts
CREATE POLICY "agent_select_payments" ON payments
  FOR SELECT USING (
    get_user_role() = 'agent'
    AND contract_id IN (
      SELECT c.id FROM contracts c
      WHERE is_agent_assigned(c.property_id)
        AND c.deleted_at IS NULL
    )
  );

-- ------------------------------------------------
-- Documents
-- ------------------------------------------------
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_all_documents" ON documents
  FOR ALL USING (get_user_role() = 'admin');

-- Employees/managers: read, insert
CREATE POLICY "staff_select_documents" ON documents
  FOR SELECT USING (get_user_role() IN ('employee', 'manager'));

CREATE POLICY "staff_insert_documents" ON documents
  FOR INSERT WITH CHECK (get_user_role() IN ('employee', 'manager'));

-- Employees/managers: delete documents they uploaded
CREATE POLICY "staff_delete_own_documents" ON documents
  FOR DELETE USING (
    get_user_role() IN ('employee', 'manager')
    AND uploaded_by = auth.uid()
  );

-- Agents: read documents for entities related to their assigned properties
CREATE POLICY "agent_select_documents" ON documents
  FOR SELECT USING (
    get_user_role() = 'agent'
    AND (
      (entity_type = 'property' AND is_agent_assigned(entity_id))
      OR (entity_type = 'contract' AND entity_id IN (
        SELECT c.id FROM contracts c
        WHERE is_agent_assigned(c.property_id) AND c.deleted_at IS NULL
      ))
      OR (entity_type = 'payment' AND entity_id IN (
        SELECT p.id FROM payments p
        JOIN contracts c ON c.id = p.contract_id
        WHERE is_agent_assigned(c.property_id) AND c.deleted_at IS NULL
      ))
      OR (entity_type = 'tenant' AND entity_id IN (
        SELECT ct.tenant_id FROM contract_tenants ct
        JOIN contracts c ON c.id = ct.contract_id
        WHERE is_agent_assigned(c.property_id) AND c.deleted_at IS NULL
      ))
    )
  );

-- ------------------------------------------------
-- Notifications
-- ------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "users_select_own_notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read/archived)
CREATE POLICY "users_update_own_notifications" ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System inserts notifications (via service role key or SECURITY DEFINER functions)
-- Employees/managers can also create notifications
CREATE POLICY "staff_insert_notifications" ON notifications
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'employee', 'manager')
  );

-- Admins can manage all notifications
CREATE POLICY "admin_all_notifications" ON notifications
  FOR ALL USING (get_user_role() = 'admin');

-- ------------------------------------------------
-- Adjustment History
-- ------------------------------------------------
ALTER TABLE adjustment_history ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_all_adjustments" ON adjustment_history
  FOR ALL USING (get_user_role() = 'admin');

-- Employees/managers: read and insert
CREATE POLICY "staff_select_adjustments" ON adjustment_history
  FOR SELECT USING (get_user_role() IN ('employee', 'manager'));

CREATE POLICY "staff_insert_adjustments" ON adjustment_history
  FOR INSERT WITH CHECK (get_user_role() IN ('employee', 'manager'));

-- Agents: read adjustments for assigned property contracts
CREATE POLICY "agent_select_adjustments" ON adjustment_history
  FOR SELECT USING (
    get_user_role() = 'agent'
    AND contract_id IN (
      SELECT c.id FROM contracts c
      WHERE is_agent_assigned(c.property_id)
        AND c.deleted_at IS NULL
    )
  );

-- ------------------------------------------------
-- Index Values
-- ------------------------------------------------
ALTER TABLE index_values ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read index values (reference data)
CREATE POLICY "authenticated_read_index_values" ON index_values
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage index values
CREATE POLICY "admin_manage_index_values" ON index_values
  FOR ALL USING (get_user_role() = 'admin');

-- Employees/managers can insert index values (manual fallback when API fails)
CREATE POLICY "staff_insert_index_values" ON index_values
  FOR INSERT WITH CHECK (get_user_role() IN ('employee', 'manager'));

-- ------------------------------------------------
-- Agent Assignments
-- ------------------------------------------------
ALTER TABLE agent_assignments ENABLE ROW LEVEL SECURITY;

-- Admins and managers: full access (manage assignments)
CREATE POLICY "admin_manager_all_assignments" ON agent_assignments
  FOR ALL USING (get_user_role() IN ('admin', 'manager'));

-- Agents: read their own assignments
CREATE POLICY "agent_read_own_assignments" ON agent_assignments
  FOR SELECT USING (
    get_user_role() = 'agent'
    AND agent_id = auth.uid()
  );

-- Employees: read all assignments (for reporting)
CREATE POLICY "staff_read_assignments" ON agent_assignments
  FOR SELECT USING (get_user_role() = 'employee');

-- ============================================
-- SEED DATA (commented out - uncomment for testing)
-- ============================================

-- Promote a user to admin (replace with your email after first signup):
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';

-- Sample index values for testing:
-- INSERT INTO index_values (index_type, period, value, source) VALUES
--   ('ICL', '2024-01', 1.0000, 'manual'),
--   ('ICL', '2024-02', 1.0420, 'manual'),
--   ('ICL', '2024-03', 1.0850, 'manual');
