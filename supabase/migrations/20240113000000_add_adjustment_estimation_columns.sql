-- ============================================
-- AUTOMATIC RENT ADJUSTMENT SYSTEM - SCHEMA ADDITIONS
-- ============================================
-- Migration: 20240113000000_add_adjustment_estimation_columns.sql
-- Description: Adds columns for tracking estimated adjustments and corrections
-- Depends on: 20240102000000_complete_schema.sql (adjustment_history table)
--
-- Purpose:
--   When official inflation data (IPC/ICL) is not yet published, the system
--   can apply an estimated adjustment. Once official data is available,
--   the estimated adjustment can be corrected. This migration adds the
--   necessary columns to track estimation status and corrections.
-- ============================================

-- ============================================
-- ADD COLUMNS TO adjustment_history TABLE
-- ============================================

-- is_estimated: Indicates if the adjustment used estimated inflation data
-- When true, the adjustment may need correction once official data is published
ALTER TABLE adjustment_history
ADD COLUMN IF NOT EXISTS is_estimated BOOLEAN NOT NULL DEFAULT false;

-- corrected_by_id: References the adjustment record that corrected this estimation
-- NULL if the adjustment hasn't been corrected or wasn't estimated
ALTER TABLE adjustment_history
ADD COLUMN IF NOT EXISTS corrected_by_id UUID REFERENCES adjustment_history(id);

-- inflation_period: Human-readable description of the inflation period used
-- Example: "Nov 2025 - Ene 2026" for a quarterly adjustment
ALTER TABLE adjustment_history
ADD COLUMN IF NOT EXISTS inflation_period VARCHAR(100);

-- ============================================
-- ADD INDEXES
-- ============================================

-- Index for quickly finding estimated adjustments that need correction
CREATE INDEX IF NOT EXISTS idx_adjustments_is_estimated
ON adjustment_history(is_estimated)
WHERE is_estimated = true AND corrected_by_id IS NULL;

-- Index for finding corrections of a specific adjustment
CREATE INDEX IF NOT EXISTS idx_adjustments_corrected_by
ON adjustment_history(corrected_by_id)
WHERE corrected_by_id IS NOT NULL;

-- ============================================
-- COLUMN COMMENTS
-- ============================================

COMMENT ON COLUMN adjustment_history.is_estimated IS
  'True if adjustment used estimated inflation data because official IPC/ICL was not yet published. May need correction later.';

COMMENT ON COLUMN adjustment_history.corrected_by_id IS
  'References the adjustment_history record that corrected this estimated adjustment. NULL if not corrected or not estimated.';

COMMENT ON COLUMN adjustment_history.inflation_period IS
  'Human-readable inflation period used for calculation, e.g., "Nov 2025 - Ene 2026" for quarterly adjustments.';

-- ============================================
-- POPULATE next_adjustment_date FOR EXISTING CONTRACTS
-- ============================================
-- Ensures all active contracts with IPC/ICL adjustment have a next_adjustment_date

UPDATE contracts
SET next_adjustment_date = CASE
    WHEN adjustment_period = 'trimestral' THEN
      CASE
        WHEN last_adjustment_date IS NOT NULL THEN last_adjustment_date + INTERVAL '3 months'
        ELSE start_date + INTERVAL '3 months'
      END
    WHEN adjustment_period = 'semestral' THEN
      CASE
        WHEN last_adjustment_date IS NOT NULL THEN last_adjustment_date + INTERVAL '6 months'
        ELSE start_date + INTERVAL '6 months'
      END
    WHEN adjustment_period = 'anual' THEN
      CASE
        WHEN last_adjustment_date IS NOT NULL THEN last_adjustment_date + INTERVAL '12 months'
        ELSE start_date + INTERVAL '12 months'
      END
END
WHERE status = 'activo'
  AND next_adjustment_date IS NULL
  AND adjustment_type IN ('ICL', 'IPC')
  AND adjustment_period IS NOT NULL
  AND deleted_at IS NULL;
