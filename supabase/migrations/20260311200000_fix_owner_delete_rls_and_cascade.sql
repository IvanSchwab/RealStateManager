-- ============================================
-- FIX OWNER DELETE RLS AND CASCADE DELETE
-- ============================================
-- Migration: 20260311200000_fix_owner_delete_rls_and_cascade.sql
-- Description:
--   1. Fixes RLS policies for soft delete (UPDATE) operations on owners and properties
--   2. Creates a function to cascade soft delete properties when an owner is deleted
--
-- The issue was that UPDATE policies needed explicit role checks in USING clause
-- to ensure the user can both read AND update the row in a single operation.

BEGIN;

-- ============================================
-- STEP 1: FIX OWNERS UPDATE POLICY
-- ============================================
-- Drop and recreate the update policy with role check in USING clause

DROP POLICY IF EXISTS "owners_org_update" ON owners;

CREATE POLICY "owners_org_update" ON owners
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

COMMENT ON POLICY "owners_org_update" ON owners IS
  'Only admins and managers can update owners in their organization.';

-- ============================================
-- STEP 2: FIX PROPERTIES UPDATE POLICY
-- ============================================
-- Drop and recreate the update policy with role check in USING clause

DROP POLICY IF EXISTS "properties_org_update" ON properties;

CREATE POLICY "properties_org_update" ON properties
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

COMMENT ON POLICY "properties_org_update" ON properties IS
  'Only admins and managers can update properties in their organization.';

-- ============================================
-- STEP 3: CREATE CASCADE SOFT DELETE FUNCTION
-- ============================================
-- This function soft deletes all properties belonging to an owner
-- It is called from the application layer, not as a trigger

CREATE OR REPLACE FUNCTION cascade_soft_delete_owner_properties(
  p_owner_id UUID,
  p_organization_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Verify the calling user has permission (admin or manager in the org)
  IF get_user_role() NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Insufficient permissions to delete owner properties';
  END IF;

  IF get_user_organization_id() != p_organization_id THEN
    RAISE EXCEPTION 'Cannot delete properties from another organization';
  END IF;

  -- Soft delete all properties belonging to this owner
  UPDATE properties
  SET deleted_at = NOW()
  WHERE owner_id = p_owner_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cascade_soft_delete_owner_properties(UUID, UUID) IS
  'Soft deletes all properties belonging to an owner. Called before soft deleting the owner.
   Contracts referencing these properties are NOT deleted - they remain as historical records.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;
