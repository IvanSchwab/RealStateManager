-- ============================================
-- ROLE SIMPLIFICATION AND ORGANIZATION INVITATIONS
-- ============================================
-- Migration: 20260325100000_role_simplification_and_invitations.sql
-- Description:
--   1a. Simplifies roles from (admin, manager, employee, agent) to (admin, collaborator, owner)
--   1b. Updates get_user_role() - no change needed, it just returns the value
--   1c. Updates all RLS policies that reference old roles
--   1d. Creates organization_invitations table
--   1e. Adds RLS policies for organization_invitations

BEGIN;

-- ============================================
-- STEP 1a: REPLACE ROLE VALUES ON PROFILES
-- ============================================

-- Drop existing role check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Update any existing rows to map old roles to new ones
-- manager, employee, agent -> collaborator
UPDATE profiles SET role = 'collaborator' WHERE role IN ('manager', 'employee', 'agent');

-- Add new constraint with simplified roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'collaborator', 'owner'));

COMMENT ON COLUMN profiles.role IS
  'User role within the organization: admin (full access), collaborator (standard access), owner (property owner - future use).';

-- ============================================
-- STEP 1b: get_user_role() - NO CHANGE NEEDED
-- ============================================
-- The function just returns the role value, which is already correct

-- ============================================
-- STEP 1c: UPDATE ALL RLS POLICIES WITH OLD ROLE CHECKS
-- ============================================

-- ------------------------------------------------
-- PROFILES - profiles_select_org
-- ------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_org" ON profiles;
CREATE POLICY "profiles_select_org" ON profiles
  FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

COMMENT ON POLICY "profiles_select_org" ON profiles IS
  'Admins and collaborators can view all profiles in their organization.';

-- ------------------------------------------------
-- PROPERTIES
-- ------------------------------------------------
DROP POLICY IF EXISTS "properties_org_insert" ON properties;
CREATE POLICY "properties_org_insert" ON properties
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "properties_org_update" ON properties;
CREATE POLICY "properties_org_update" ON properties
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "properties_org_delete" ON properties;
CREATE POLICY "properties_org_delete" ON properties
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

-- ------------------------------------------------
-- OWNERS
-- ------------------------------------------------
DROP POLICY IF EXISTS "owners_org_insert" ON owners;
CREATE POLICY "owners_org_insert" ON owners
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "owners_org_update" ON owners;
CREATE POLICY "owners_org_update" ON owners
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "owners_org_delete" ON owners;
CREATE POLICY "owners_org_delete" ON owners
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

-- ------------------------------------------------
-- TENANTS
-- ------------------------------------------------
DROP POLICY IF EXISTS "tenants_org_insert" ON tenants;
CREATE POLICY "tenants_org_insert" ON tenants
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "tenants_org_update" ON tenants;
CREATE POLICY "tenants_org_update" ON tenants
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "tenants_org_delete" ON tenants;
CREATE POLICY "tenants_org_delete" ON tenants
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

-- ------------------------------------------------
-- CONTRACTS
-- ------------------------------------------------
DROP POLICY IF EXISTS "contracts_org_insert" ON contracts;
CREATE POLICY "contracts_org_insert" ON contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "contracts_org_update" ON contracts;
CREATE POLICY "contracts_org_update" ON contracts
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "contracts_org_delete" ON contracts;
CREATE POLICY "contracts_org_delete" ON contracts
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

-- ------------------------------------------------
-- CONTRACT_TENANTS
-- ------------------------------------------------
DROP POLICY IF EXISTS "contract_tenants_org_insert" ON contract_tenants;
CREATE POLICY "contract_tenants_org_insert" ON contract_tenants
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('admin', 'collaborator')
    AND contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "contract_tenants_org_update" ON contract_tenants;
CREATE POLICY "contract_tenants_org_update" ON contract_tenants
  FOR UPDATE TO authenticated
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    get_user_role() IN ('admin', 'collaborator')
    AND contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "contract_tenants_org_delete" ON contract_tenants;
CREATE POLICY "contract_tenants_org_delete" ON contract_tenants
  FOR DELETE TO authenticated
  USING (
    get_user_role() IN ('admin', 'collaborator')
    AND contract_id IN (
      SELECT id FROM contracts
      WHERE organization_id = get_user_organization_id()
    )
  );

-- ------------------------------------------------
-- PAYMENTS
-- ------------------------------------------------
DROP POLICY IF EXISTS "payments_org_insert" ON payments;
CREATE POLICY "payments_org_insert" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "payments_org_update" ON payments;
CREATE POLICY "payments_org_update" ON payments
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "payments_org_delete" ON payments;
CREATE POLICY "payments_org_delete" ON payments
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

