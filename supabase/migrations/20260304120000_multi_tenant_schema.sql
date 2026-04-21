-- ============================================
-- MULTI-TENANT SCHEMA MIGRATION
-- ============================================
-- Migration: 20260304120000_multi_tenant_schema.sql
-- Description: Converts the single-company PIA Gestión to a true
--              multi-tenant architecture where multiple organizations can
--              coexist with completely isolated data.
--
-- This migration:
--   1. Creates the organizations table
--   2. Adds organization_id to profiles
--   3. Adds organization_id to all tenant-scoped tables
--   4. Creates performance indexes
--   5. Creates helper functions for RLS
--   6. Drops all existing RLS policies
--   7. Creates new multi-tenant RLS policies
--
-- IMPORTANT: This migration assumes dev/staging environment with test data only.
--            All existing data will be affected by schema changes.

BEGIN;

-- ============================================
-- STEP 1: CREATE ORGANIZATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

COMMENT ON TABLE organizations IS
  'Real estate companies (inmobiliarias) using the system. Each organization has isolated data.';
COMMENT ON COLUMN organizations.slug IS
  'URL-friendly unique identifier (e.g., "inmobiliaria-rodriguez").';
COMMENT ON COLUMN organizations.settings IS
  'Organization-specific settings and preferences stored as JSON.';
COMMENT ON COLUMN organizations.deleted_at IS
  'Soft delete timestamp. NULL = active, NOT NULL = deleted.';

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
-- Index for active organizations
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- ============================================
-- STEP 2: UPDATE PROFILES TABLE
-- ============================================

-- Add organization_id (nullable initially for onboarding flow)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- Update role constraint to include 'agent' if not already done
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'employee', 'agent'));

-- Index for organization lookups on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);

COMMENT ON COLUMN profiles.organization_id IS
  'The organization this user belongs to. NULL until onboarding is complete.';

-- ============================================
-- STEP 3: ADD organization_id TO RELEVANT TABLES
-- ============================================
-- Since this is dev/staging with test data, we add columns as nullable first,
-- then clean up any existing test data, then make them NOT NULL.

-- 3.1 PROPERTIES
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- 3.2 OWNERS
ALTER TABLE owners
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- 3.3 TENANTS
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- 3.4 CONTRACTS
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- 3.5 PAYMENTS
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- 3.6 DOCUMENTS
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- 3.7 NOTIFICATIONS
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- 3.8 ADJUSTMENT_HISTORY
ALTER TABLE adjustment_history
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- 3.9 AGENT_ASSIGNMENTS
ALTER TABLE agent_assignments
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT;

-- Note: payment_concepts does NOT need organization_id as it derives context from parent payment
-- Note: contract_tenants does NOT need organization_id as it's a junction table with FK constraints
-- Note: index_values does NOT need organization_id as it's shared reference data

-- ============================================
-- STEP 4: CREATE PERFORMANCE INDEXES
-- ============================================

