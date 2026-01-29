-- ============================================
-- TEMPORARY RLS POLICIES FOR PROPERTIES WRITES
-- ============================================
-- Migration: 20240103000000_temp_properties_write_policies.sql
-- Description: Temporary policies to allow authenticated users to write properties.
--              These will be replaced with proper role-based policies later.
--
-- WARNING: These are development-only policies. Replace with role-based
--          policies before deploying to production.

-- Allow authenticated users to insert properties
CREATE POLICY "temp_authenticated_insert_properties" ON properties
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update properties (including soft delete)
-- Note: This policy explicitly allows setting deleted_at (soft delete) 
-- by not restricting it in WITH CHECK. The staff_update_properties policy
-- in the schema prevents soft deletes, so we need this to override that.
CREATE POLICY "temp_authenticated_update_properties" ON properties
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL AND TRUE);  -- TRUE allows any column to be updated

-- Comments for documentation
COMMENT ON POLICY "temp_authenticated_insert_properties" ON properties IS
  'TEMPORARY: Allow all authenticated users to create properties. Replace with role-based policies later.';

COMMENT ON POLICY "temp_authenticated_update_properties" ON properties IS
  'TEMPORARY: Allow all authenticated users to update properties. Replace with role-based policies later.';

-- Also add temporary read/write policies for owners table
-- (needed for the owner dropdown in property forms)

-- Allow authenticated users to read owners
CREATE POLICY "temp_authenticated_select_owners" ON owners
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "temp_authenticated_select_owners" ON owners IS
  'TEMPORARY: Allow all authenticated users to read owners. Replace with role-based policies later.';
