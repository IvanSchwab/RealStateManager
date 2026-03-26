-- ============================================
-- INVITATION HELPER RPCs
-- ============================================
-- Migration: 20260325110000_invitation_rpcs.sql
-- Description:
--   1. Creates regenerate_invitation_token RPC for resending invitations
--   2. Creates check_email_exists RPC for checking if email is already registered

BEGIN;

-- ============================================
-- STEP 1: regenerate_invitation_token RPC
-- ============================================
-- Regenerates the token for an invitation, updates expires_at, and sets status to pending
-- Returns the new token and expiration date

CREATE OR REPLACE FUNCTION regenerate_invitation_token(p_invitation_id UUID)
RETURNS TABLE(new_token UUID, new_expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_new_token UUID;
  v_new_expires_at TIMESTAMPTZ;
BEGIN
  -- Get the user's organization
  v_org_id := get_user_organization_id();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to an organization';
  END IF;

  -- Check if user is admin
  IF get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can regenerate invitation tokens';
  END IF;

  -- Generate new values
  v_new_token := gen_random_uuid();
  v_new_expires_at := now() + INTERVAL '7 days';

  -- Update the invitation
  UPDATE organization_invitations
  SET
    token = v_new_token,
    expires_at = v_new_expires_at,
    status = 'pending'
  WHERE id = p_invitation_id
    AND organization_id = v_org_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or does not belong to your organization';
  END IF;

  RETURN QUERY SELECT v_new_token, v_new_expires_at;
END;
$$;

COMMENT ON FUNCTION regenerate_invitation_token(UUID) IS
  'Regenerates the token for an invitation, extends expiration by 7 days, and sets status to pending. '
  'Only organization admins can call this function.';

-- ============================================
-- STEP 2: check_email_exists RPC
-- ============================================
-- Checks if an email already exists in auth.users
-- Returns true if exists, false otherwise

CREATE OR REPLACE FUNCTION check_email_exists(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = lower(trim(p_email))
  );
END;
$$;

COMMENT ON FUNCTION check_email_exists(TEXT) IS
  'Checks if an email already exists as a registered user. '
  'SECURITY DEFINER allows checking auth.users which is normally restricted.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;
