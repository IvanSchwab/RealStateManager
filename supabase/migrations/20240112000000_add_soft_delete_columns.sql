-- ============================================
-- MIGRATION: Add soft delete columns
-- ============================================
-- Description: Adds deleted_at column to core tables for soft delete support
-- This migration should run before other migrations that reference deleted_at
--
-- Tables affected:
--   - owners
--   - properties
--   - tenants
--   - contracts

-- ============================================
-- OWNERS TABLE
-- ============================================

ALTER TABLE owners
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_owners_deleted_at ON owners(deleted_at)
WHERE deleted_at IS NULL;

COMMENT ON COLUMN owners.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';

-- ============================================
-- PROPERTIES TABLE
-- ============================================

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_deleted_at ON properties(deleted_at)
WHERE deleted_at IS NULL;

COMMENT ON COLUMN properties.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';

-- ============================================
-- TENANTS TABLE
-- ============================================

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON tenants(deleted_at)
WHERE deleted_at IS NULL;

COMMENT ON COLUMN tenants.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';

-- ============================================
-- CONTRACTS TABLE
-- ============================================

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at ON contracts(deleted_at)
WHERE deleted_at IS NULL;

COMMENT ON COLUMN contracts.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';