-- ------------------------------------------------
-- PAYMENT_CONCEPTS
-- ------------------------------------------------
DROP POLICY IF EXISTS "payment_concepts_org_insert" ON payment_concepts;
CREATE POLICY "payment_concepts_org_insert" ON payment_concepts
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('admin', 'collaborator')
    AND payment_id IN (
      SELECT id FROM payments
      WHERE organization_id = get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "payment_concepts_org_update" ON payment_concepts;
CREATE POLICY "payment_concepts_org_update" ON payment_concepts
  FOR UPDATE TO authenticated
  USING (
    payment_id IN (
      SELECT id FROM payments
      WHERE organization_id = get_user_organization_id()
    )
  )
  WITH CHECK (
    get_user_role() IN ('admin', 'collaborator')
    AND payment_id IN (
      SELECT id FROM payments
      WHERE organization_id = get_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "payment_concepts_org_delete" ON payment_concepts;
CREATE POLICY "payment_concepts_org_delete" ON payment_concepts
  FOR DELETE TO authenticated
  USING (
    get_user_role() IN ('admin', 'collaborator')
    AND payment_id IN (
      SELECT id FROM payments
      WHERE organization_id = get_user_organization_id()
    )
  );

-- ------------------------------------------------
-- DOCUMENTS
-- ------------------------------------------------
DROP POLICY IF EXISTS "documents_org_insert" ON documents;
CREATE POLICY "documents_org_insert" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "documents_org_update" ON documents;
CREATE POLICY "documents_org_update" ON documents
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "documents_org_delete" ON documents;
CREATE POLICY "documents_org_delete" ON documents
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

-- ------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------
DROP POLICY IF EXISTS "notifications_org_delete" ON notifications;
CREATE POLICY "notifications_org_delete" ON notifications
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

-- ------------------------------------------------
-- ADJUSTMENT_HISTORY
-- ------------------------------------------------
DROP POLICY IF EXISTS "adjustment_history_org_insert" ON adjustment_history;
CREATE POLICY "adjustment_history_org_insert" ON adjustment_history
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "adjustment_history_org_update" ON adjustment_history;
CREATE POLICY "adjustment_history_org_update" ON adjustment_history
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "adjustment_history_org_delete" ON adjustment_history;
CREATE POLICY "adjustment_history_org_delete" ON adjustment_history
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

-- ------------------------------------------------
-- AGENT_ASSIGNMENTS
-- ------------------------------------------------
DROP POLICY IF EXISTS "agent_assignments_org_insert" ON agent_assignments;
CREATE POLICY "agent_assignments_org_insert" ON agent_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "agent_assignments_org_update" ON agent_assignments;
CREATE POLICY "agent_assignments_org_update" ON agent_assignments
  FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

DROP POLICY IF EXISTS "agent_assignments_org_delete" ON agent_assignments;
CREATE POLICY "agent_assignments_org_delete" ON agent_assignments
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

-- ------------------------------------------------
-- CONTRACT_DOCUMENTS
-- ------------------------------------------------
DROP POLICY IF EXISTS "contract_documents_org_update" ON contract_documents;
CREATE POLICY "contract_documents_org_update" ON contract_documents
  FOR UPDATE TO authenticated
  USING (
    org_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  )
  WITH CHECK (
    org_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'collaborator')
  );

-- ============================================
-- STEP 1d: CREATE ORGANIZATION_INVITATIONS TABLE
-- ============================================

CREATE TABLE organization_invitations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('admin', 'collaborator')),
  token            UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by       UUID NOT NULL REFERENCES profiles(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at      TIMESTAMPTZ,
  deleted_at       TIMESTAMPTZ
);

-- Add comments for documentation
COMMENT ON TABLE organization_invitations IS
  'Stores invitations for users to join an organization. Invitations expire after 7 days.';
COMMENT ON COLUMN organization_invitations.email IS
  'Email address of the invited user.';
COMMENT ON COLUMN organization_invitations.role IS
  'Role the user will have when accepting the invitation (admin or collaborator).';
COMMENT ON COLUMN organization_invitations.token IS
  'Unique token used in the invitation link for verification.';
COMMENT ON COLUMN organization_invitations.invited_by IS
  'Profile ID of the admin who sent the invitation.';
COMMENT ON COLUMN organization_invitations.status IS
  'Current status: pending, accepted, expired, or cancelled.';
COMMENT ON COLUMN organization_invitations.expires_at IS
  'Invitation expiration timestamp (7 days from creation by default).';
COMMENT ON COLUMN organization_invitations.deleted_at IS
  'Soft delete timestamp. NULL = active, NOT NULL = deleted.';

-- Create indexes
CREATE INDEX idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX idx_organization_invitations_token ON organization_invitations(token);
CREATE INDEX idx_organization_invitations_status ON organization_invitations(status);

-- Prevent duplicate pending invitations for the same email in the same org
CREATE UNIQUE INDEX org_invitations_unique_pending
  ON organization_invitations (organization_id, email)
  WHERE status = 'pending' AND deleted_at IS NULL;

-- ============================================
-- STEP 1e: RLS POLICIES FOR ORGANIZATION_INVITATIONS
-- ============================================

ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users in the same org can read invitations (for listing)
CREATE POLICY "organization_invitations_select" ON organization_invitations
  FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND deleted_at IS NULL
  );

-- INSERT: only admin role can create invitations, must match caller's org
CREATE POLICY "organization_invitations_insert" ON organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
    AND invited_by = auth.uid()
  );

-- UPDATE: only admin role can update invitations in their org
CREATE POLICY "organization_invitations_update" ON organization_invitations
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

-- DELETE: not needed, use soft delete (deleted_at)

COMMENT ON POLICY "organization_invitations_select" ON organization_invitations IS
  'Authenticated users can view invitations from their organization.';
COMMENT ON POLICY "organization_invitations_insert" ON organization_invitations IS
  'Only organization admins can create invitations for their organization.';
COMMENT ON POLICY "organization_invitations_update" ON organization_invitations IS
  'Only organization admins can update invitations in their organization.';

-- ============================================
-- UPDATE handle_new_user() TO SET ROLE AS collaborator
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, organization_id)
  VALUES (NEW.id, NEW.email, 'collaborator', NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS
  'Creates a profile record when a new user signs up with collaborator role. '
  'organization_id is NULL until onboarding is complete or invitation is accepted.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;