-- 4.1 Basic organization_id indexes for all tenant-scoped tables
CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_owners_organization_id ON owners(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenants_organization_id ON tenants(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_organization_id ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_adjustment_history_organization_id ON adjustment_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_organization_id ON agent_assignments(organization_id);

-- 4.2 Composite indexes for most queried tables (organization_id, deleted_at)
CREATE INDEX IF NOT EXISTS idx_properties_org_deleted
  ON properties(organization_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_owners_org_deleted
  ON owners(organization_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_org_deleted
  ON tenants(organization_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_org_deleted
  ON contracts(organization_id, deleted_at) WHERE deleted_at IS NULL;
-- Payments don't have deleted_at (cascade from contracts), so use org + status
CREATE INDEX IF NOT EXISTS idx_payments_org_status
  ON payments(organization_id, status);

-- ============================================
-- STEP 5: CREATE HELPER FUNCTION - get_user_organization_id()
-- ============================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;

COMMENT ON FUNCTION get_user_organization_id() IS
  'Returns the organization_id of the current authenticated user. '
  'SECURITY DEFINER ensures it bypasses RLS on profiles. Used in all tenant-scoped RLS policies.';

-- ============================================
-- STEP 6: CREATE/UPDATE HELPER FUNCTION - get_user_role()
-- ============================================
-- This function already exists but we recreate it to ensure consistency

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

COMMENT ON FUNCTION get_user_role() IS
  'Returns the role of the current authenticated user. '
  'SECURITY DEFINER ensures it bypasses RLS on profiles. Used in role-based RLS policies.';

-- ============================================
-- STEP 7: DROP ALL EXISTING RLS POLICIES
-- ============================================

-- 7.1 PROFILES policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;

-- 7.2 ORGANIZATIONS policies (if table existed before)
DROP POLICY IF EXISTS "org_select" ON organizations;
DROP POLICY IF EXISTS "org_insert" ON organizations;
DROP POLICY IF EXISTS "org_update" ON organizations;
DROP POLICY IF EXISTS "org_delete" ON organizations;

-- 7.3 PROPERTIES policies
DROP POLICY IF EXISTS "temp_public_read_properties" ON properties;
DROP POLICY IF EXISTS "admin_all_properties" ON properties;
DROP POLICY IF EXISTS "staff_select_properties" ON properties;
DROP POLICY IF EXISTS "staff_insert_properties" ON properties;
DROP POLICY IF EXISTS "staff_update_properties" ON properties;
DROP POLICY IF EXISTS "agent_select_properties" ON properties;
DROP POLICY IF EXISTS "agent_update_properties" ON properties;
DROP POLICY IF EXISTS "temp_authenticated_insert_properties" ON properties;
DROP POLICY IF EXISTS "temp_authenticated_update_properties" ON properties;
DROP POLICY IF EXISTS "org_select" ON properties;
DROP POLICY IF EXISTS "org_insert" ON properties;
DROP POLICY IF EXISTS "org_update" ON properties;
DROP POLICY IF EXISTS "org_delete" ON properties;

-- 7.4 OWNERS policies
DROP POLICY IF EXISTS "admin_all_owners" ON owners;
DROP POLICY IF EXISTS "staff_select_owners" ON owners;
DROP POLICY IF EXISTS "staff_insert_owners" ON owners;
DROP POLICY IF EXISTS "staff_update_owners" ON owners;
DROP POLICY IF EXISTS "agent_select_owners" ON owners;
DROP POLICY IF EXISTS "temp_authenticated_select_owners" ON owners;
DROP POLICY IF EXISTS "temp_authenticated_insert_owners" ON owners;
DROP POLICY IF EXISTS "temp_authenticated_update_owners" ON owners;
DROP POLICY IF EXISTS "org_select" ON owners;
DROP POLICY IF EXISTS "org_insert" ON owners;
DROP POLICY IF EXISTS "org_update" ON owners;
DROP POLICY IF EXISTS "org_delete" ON owners;

-- 7.5 TENANTS policies
DROP POLICY IF EXISTS "admin_all_tenants" ON tenants;
DROP POLICY IF EXISTS "staff_select_tenants" ON tenants;
DROP POLICY IF EXISTS "staff_insert_tenants" ON tenants;
DROP POLICY IF EXISTS "staff_update_tenants" ON tenants;
DROP POLICY IF EXISTS "agent_select_tenants" ON tenants;
DROP POLICY IF EXISTS "org_select" ON tenants;
DROP POLICY IF EXISTS "org_insert" ON tenants;
DROP POLICY IF EXISTS "org_update" ON tenants;
DROP POLICY IF EXISTS "org_delete" ON tenants;

-- 7.6 CONTRACTS policies
DROP POLICY IF EXISTS "admin_all_contracts" ON contracts;
DROP POLICY IF EXISTS "staff_select_contracts" ON contracts;
DROP POLICY IF EXISTS "staff_insert_contracts" ON contracts;
DROP POLICY IF EXISTS "staff_update_contracts" ON contracts;
DROP POLICY IF EXISTS "agent_select_contracts" ON contracts;
DROP POLICY IF EXISTS "org_select" ON contracts;
DROP POLICY IF EXISTS "org_insert" ON contracts;
DROP POLICY IF EXISTS "org_update" ON contracts;
DROP POLICY IF EXISTS "org_delete" ON contracts;

-- 7.7 CONTRACT_TENANTS policies
DROP POLICY IF EXISTS "admin_all_contract_tenants" ON contract_tenants;
DROP POLICY IF EXISTS "staff_select_contract_tenants" ON contract_tenants;
DROP POLICY IF EXISTS "staff_insert_contract_tenants" ON contract_tenants;
DROP POLICY IF EXISTS "staff_delete_contract_tenants" ON contract_tenants;
DROP POLICY IF EXISTS "agent_select_contract_tenants" ON contract_tenants;
DROP POLICY IF EXISTS "org_select" ON contract_tenants;
DROP POLICY IF EXISTS "org_insert" ON contract_tenants;
DROP POLICY IF EXISTS "org_update" ON contract_tenants;
DROP POLICY IF EXISTS "org_delete" ON contract_tenants;

-- 7.8 PAYMENTS policies
DROP POLICY IF EXISTS "admin_all_payments" ON payments;
DROP POLICY IF EXISTS "staff_select_payments" ON payments;
DROP POLICY IF EXISTS "staff_insert_payments" ON payments;
DROP POLICY IF EXISTS "staff_update_payments" ON payments;
DROP POLICY IF EXISTS "agent_select_payments" ON payments;
DROP POLICY IF EXISTS "org_select" ON payments;
DROP POLICY IF EXISTS "org_insert" ON payments;
DROP POLICY IF EXISTS "org_update" ON payments;
DROP POLICY IF EXISTS "org_delete" ON payments;

-- 7.9 PAYMENT_CONCEPTS policies
DROP POLICY IF EXISTS "admin_all_payment_concepts" ON payment_concepts;
DROP POLICY IF EXISTS "staff_select_payment_concepts" ON payment_concepts;
DROP POLICY IF EXISTS "staff_insert_payment_concepts" ON payment_concepts;
DROP POLICY IF EXISTS "staff_update_payment_concepts" ON payment_concepts;
DROP POLICY IF EXISTS "staff_delete_payment_concepts" ON payment_concepts;
DROP POLICY IF EXISTS "agent_select_payment_concepts" ON payment_concepts;
DROP POLICY IF EXISTS "org_select" ON payment_concepts;
DROP POLICY IF EXISTS "org_insert" ON payment_concepts;
DROP POLICY IF EXISTS "org_update" ON payment_concepts;
DROP POLICY IF EXISTS "org_delete" ON payment_concepts;

-- 7.10 DOCUMENTS policies
DROP POLICY IF EXISTS "admin_all_documents" ON documents;
DROP POLICY IF EXISTS "staff_select_documents" ON documents;
DROP POLICY IF EXISTS "staff_insert_documents" ON documents;
DROP POLICY IF EXISTS "staff_delete_own_documents" ON documents;
DROP POLICY IF EXISTS "agent_select_documents" ON documents;
DROP POLICY IF EXISTS "org_select" ON documents;
DROP POLICY IF EXISTS "org_insert" ON documents;
DROP POLICY IF EXISTS "org_update" ON documents;
DROP POLICY IF EXISTS "org_delete" ON documents;

-- 7.11 NOTIFICATIONS policies
DROP POLICY IF EXISTS "users_select_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;
DROP POLICY IF EXISTS "staff_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "admin_all_notifications" ON notifications;
DROP POLICY IF EXISTS "org_select" ON notifications;
DROP POLICY IF EXISTS "org_insert" ON notifications;
DROP POLICY IF EXISTS "org_update" ON notifications;
DROP POLICY IF EXISTS "org_delete" ON notifications;

-- 7.12 ADJUSTMENT_HISTORY policies
DROP POLICY IF EXISTS "admin_all_adjustments" ON adjustment_history;
DROP POLICY IF EXISTS "staff_select_adjustments" ON adjustment_history;
DROP POLICY IF EXISTS "staff_insert_adjustments" ON adjustment_history;
DROP POLICY IF EXISTS "agent_select_adjustments" ON adjustment_history;
DROP POLICY IF EXISTS "org_select" ON adjustment_history;
DROP POLICY IF EXISTS "org_insert" ON adjustment_history;
DROP POLICY IF EXISTS "org_update" ON adjustment_history;
DROP POLICY IF EXISTS "org_delete" ON adjustment_history;

-- 7.13 AGENT_ASSIGNMENTS policies
DROP POLICY IF EXISTS "admin_manager_all_assignments" ON agent_assignments;
DROP POLICY IF EXISTS "agent_read_own_assignments" ON agent_assignments;
DROP POLICY IF EXISTS "staff_read_assignments" ON agent_assignments;
DROP POLICY IF EXISTS "org_select" ON agent_assignments;
DROP POLICY IF EXISTS "org_insert" ON agent_assignments;
DROP POLICY IF EXISTS "org_update" ON agent_assignments;
DROP POLICY IF EXISTS "org_delete" ON agent_assignments;

-- 7.14 INDEX_VALUES policies
DROP POLICY IF EXISTS "authenticated_read_index_values" ON index_values;
DROP POLICY IF EXISTS "admin_manage_index_values" ON index_values;
DROP POLICY IF EXISTS "staff_insert_index_values" ON index_values;
DROP POLICY IF EXISTS "org_select" ON index_values;
DROP POLICY IF EXISTS "org_insert" ON index_values;
DROP POLICY IF EXISTS "org_update" ON index_values;
DROP POLICY IF EXISTS "org_delete" ON index_values;

-- ============================================
-- STEP 8: ENABLE RLS ON ALL TABLES AND CREATE NEW POLICIES
-- ============================================

-- ------------------------------------------------
-- 8.1 ORGANIZATIONS
-- ------------------------------------------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- SELECT: Admins of the org can view their organization
CREATE POLICY "organizations_select" ON organizations
  FOR SELECT TO authenticated
  USING (
    id = get_user_organization_id()
    AND deleted_at IS NULL
  );

-- UPDATE: Only admins can update their organization
CREATE POLICY "organizations_update" ON organizations
  FOR UPDATE TO authenticated
  USING (
    id = get_user_organization_id()
    AND get_user_role() = 'admin'
  )
  WITH CHECK (
    id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

-- INSERT: Not allowed via RLS (handled by service role in onboarding)
-- DELETE: Not allowed via RLS (soft delete only, via admin)

COMMENT ON POLICY "organizations_select" ON organizations IS
  'Users can only view their own organization.';
COMMENT ON POLICY "organizations_update" ON organizations IS
  'Only organization admins can update organization settings.';

-- ------------------------------------------------
-- 8.2 PROFILES
-- ------------------------------------------------
-- RLS already enabled from initial setup, no need to ALTER

-- SELECT: Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- SELECT: Admins and managers can read all profiles in their org
CREATE POLICY "profiles_select_org" ON profiles
  FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- UPDATE: Users can update their own profile (but not role or organization_id)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Note: INSERT and DELETE on profiles are handled by Supabase Auth trigger, not user actions

COMMENT ON POLICY "profiles_select_own" ON profiles IS
  'Users can view their own profile.';
COMMENT ON POLICY "profiles_select_org" ON profiles IS
  'Admins and managers can view all profiles in their organization.';
COMMENT ON POLICY "profiles_update_own" ON profiles IS
  'Users can update their own profile data.';

-- ------------------------------------------------
-- 8.3 PROPERTIES
-- ------------------------------------------------
-- RLS already enabled

-- SELECT: all authenticated users in the same org
CREATE POLICY "properties_org_select" ON properties
  FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND deleted_at IS NULL
  );

-- INSERT: managers and admins only
CREATE POLICY "properties_org_insert" ON properties
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- UPDATE: managers and admins only
CREATE POLICY "properties_org_update" ON properties
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- DELETE (soft delete): managers and admins only
CREATE POLICY "properties_org_delete" ON properties
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------
-- 8.4 OWNERS
-- ------------------------------------------------
-- RLS already enabled

-- SELECT: all authenticated users in the same org
CREATE POLICY "owners_org_select" ON owners
  FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND deleted_at IS NULL
  );

-- INSERT: managers and admins only
CREATE POLICY "owners_org_insert" ON owners
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- UPDATE: managers and admins only
CREATE POLICY "owners_org_update" ON owners
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- DELETE (soft delete): managers and admins only
CREATE POLICY "owners_org_delete" ON owners
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------
-- 8.5 TENANTS
-- ------------------------------------------------
-- RLS already enabled

-- SELECT: all authenticated users in the same org
CREATE POLICY "tenants_org_select" ON tenants
  FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND deleted_at IS NULL
  );

-- INSERT: managers and admins only
CREATE POLICY "tenants_org_insert" ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- UPDATE: managers and admins only
CREATE POLICY "tenants_org_update" ON tenants
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- DELETE (soft delete): managers and admins only
CREATE POLICY "tenants_org_delete" ON tenants
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------
-- 8.6 CONTRACTS
-- ------------------------------------------------
-- RLS already enabled

-- SELECT: all authenticated users in the same org
CREATE POLICY "contracts_org_select" ON contracts
  FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND deleted_at IS NULL
  );

-- INSERT: managers and admins only
CREATE POLICY "contracts_org_insert" ON contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- UPDATE: managers and admins only
CREATE POLICY "contracts_org_update" ON contracts
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- DELETE (soft delete): managers and admins only
CREATE POLICY "contracts_org_delete" ON contracts
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------
-- 8.7 CONTRACT_TENANTS (junction table)
-- ------------------------------------------------
-- RLS already enabled
-- This table doesn't have organization_id, access is derived from contract

-- SELECT: users who can access the parent contract
CREATE POLICY "contract_tenants_org_select" ON contract_tenants
  FOR SELECT TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = get_user_organization_id()
        AND deleted_at IS NULL
    )
  );

