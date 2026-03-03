-- Conectate a Supabase y ejecutá:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'adjustment_history' 
  AND column_name IN ('is_estimated', 'corrected_by_id', 'inflation_period');