-- Migration: Add PDF generation fields to contracts table
-- This migration adds fields needed for contract PDF generation

-- Add new columns for PDF generation
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS property_description TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS custom_clauses JSONB DEFAULT '[]';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS clause_overrides JSONB DEFAULT '{}';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_legal_address TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_cuit VARCHAR(13);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS daily_penalty_rate DECIMAL(5,2) DEFAULT 10.00;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS daily_interest_rate DECIMAL(5,2) DEFAULT 0.50;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_location TEXT DEFAULT 'Olivera de Schwab Propiedades, Lincoln 3598, San Martín';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_hours TEXT DEFAULT '9:30 a 12:00 y 16:30 a 18:30';

-- Add comments for documentation
COMMENT ON COLUMN contracts.property_description IS 'Detailed property description for clause PRIMERO';
COMMENT ON COLUMN contracts.custom_clauses IS 'Array of additional custom clauses: [{number: "VIGÉSIMA QUINTA", title: "...", content: "..."}]';
COMMENT ON COLUMN contracts.clause_overrides IS 'Object with clause overrides: {"TERCERA": "Custom text for clause 3..."}';
COMMENT ON COLUMN contracts.owner_legal_address IS 'Owner full legal address for notifications';
COMMENT ON COLUMN contracts.owner_cuit IS 'Owner CUIT/CUIL for legal purposes';
COMMENT ON COLUMN contracts.daily_penalty_rate IS 'Daily penalty % for late return (default 10%)';
COMMENT ON COLUMN contracts.daily_interest_rate IS 'Daily interest % for late payment (default 0.5%)';
COMMENT ON COLUMN contracts.payment_location IS 'Location where rent payments should be made';
COMMENT ON COLUMN contracts.payment_hours IS 'Business hours for rent payment';
