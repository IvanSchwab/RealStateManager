-- ============================================
-- PAYMENTS MODULE - PAYMENT CONCEPTS TABLE
-- ============================================
-- Migration: 20240109000000_create_payment_concepts_table.sql
-- Description: Creates the payment_concepts table for additional charges
--
-- Concepts are additional charges added to monthly payments such as:
--   - ABL (municipal taxes)
--   - Expensas (building maintenance fees)
--   - Utilities (gas, electricity, water)
--   - Repairs
--   - Custom charges
--
-- The is_recurring flag indicates if a concept should be automatically
-- applied to future payments of the same contract.

-- ============================================
-- TABLE: payment_concepts
-- ============================================

CREATE TABLE payment_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,

  -- Concept details
  concept_name VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),

  -- Recurring flag: if true, this concept should be auto-applied to future payments
  is_recurring BOOLEAN NOT NULL DEFAULT false,

  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE payment_concepts IS
  'Additional charges attached to monthly payments (ABL, expensas, utilities, etc.). Cascades on payment delete.';

COMMENT ON COLUMN payment_concepts.concept_name IS
  'Name of the concept (e.g., "ABL", "Expensas", "Gas", "Reparaciones").';

COMMENT ON COLUMN payment_concepts.amount IS
  'Amount in ARS for this concept. Must be >= 0.';

COMMENT ON COLUMN payment_concepts.is_recurring IS
  'If true, this concept type should be automatically applied to future payments of the same contract.';

-- ============================================
-- INDEXES
-- ============================================

-- Primary lookup: concepts for a payment
CREATE INDEX idx_payment_concepts_payment_id
ON payment_concepts(payment_id);

-- Find all recurring concepts (for auto-apply logic)
CREATE INDEX idx_payment_concepts_recurring
ON payment_concepts(is_recurring)
WHERE is_recurring = true;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_payment_concepts_updated_at
  BEFORE UPDATE ON payment_concepts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Recalculate payment total
-- ============================================
-- Recalculates total_amount based on rent_amount + sum(concepts)

CREATE OR REPLACE FUNCTION recalculate_payment_total(p_payment_id UUID)
RETURNS VOID AS $$
DECLARE
  v_rent_amount NUMERIC(12, 2);
  v_concepts_total NUMERIC(12, 2);
BEGIN
  -- Get the rent amount
  SELECT rent_amount INTO v_rent_amount
  FROM payments
  WHERE id = p_payment_id;

  -- Calculate sum of concepts
  SELECT COALESCE(SUM(amount), 0) INTO v_concepts_total
  FROM payment_concepts
  WHERE payment_id = p_payment_id;

  -- Update the payment total
  UPDATE payments
  SET
    total_amount = COALESCE(v_rent_amount, 0) + v_concepts_total,
    expected_amount = COALESCE(v_rent_amount, 0) + v_concepts_total
  WHERE id = p_payment_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_payment_total(UUID) IS
  'Recalculates the total_amount and expected_amount for a payment based on rent_amount + sum(concepts).';

-- ============================================
-- TRIGGER: Auto-recalculate on concept changes
-- ============================================

CREATE OR REPLACE FUNCTION trigger_recalculate_payment_total()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_payment_total(OLD.payment_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_payment_total(NEW.payment_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_concepts_recalculate
  AFTER INSERT OR UPDATE OR DELETE ON payment_concepts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_payment_total();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE payment_concepts ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "admin_all_payment_concepts" ON payment_concepts
  FOR ALL USING (get_user_role() = 'admin');

-- Employees/managers: read all concepts (for non-deleted contracts)
CREATE POLICY "staff_select_payment_concepts" ON payment_concepts
  FOR SELECT USING (
    get_user_role() IN ('employee', 'manager')
    AND payment_id IN (
      SELECT p.id FROM payments p
      JOIN contracts c ON c.id = p.contract_id
      WHERE c.deleted_at IS NULL
    )
  );

-- Employees/managers: insert concepts
CREATE POLICY "staff_insert_payment_concepts" ON payment_concepts
  FOR INSERT WITH CHECK (get_user_role() IN ('employee', 'manager'));

-- Employees/managers: update concepts
CREATE POLICY "staff_update_payment_concepts" ON payment_concepts
  FOR UPDATE
  USING (get_user_role() IN ('employee', 'manager'))
  WITH CHECK (get_user_role() IN ('employee', 'manager'));

-- Employees/managers: delete concepts
CREATE POLICY "staff_delete_payment_concepts" ON payment_concepts
  FOR DELETE USING (get_user_role() IN ('employee', 'manager'));

-- Agents: read concepts for assigned property contracts
CREATE POLICY "agent_select_payment_concepts" ON payment_concepts
  FOR SELECT USING (
    get_user_role() = 'agent'
    AND payment_id IN (
      SELECT p.id FROM payments p
      JOIN contracts c ON c.id = p.contract_id
      WHERE is_agent_assigned(c.property_id)
        AND c.deleted_at IS NULL
    )
  );

-- ============================================
-- COMMON CONCEPT TYPES (for UI suggestions)
-- ============================================
-- These are common concept names used in Argentina rental management

COMMENT ON TABLE payment_concepts IS
  'Additional charges attached to monthly payments.

Common concept names:
- ABL: Alumbrado, Barrido y Limpieza (municipal services tax)
- Expensas: Building common expenses
- Expensas Extraordinarias: Special building assessments
- Gas: Natural gas service
- Agua: Water service
- Luz: Electricity service
- Internet: Internet service
- Reparaciones: Repairs charged to tenant
- Multas: Late fees or fines
- Otros: Other miscellaneous charges';