-- INSERT: managers and admins only, for contracts in their org
CREATE POLICY "contract_tenants_org_insert" ON contract_tenants
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('admin', 'manager')
    AND contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = get_user_organization_id()
    )
  );

-- UPDATE: managers and admins only
CREATE POLICY "contract_tenants_org_update" ON contract_tenants
  FOR UPDATE TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    get_user_role() IN ('admin', 'manager')
    AND contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = get_user_organization_id()
    )
  );

-- DELETE: managers and admins only
CREATE POLICY "contract_tenants_org_delete" ON contract_tenants
  FOR DELETE TO authenticated
  USING (
    get_user_role() IN ('admin', 'manager')
    AND contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = get_user_organization_id()
    )
  );

-- ------------------------------------------------
-- 8.8 PAYMENTS
-- ------------------------------------------------
-- RLS already enabled
-- Payments don't have deleted_at (cascade from contracts)

-- SELECT: all authenticated users in the same org
CREATE POLICY "payments_org_select" ON payments
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

-- INSERT: managers and admins only
CREATE POLICY "payments_org_insert" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- UPDATE: managers and admins only
CREATE POLICY "payments_org_update" ON payments
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- DELETE: managers and admins only
CREATE POLICY "payments_org_delete" ON payments
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------
-- 8.9 PAYMENT_CONCEPTS
-- ------------------------------------------------
-- RLS already enabled
-- Derives org context from parent payment

