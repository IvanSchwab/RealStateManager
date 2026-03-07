-- ============================================
-- CREATE ORGANIZATION RPC FUNCTION
-- ============================================
-- Migration: 20260305100000_create_organization_rpc.sql
-- Description: Creates a SECURITY DEFINER function that allows authenticated
--              users to create their organization during onboarding.
--              This bypasses the RLS INSERT restriction on organizations.
--
-- The function:
--   1. Validates the user doesn't already have an organization
--   2. Validates the slug is unique
--   3. Creates the organization
--   4. Updates the user's profile with organization_id and role='admin'
--   5. Returns the created organization

BEGIN;

-- ============================================
-- CREATE ORGANIZATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION create_organization(
  org_name TEXT,
  org_slug TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  existing_org_id UUID;
  slug_exists BOOLEAN;
  result JSON;
BEGIN
  -- Validate inputs
  IF org_name IS NULL OR length(trim(org_name)) < 3 THEN
    RAISE EXCEPTION 'El nombre de la organización debe tener al menos 3 caracteres';
  END IF;

  IF org_slug IS NULL OR length(trim(org_slug)) < 3 THEN
    RAISE EXCEPTION 'El slug debe tener al menos 3 caracteres';
  END IF;

  -- Validate slug format (lowercase, alphanumeric, hyphens only)
  IF org_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'El slug solo puede contener letras minúsculas, números y guiones';
  END IF;

  -- Check if user already has an organization
  SELECT organization_id INTO existing_org_id
  FROM profiles
  WHERE id = auth.uid();

  IF existing_org_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ya pertenecés a una organización';
  END IF;

  -- Check if slug is already taken
  SELECT EXISTS(
    SELECT 1 FROM organizations WHERE slug = org_slug AND deleted_at IS NULL
  ) INTO slug_exists;

  IF slug_exists THEN
    RAISE EXCEPTION 'Este identificador ya está en uso. Por favor elegí otro.';
  END IF;

  -- Create the organization
  INSERT INTO organizations (name, slug)
  VALUES (trim(org_name), trim(org_slug))
  RETURNING id INTO new_org_id;

  -- Update the user's profile
  UPDATE profiles
  SET
    organization_id = new_org_id,
    role = 'admin'
  WHERE id = auth.uid();

  -- Return the created organization
  SELECT json_build_object(
    'id', o.id,
    'name', o.name,
    'slug', o.slug,
    'created_at', o.created_at
  ) INTO result
  FROM organizations o
  WHERE o.id = new_org_id;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION create_organization(TEXT, TEXT) IS
  'Creates a new organization and sets the current user as admin. '
  'Can only be called by authenticated users who do not yet belong to an organization. '
  'Uses SECURITY DEFINER to bypass RLS for organization INSERT.';

-- ============================================
-- HELPER FUNCTION: CHECK SLUG AVAILABILITY
-- ============================================

CREATE OR REPLACE FUNCTION check_slug_available(slug_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS(
    SELECT 1 FROM organizations
    WHERE slug = slug_to_check
    AND deleted_at IS NULL
  )
$$;

COMMENT ON FUNCTION check_slug_available(TEXT) IS
  'Returns TRUE if the given slug is available for use.';

COMMIT;
