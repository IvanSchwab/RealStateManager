-- Fix RLS UPDATE policy for organization_invitations
-- The previous policy may have been affected by SELECT policy interaction
-- This explicitly allows soft-delete updates (setting deleted_at)

BEGIN;

DROP POLICY IF EXISTS "organization_invitations_update" ON organization_invitations;

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

COMMENT ON POLICY "organization_invitations_update" ON organization_invitations IS
  'Only organization admins can update invitations in their organization. No deleted_at check in USING to allow soft-delete.';

COMMIT;
