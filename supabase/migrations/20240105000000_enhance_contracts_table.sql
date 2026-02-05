-- ============================================
-- MIGRATION: Enhance contracts table for Phase 1 Contracts CRUD
-- ============================================
-- Description: Adds new fields for contract management including
-- contract types, payment terms, penalties, and guarantor information.
--
-- Changes:
--   - Add contract_type (vivienda, comercial, cochera, oficina)
--   - Add late_payment_interest_rate (daily interest %)
--   - Add early_termination_penalty_months (months of rent as penalty)
--   - Add non_return_penalty_rate (daily penalty %)
--   - Add insurance_required flag
--   - Add first_payment_date
--   - Add guarantors JSONB array
--   - Add indexes for new columns

-- ============================================
-- ADD NEW COLUMNS
-- ============================================

-- Contract type categorization
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type TEXT NOT NULL DEFAULT 'vivienda';

-- Late payment daily interest rate (percentage)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS late_payment_interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0.5;

-- Early termination penalty expressed as months of rent
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS early_termination_penalty_months DECIMAL(3,1) NOT NULL DEFAULT 1.5;

-- Daily penalty rate for not returning property on time (percentage)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS non_return_penalty_rate DECIMAL(5,2) NOT NULL DEFAULT 10.0;

-- Whether insurance is required for the contract
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS insurance_required BOOLEAN NOT NULL DEFAULT true;

-- Date of the first payment (may differ from contract start date)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS first_payment_date DATE;

-- Guarantors stored as JSONB array
-- Supports multiple guarantor types: persona_fisica, finaer, propiedad
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS guarantors JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- ADD CHECK CONSTRAINTS
-- ============================================

-- Contract type must be one of the allowed values
ALTER TABLE contracts ADD CONSTRAINT check_contract_type
  CHECK (contract_type IN ('vivienda', 'comercial', 'cochera', 'oficina'));

-- Late payment interest rate must be between 0 and 100
ALTER TABLE contracts ADD CONSTRAINT check_interest_rate
  CHECK (late_payment_interest_rate >= 0 AND late_payment_interest_rate <= 100);

-- Early termination penalty must be reasonable (0-12 months)
ALTER TABLE contracts ADD CONSTRAINT check_penalty_months
  CHECK (early_termination_penalty_months >= 0 AND early_termination_penalty_months <= 12);

-- Non-return penalty rate must be between 0 and 100
ALTER TABLE contracts ADD CONSTRAINT check_penalty_rate
  CHECK (non_return_penalty_rate >= 0 AND non_return_penalty_rate <= 100);

-- ============================================
-- ADD INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_first_payment_date ON contracts(first_payment_date);

-- ============================================
-- ADD COMMENTS
-- ============================================

COMMENT ON COLUMN contracts.contract_type IS
  'Type of rental contract: vivienda (residential), comercial (commercial), cochera (parking), oficina (office)';

COMMENT ON COLUMN contracts.late_payment_interest_rate IS
  'Daily interest rate percentage applied to late payments (e.g., 0.5 = 0.5% per day)';

COMMENT ON COLUMN contracts.early_termination_penalty_months IS
  'Penalty for early contract termination expressed as months of rent (e.g., 1.5 = 1.5 months)';

COMMENT ON COLUMN contracts.non_return_penalty_rate IS
  'Daily penalty percentage if tenant does not return property on time after contract ends';

COMMENT ON COLUMN contracts.insurance_required IS
  'Whether tenant is required to maintain rental insurance';

COMMENT ON COLUMN contracts.first_payment_date IS
  'Date when the first rent payment is due (may differ from contract start_date)';

COMMENT ON COLUMN contracts.guarantors IS
  'JSONB array of guarantor objects. Supported types: persona_fisica (individual), finaer (guarantee company), propiedad (property as collateral). Each type has different required fields.';
