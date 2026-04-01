-- ============================================
-- CONTRACT EVENTS TABLE AND EXPIRATION RPC
-- ============================================
-- Migration: 20260326000000_contract_events_and_expiration_rpc.sql
-- Description:
--   1. Creates contract_events table for tracking contract lifecycle events
--   2. Creates expire_overdue_contracts() RPC function
--   3. Fixes contracts table status default from 'borrador' to 'activo'

BEGIN;

-- ============================================
-- STEP 1: CREATE CONTRACT_EVENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS contract_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL CHECK (event_type IN (
                     'created', 'activated', 'expired',
                     'cancelled', 'extended', 'renewed'
                   )),
  event_date       DATE NOT NULL,
  effective_date   DATE,
  notes            TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_by       UUID REFERENCES auth.users(id),
  deleted_at       TIMESTAMPTZ DEFAULT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE contract_events IS
  'Tracks lifecycle events for contracts (created, activated, expired, cancelled, extended, renewed).';
COMMENT ON COLUMN contract_events.event_type IS
  'Type of event: created, activated, expired, cancelled, extended, renewed.';
COMMENT ON COLUMN contract_events.event_date IS
  'Date when the event occurred.';
COMMENT ON COLUMN contract_events.effective_date IS
  'Date when the event takes effect (may differ from event_date for scheduled changes).';
COMMENT ON COLUMN contract_events.metadata IS
  'Additional event-specific data stored as JSON (e.g., previous values, reason codes).';
COMMENT ON COLUMN contract_events.created_by IS
  'User who created this event record.';
COMMENT ON COLUMN contract_events.deleted_at IS
  'Soft delete timestamp. NULL = active, NOT NULL = deleted.';

-- ============================================
-- STEP 2: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contract_events_contract_id ON contract_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_events_organization_id ON contract_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_contract_events_event_type ON contract_events(event_type);
CREATE INDEX IF NOT EXISTS idx_contract_events_event_date ON contract_events(event_date);
CREATE INDEX IF NOT EXISTS idx_contract_events_deleted_at ON contract_events(deleted_at) WHERE deleted_at IS NULL;

-- Composite index for common query pattern: org + contract + not deleted
CREATE INDEX IF NOT EXISTS idx_contract_events_org_contract
  ON contract_events(organization_id, contract_id) WHERE deleted_at IS NULL;

-- ============================================
-- STEP 3: ADD UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_contract_events_updated_at
  BEFORE UPDATE ON contract_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 4: ENABLE RLS AND CREATE POLICIES
-- ============================================

ALTER TABLE contract_events ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users in the same organization can read events
CREATE POLICY "contract_events_org_select" ON contract_events
  FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND deleted_at IS NULL
  );

-- INSERT: Only admin role can create events
CREATE POLICY "contract_events_org_insert" ON contract_events
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

-- UPDATE: Only admin role can update events
CREATE POLICY "contract_events_org_update" ON contract_events
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

-- DELETE: Only admin role can delete events (soft delete via update preferred)
CREATE POLICY "contract_events_org_delete" ON contract_events
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

COMMENT ON POLICY "contract_events_org_select" ON contract_events IS
  'All organization members can view contract events.';
COMMENT ON POLICY "contract_events_org_insert" ON contract_events IS
  'Only admins can create contract events.';
COMMENT ON POLICY "contract_events_org_update" ON contract_events IS
  'Only admins can update contract events.';
COMMENT ON POLICY "contract_events_org_delete" ON contract_events IS
  'Only admins can delete contract events.';

-- ============================================
-- STEP 5: CREATE EXPIRE_OVERDUE_CONTRACTS RPC
-- ============================================

CREATE OR REPLACE FUNCTION expire_overdue_contracts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_updated_count INTEGER;
BEGIN
  -- Get caller's organization
  v_org_id := get_user_organization_id();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to an organization';
  END IF;

  -- Update overdue contracts to 'vencido' status
  UPDATE contracts
  SET status = 'vencido',
      updated_at = NOW()
  WHERE status = 'activo'
    AND end_date < CURRENT_DATE
    AND deleted_at IS NULL
    AND organization_id = v_org_id;

  -- Get count of updated rows
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$;

COMMENT ON FUNCTION expire_overdue_contracts() IS
  'Updates status to ''vencido'' for all active contracts where end_date has passed. '
  'Returns the count of updated contracts. Scoped to the caller''s organization.';

-- ============================================
-- STEP 6: FIX CONTRACTS STATUS DEFAULT
-- ============================================

ALTER TABLE contracts ALTER COLUMN status SET DEFAULT 'activo';

COMMENT ON COLUMN contracts.status IS
  'Contract status: activo (active), vencido (expired), rescindido (cancelled), renovado (renewed). '
  'Defaults to activo. borrador (draft) status is deprecated.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;
