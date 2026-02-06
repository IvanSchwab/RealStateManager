-- Ejecuta esto en Supabase Studio o CLI
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contracts' 
AND column_name IN (
  'property_description',
  'custom_clauses',
  'clause_overrides',
  'owner_legal_address',
  'owner_cuit',
  'daily_penalty_rate',
  'daily_interest_rate',
  'payment_location',
  'payment_hours'
);