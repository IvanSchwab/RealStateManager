-- ============================================
-- FIX OWNER SOFT DELETE - ADD MISSING OWNER UPDATE
-- ============================================
-- Migration: 20260312100000_fix_owner_soft_delete.sql
-- Description:
--   The previous cascade_soft_delete_owner_properties function only soft-deleted
--   the properties but forgot to soft-delete the owner itself.
--   This migration fixes that by adding the owner soft delete.
--
-- Bug: Owner was never being soft-deleted because the function only updated properties.

BEGIN;

-- Drop and recreate the function with the fix
CREATE OR REPLACE FUNCTION cascade_soft_delete_owner_properties(
  p_owner_id UUID,
  p_organization_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_properties_count INTEGER;
BEGIN
  -- Verify the calling user has permission (admin or manager in the org)
  IF get_user_role() NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Insufficient permissions to delete owner';
  END IF;

  IF get_user_organization_id() != p_organization_id THEN
    RAISE EXCEPTION 'Cannot delete owner from another organization';
  END IF;

  -- Step 1: Soft delete all properties belonging to this owner
  UPDATE properties
  SET deleted_at = NOW()
  WHERE owner_id = p_owner_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL;

  GET DIAGNOSTICS deleted_properties_count = ROW_COUNT;

  -- Step 2: Soft delete the owner itself
  UPDATE owners
  SET deleted_at = NOW()
  WHERE id = p_owner_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL;

  RETURN deleted_properties_count;
END;
$$;

COMMENT ON FUNCTION cascade_soft_delete_owner_properties(UUID, UUID) IS
  'Soft deletes an owner and all their properties. Returns the count of deleted properties.
   Contracts referencing these properties are NOT deleted - they remain as historical records.';

COMMIT;
