-- Real Estate Management System - Initial Setup
-- This migration creates only the minimal required tables for the initial setup.
-- Additional tables (properties, tenants, contracts, payments) will be added in subsequent migrations.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================
-- This table extends auth.users with application-specific user data.
-- It is automatically populated when a new user registers via the trigger below.

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =============================================================================
-- TRIGGER: Auto-create profile on user registration
-- =============================================================================
-- When a new user signs up via Supabase Auth, this trigger automatically
-- creates a corresponding profile record with default values.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =============================================================================
-- This generic trigger function updates the updated_at column whenever a row is modified.
-- It will be reused for all tables that have an updated_at column.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Enable RLS on profiles table to ensure users can only access their own data.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- TODO: Additional tables to be created in future migrations
-- =============================================================================
-- The following tables will be added in subsequent migrations:
--
-- 1. properties - Real estate properties (apartments, houses, commercial, land)
-- 2. tenants - Tenant information and contact details
-- 3. contracts - Rental agreements linking properties and tenants
-- 4. payments - Payment records and tracking
-- 5. documents - File storage metadata for contracts, IDs, etc.
-- 6. maintenance_requests - Property maintenance tracking
-- 7. notifications - System notifications and alerts
--
-- Each migration will include:
-- - Table creation with proper constraints
-- - Indexes for query optimization
-- - RLS policies for data security
-- - Triggers for automated updates
