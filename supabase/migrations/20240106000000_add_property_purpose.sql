-- Add purpose column to properties
-- Purpose: alquiler (rental) or venta (sale)

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'alquiler';

-- Add check constraint to ensure only valid values
ALTER TABLE properties
ADD CONSTRAINT check_property_purpose
CHECK (purpose IN ('alquiler', 'venta'));

-- Add index for efficient filtering by purpose
CREATE INDEX IF NOT EXISTS idx_properties_purpose ON properties(purpose);

-- Add documentation comment
COMMENT ON COLUMN properties.purpose IS 'Property purpose: alquiler (rental) or venta (sale)';