-- SELECT: users who can access the parent payment
CREATE POLICY "payment_concepts_org_select" ON payment_concepts
  FOR SELECT TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM payments
      WHERE organization_id = get_user_organization_id()
    )
  );

-- INSERT: managers and admins only
CREATE POLICY "payment_concepts_org_insert" ON payment_concepts
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('admin', 'manager')
    AND payment_id IN (
      SELECT id FROM payments
      WHERE organization_id = get_user_organization_id()
    )
  );

-- UPDATE: managers and admins only
CREATE POLICY "payment_concepts_org_update" ON payment_concepts
  FOR UPDATE TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM payments
      WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    get_user_role() IN ('admin', 'manager')
    AND payment_id IN (
      SELECT id FROM payments
      WHERE organization_id = get_user_organization_id()
    )
  );

-- DELETE: managers and admins only
CREATE POLICY "payment_concepts_org_delete" ON payment_concepts
  FOR DELETE TO authenticated
  USING (
    get_user_role() IN ('admin', 'manager')
    AND payment_id IN (
      SELECT id FROM payments
      WHERE organization_id = get_user_organization_id()
    )
  );

-- ------------------------------------------------
-- 8.10 DOCUMENTS
-- ------------------------------------------------
-- RLS already enabled

-- SELECT: all authenticated users in the same org
CREATE POLICY "documents_org_select" ON documents
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

