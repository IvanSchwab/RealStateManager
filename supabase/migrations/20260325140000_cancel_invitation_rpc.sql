-- RPC function to cancel an invitation (bypasses RLS issues with client-side timestamps)
CREATE OR REPLACE FUNCTION cancel_invitation(p_invitation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE organization_invitations
  SET status = 'cancelled', deleted_at = now()
  WHERE id = p_invitation_id
  AND organization_id = get_user_organization_id()
  AND get_user_role() = 'admin';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or insufficient permissions';
  END IF;
END;
$$;
