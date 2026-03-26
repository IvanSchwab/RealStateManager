-- RPC to remove a member from the organization (soft delete)
CREATE OR REPLACE FUNCTION remove_member(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_caller_role TEXT;
BEGIN
  -- Get caller's org and role
  SELECT organization_id, role INTO v_org_id, v_caller_role
  FROM profiles
  WHERE id = auth.uid();

  -- Only admins can remove members
  IF v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Cannot remove yourself
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself';
  END IF;

  -- Target must be in the same org
  -- Soft delete: clear organization_id and role
  UPDATE profiles
  SET organization_id = NULL,
      role = 'collaborator'
  WHERE id = p_user_id
    AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member not found in your organization';
  END IF;
END;
$$;