-- INSERT: managers and admins only
CREATE POLICY "documents_org_insert" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- UPDATE: managers and admins only
CREATE POLICY "documents_org_update" ON documents
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- DELETE: managers and admins only
CREATE POLICY "documents_org_delete" ON documents
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------
-- 8.11 NOTIFICATIONS
-- ------------------------------------------------
-- RLS already enabled

-- SELECT: users can see their own notifications within their org
CREATE POLICY "notifications_org_select" ON notifications
  FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND user_id = auth.uid()
  );

-- INSERT: system only (service role) - no user can insert directly
-- Service role bypasses RLS, so no INSERT policy needed for users

-- UPDATE: users can update their own notifications (mark read/archived)
CREATE POLICY "notifications_org_update" ON notifications
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND user_id = auth.uid()
  );

-- DELETE: managers and admins only
CREATE POLICY "notifications_org_delete" ON notifications
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------
-- 8.12 ADJUSTMENT_HISTORY
-- ------------------------------------------------
-- RLS already enabled

-- SELECT: all authenticated users in the same org
CREATE POLICY "adjustment_history_org_select" ON adjustment_history
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

-- INSERT: managers and admins only
CREATE POLICY "adjustment_history_org_insert" ON adjustment_history
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- UPDATE: managers and admins only
CREATE POLICY "adjustment_history_org_update" ON adjustment_history
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- DELETE: managers and admins only
CREATE POLICY "adjustment_history_org_delete" ON adjustment_history
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------
-- 8.13 AGENT_ASSIGNMENTS
-- ------------------------------------------------
-- RLS already enabled

