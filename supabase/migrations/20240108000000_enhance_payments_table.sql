-- ============================================
-- PAYMENTS MODULE - ENHANCE PAYMENTS TABLE
-- ============================================
-- Migration: 20240108000000_enhance_payments_table.sql
-- Description: Adds additional fields to support the payments module features
--
-- New columns:
--   - rent_amount: Base rent amount for the period (from contract at generation time)
--   - total_amount: Calculated total (rent_amount + sum of concepts)
--   - receipt_pdf_url: Storage path for generated PDF receipt
--
-- Note: expected_amount is kept for backward compatibility
--       expected_amount = total_amount in new records

-- ============================================
-- ADD NEW COLUMNS
-- ============================================

-- Base rent amount for this period (snapshot from contract at payment generation)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS rent_amount NUMERIC(12, 2);

COMMENT ON COLUMN payments.rent_amount IS
  'Base rent amount for this period, copied from contract.current_rent_amount at generation time.';

-- Total amount including all concepts (rent + ABL + expensas, etc.)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);

COMMENT ON COLUMN payments.total_amount IS
  'Total amount due including all concepts. Calculated as rent_amount + sum(payment_concepts.amount).';

-- Receipt PDF storage path
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS receipt_pdf_url TEXT;

COMMENT ON COLUMN payments.receipt_pdf_url IS
  'Storage path for the generated PDF receipt. Format: receipts/{contract_id}/{payment_id}.pdf';

-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================
-- For any existing payments, set rent_amount and total_amount from expected_amount

UPDATE payments
SET
  rent_amount = expected_amount,
  total_amount = expected_amount
WHERE rent_amount IS NULL;

-- ============================================
-- ADD CONSTRAINTS
-- ============================================

-- After migration, make rent_amount required for new records
-- (We don't alter NOT NULL on existing column to preserve backward compatibility)

-- Add check constraint for valid amounts
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS chk_payments_amounts;

ALTER TABLE payments
ADD CONSTRAINT chk_payments_amounts
CHECK (
  rent_amount IS NULL OR rent_amount > 0
);

-- ============================================
-- UPDATE INDEXES
-- ============================================

-- Index for finding payments by receipt URL (for PDF regeneration)
CREATE INDEX IF NOT EXISTS idx_payments_receipt_pdf
ON payments(receipt_pdf_url)
WHERE receipt_pdf_url IS NOT NULL;

-- ============================================
-- HELPER FUNCTION: Calculate due date
-- ============================================
-- Returns the payment due date for a given month/year and due_day setting

CREATE OR REPLACE FUNCTION calculate_payment_due_date(
  p_year INTEGER,
  p_month INTEGER,
  p_due_day INTEGER
) RETURNS DATE AS $$
DECLARE
  last_day_of_month DATE;
  result_date DATE;
BEGIN
  -- Get the last day of the month
  last_day_of_month := (DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  IF p_due_day = 0 OR p_due_day IS NULL THEN
    -- 0 or NULL means last day of month
    RETURN last_day_of_month;
  ELSIF p_due_day > EXTRACT(DAY FROM last_day_of_month)::INTEGER THEN
    -- If due_day exceeds days in month, use last day
    RETURN last_day_of_month;
  ELSE
    -- Use the specified day
    RETURN MAKE_DATE(p_year, p_month, p_due_day);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_payment_due_date(INTEGER, INTEGER, INTEGER) IS
  'Calculates the payment due date for a given year, month, and due_day setting. Returns last day if due_day is 0 or exceeds days in month.';

-- ============================================
-- HELPER FUNCTION: Generate next receipt number
-- ============================================
-- Format: REC-YYYYMM-XXXX (e.g., REC-202602-0001)

CREATE OR REPLACE FUNCTION generate_receipt_number(p_payment_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
  year_month TEXT;
  next_seq INTEGER;
  receipt_num TEXT;
BEGIN
  -- Format: YYYYMM
  year_month := TO_CHAR(p_payment_date, 'YYYYMM');

  -- Get the next sequence number for this month
  SELECT COALESCE(MAX(
    CASE
      WHEN reference_number ~ ('^REC-' || year_month || '-[0-9]{4}$')
      THEN SUBSTRING(reference_number FROM 13 FOR 4)::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO next_seq
  FROM payments
  WHERE reference_number LIKE 'REC-' || year_month || '-%';

  -- Format the receipt number
  receipt_num := 'REC-' || year_month || '-' || LPAD(next_seq::TEXT, 4, '0');

  RETURN receipt_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_receipt_number(DATE) IS
  'Generates the next receipt number for a given date in format REC-YYYYMM-XXXX.';

-- ============================================
-- TRIGGER: Auto-update overdue payments
-- ============================================
-- This function can be called periodically to update payment statuses

CREATE OR REPLACE FUNCTION update_overdue_payments()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE payments
  SET status = 'vencido'
  WHERE status = 'pendiente'
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_overdue_payments() IS
  'Updates all pending payments past their due date to vencido status. Returns count of updated records.';
