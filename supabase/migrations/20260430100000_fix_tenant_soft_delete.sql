BEGIN;

-- Fix the UPDATE policy to include role check in USING clause
-- (matching the pattern applied to owners in 20260311200000)
DROP POLICY IF EXISTS "tenants_org_update" ON tenants;

CREATE POLICY "tenants_org_update" ON tenants
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- Create SECURITY DEFINER function for soft delete (bypasses RLS, same as owner pattern)
CREATE OR REPLACE FUNCTION soft_delete_tenant(
  p_tenant_id UUID,
  p_organization_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF get_user_role() NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Insufficient permissions to delete tenant';
  END IF;

  IF get_user_organization_id() != p_organization_id THEN
    RAISE EXCEPTION 'Cannot delete tenant from another organization';
  END IF;

  UPDATE tenants
  SET deleted_at = NOW()
  WHERE id = p_tenant_id
    AND organization_id = p_organization_id
    AND deleted_at IS NULL;
END;
$$;

COMMIT;
