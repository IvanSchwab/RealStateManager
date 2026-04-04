-- Add renewed_from_id column for tracking contract renewals
ALTER TABLE contracts ADD COLUMN renewed_from_id UUID REFERENCES contracts(id);
CREATE INDEX idx_contracts_renewed_from_id ON contracts(renewed_from_id);
