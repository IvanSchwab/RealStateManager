-- ============================================
-- TEMPORARY RLS POLICIES FOR OWNERS WRITES
-- ============================================
-- Migration: 20240115000000_temp_owners_write_policies.sql
-- Description: Temporary policies to allow authenticated users to write owners.
--              These will be replaced with proper role-based policies later.
--
-- WARNING: These are development-only policies. Replace with role-based
--          policies before deploying to production.

-- Allow authenticated users to insert owners
CREATE POLICY "temp_authenticated_insert_owners" ON owners
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update owners (including soft delete)
CREATE POLICY "temp_authenticated_update_owners" ON owners
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Comments for documentation
COMMENT ON POLICY "temp_authenticated_insert_owners" ON owners IS
  'TEMPORARY: Allow all authenticated users to create owners. Replace with role-based policies later.';

COMMENT ON POLICY "temp_authenticated_update_owners" ON owners IS
  'TEMPORARY: Allow all authenticated users to update owners. Replace with role-based policies later.';
