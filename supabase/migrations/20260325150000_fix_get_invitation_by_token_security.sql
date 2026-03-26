-- Fix get_invitation_by_token to use SECURITY DEFINER so unauthenticated users can look up invitations
CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token UUID)
RETURNS TABLE (
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
SECURITY DEFINER
SET search_path = public
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