-- SELECT: all authenticated users in the same org
CREATE POLICY "agent_assignments_org_select" ON agent_assignments
  FOR SELECT TO authenticated
  USING (organization_id = get_user_organization_id());

-- INSERT: managers and admins only
CREATE POLICY "agent_assignments_org_insert" ON agent_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- UPDATE: managers and admins only
CREATE POLICY "agent_assignments_org_update" ON agent_assignments
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- DELETE: managers and admins only
CREATE POLICY "agent_assignments_org_delete" ON agent_assignments
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- ------------------------------------------------
-- 8.14 INDEX_VALUES (shared reference data)
-- ------------------------------------------------
-- RLS already enabled

-- SELECT: all authenticated users can read (shared reference data, not org-scoped)
CREATE POLICY "index_values_select" ON index_values
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: admins only
CREATE POLICY "index_values_insert" ON index_values
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

-- UPDATE: admins only
CREATE POLICY "index_values_update" ON index_values
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (get_user_role() = 'admin');

-- DELETE: admins only
CREATE POLICY "index_values_delete" ON index_values
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ============================================
-- STEP 9: UPDATE handle_new_user() TRIGGER
-- ============================================
-- Update the auth trigger to NOT set organization_id (will be set during onboarding)

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, organization_id)
  VALUES (NEW.id, NEW.email, 'employee', NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS
  'Creates a profile record when a new user signs up. '
  'organization_id is NULL until onboarding is complete.';

-- ============================================
-- STEP 10: HELPER FUNCTION FOR AGENT ASSIGNMENT CHECK
-- ============================================
-- Update existing function to be organization-aware

CREATE OR REPLACE FUNCTION is_agent_assigned(property_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agent_assignments aa
    WHERE aa.agent_id = auth.uid()
      AND aa.property_id = property_uuid
      AND aa.organization_id = get_user_organization_id()
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_agent_assigned(UUID) IS
  'Returns TRUE if the current user is assigned as agent to the given property within their organization.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;

-- ============================================
-- POST-MIGRATION NOTES
-- ============================================
--
-- After applying this migration:
--
-- 1. Create an organization for existing users:
--    INSERT INTO organizations (name, slug) VALUES ('Mi Inmobiliaria', 'mi-inmobiliaria');
--
-- 2. Update existing data to belong to the organization:
--    UPDATE profiles SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
--    UPDATE properties SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
--    UPDATE owners SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
--    UPDATE tenants SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
--    UPDATE contracts SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
--    UPDATE payments SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
--    UPDATE documents SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
--    UPDATE notifications SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
--    UPDATE adjustment_history SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
--    UPDATE agent_assignments SET organization_id = '<org-uuid>' WHERE organization_id IS NULL;
--
-- 3. Make organization_id NOT NULL on all tables (optional, after data migration):
--    ALTER TABLE properties ALTER COLUMN organization_id SET NOT NULL;
--    ALTER TABLE owners ALTER COLUMN organization_id SET NOT NULL;
--    -- etc.
--
-- 4. Implement the onboarding flow in the application to:
--    - Create new organizations (via service role)
--    - Assign users to organizations
--    - Set the initial admin user
