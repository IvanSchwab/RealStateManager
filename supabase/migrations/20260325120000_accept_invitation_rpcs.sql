-- ============================================
-- ACCEPT INVITATION RPCs
-- ============================================
-- Migration: 20260325120000_accept_invitation_rpcs.sql
-- Description:
--   1. Creates get_invitation_by_token RPC for fetching invitation details (public)
--   2. Creates accept_invitation RPC for accepting invitations after user registers/logs in

BEGIN;

-- ============================================
-- STEP 1: get_invitation_by_token RPC (Public)
-- ============================================
-- Fetches invitation details by token for the accept invite page
-- Returns NULL if not found, expired, or already accepted/cancelled
-- This is a public function (SECURITY INVOKER) accessible without authentication

CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token UUID)
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  organization_name TEXT,
  email TEXT,
  role TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  invited_by_name TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER  -- Public access, no auth required
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.id,
    oi.organization_id,
    o.name::TEXT as organization_name,
    oi.email::TEXT,
    oi.role::TEXT,
    oi.status::TEXT,
    oi.expires_at,
    COALESCE(p.full_name, p.email, 'Admin')::TEXT as invited_by_name
  FROM organization_invitations oi
  JOIN organizations o ON o.id = oi.organization_id
  LEFT JOIN profiles p ON p.id = oi.invited_by
  WHERE oi.token = p_token
    AND oi.deleted_at IS NULL
    AND oi.status = 'pending'
    AND oi.expires_at > now();
END;
$$;

COMMENT ON FUNCTION get_invitation_by_token(UUID) IS
  'Fetches invitation details by token. Returns NULL if token is invalid, expired, or already used. '
  'Public function accessible without authentication.';

-- ============================================
-- STEP 2: accept_invitation RPC (Authenticated)
-- ============================================
-- Accepts an invitation for the current user
-- Updates invitation status and assigns user to organization with specified role

CREATE OR REPLACE FUNCTION accept_invitation(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_invitation RECORD;
  v_current_org_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Get invitation
  SELECT * INTO v_invitation
  FROM organization_invitations
  WHERE token = p_token
    AND deleted_at IS NULL
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already used');
  END IF;

  -- Check if expired
  IF v_invitation.expires_at < now() THEN
    -- Update status to expired
    UPDATE organization_invitations SET status = 'expired' WHERE id = v_invitation.id;
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- Verify email matches (case insensitive)
  IF lower(trim(v_user_email)) != lower(trim(v_invitation.email)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Email mismatch',
      'expected_email', v_invitation.email
    );
  END IF;

  -- Check if user already belongs to an organization
  SELECT organization_id INTO v_current_org_id FROM profiles WHERE id = v_user_id;

  IF v_current_org_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User already belongs to an organization'
    );
  END IF;

  -- Update user profile with organization and role
  UPDATE profiles
  SET
    organization_id = v_invitation.organization_id,
    role = v_invitation.role
  WHERE id = v_user_id;

  -- Mark invitation as accepted
  UPDATE organization_invitations
  SET
    status = 'accepted',
    accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', v_invitation.organization_id,
    'role', v_invitation.role
  );
END;
$$;

COMMENT ON FUNCTION accept_invitation(UUID) IS
  'Accepts an invitation for the current authenticated user. '
  'Validates email match, checks expiration, and assigns user to organization with specified role.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;
