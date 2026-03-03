-- ============================================
-- TEST DATA FOR AUTOMATIC ADJUSTMENTS SYSTEM
-- ============================================
-- This script creates realistic test data to verify:
-- 1. Automatic adjustment detection
-- 2. Inflation calculation (IPC/ICL)
-- 3. Payment updates
-- 4. Adjustment history tracking
-- 5. Estimation and correction workflow
--
-- Run with: psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed_adjustment_test_data.sql
-- Or paste into Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE TEST OWNERS
-- ============================================

INSERT INTO owners (id, full_name, email, phone, cuit_cuil, notes)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Juan Carlos Test', 'juan.test@example.com', '1122334455', '20-11222333-9', 'Propietario de prueba 1'),
  ('00000000-0000-0000-0000-000000000002', 'María Elena Test', 'maria.test@example.com', '1133445566', '27-22333444-5', 'Propietario de prueba 2')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. CREATE TEST PROPERTIES
-- ============================================

INSERT INTO properties (id, owner_id, name, address_street, address_number, address_floor, address_apartment, address_city, address_state, property_type, status)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'TEST Corrientes 1234-A', 'Av. Corrientes', '1234', '5', 'A', 'CABA', 'CABA', 'departamento', 'alquilada'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'TEST Rivadavia 5678-PB', 'Av. Rivadavia', '5678', NULL, 'PB', 'CABA', 'CABA', 'departamento', 'alquilada'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'TEST Libertador 9012-3B', 'Av. del Libertador', '9012', '3', 'B', 'CABA', 'CABA', 'departamento', 'alquilada'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'TEST Belgrano 3456 Casa', 'Calle Belgrano', '3456', NULL, NULL, 'CABA', 'CABA', 'casa', 'alquilada'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'TEST Santa Fe 7890 Local', 'Av. Santa Fe', '7890', NULL, 'Local 1', 'CABA', 'CABA', 'local', 'alquilada')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. CREATE TEST TENANTS
-- ============================================

INSERT INTO tenants (id, first_name, last_name, dni, email, phone, cuit_cuil, status)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Pedro', 'Prueba', '33444555', 'pedro@example.com', '1144556677', '20-33444555-9', 'activo'),
  ('20000000-0000-0000-0000-000000000002', 'Ana', 'Prueba', '44555666', 'ana@example.com', '1155667788', '27-44555666-9', 'activo'),
  ('20000000-0000-0000-0000-000000000003', 'Carlos', 'Prueba', '55666777', 'carlos@example.com', '1166778899', '20-55666777-9', 'activo'),
  ('20000000-0000-0000-0000-000000000004', 'Laura', 'Prueba', '66777888', 'laura@example.com', '1177889900', '27-66777888-9', 'activo'),
  ('20000000-0000-0000-0000-000000000005', 'Miguel', 'Prueba', '77888999', 'miguel@example.com', '1188990011', '20-77888999-9', 'activo')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. CREATE TEST CONTRACTS
-- ============================================

-- CONTRACT A: Needs adjustment NOW (quarterly IPC)
-- Start: 3 months ago, next adjustment TODAY
INSERT INTO contracts (
  id, property_id, contract_type, start_date, end_date,
  base_rent_amount, current_rent_amount, deposit_amount,
  payment_due_day, adjustment_type, adjustment_period,
  last_adjustment_date, next_adjustment_date,
  late_payment_interest_rate, early_termination_penalty_months, non_return_penalty_rate,
  insurance_required, status, guarantors
)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'vivienda',
  CURRENT_DATE - INTERVAL '3 months',  -- Start: 3 months ago
  CURRENT_DATE + INTERVAL '21 months', -- End: 24 months total
  100000.00,  -- base rent (original)
  107000.00,  -- current rent (after 1 adjustment of 7%)
  100000.00,
  10, -- due day
  'IPC',
  'trimestral',
  CURRENT_DATE - INTERVAL '3 months',  -- Last adjustment at start
  CURRENT_DATE,  -- Next adjustment: TODAY (triggers immediately)
  0.1,
  3,
  20,
  false,
  'activo',
  '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- CONTRACT B: Needs adjustment soon (semi-annual ICL)
-- Start: 6 months ago, next adjustment in 5 days
INSERT INTO contracts (
  id, property_id, contract_type, start_date, end_date,
  base_rent_amount, current_rent_amount, deposit_amount,
  payment_due_day, adjustment_type, adjustment_period,
  last_adjustment_date, next_adjustment_date,
  late_payment_interest_rate, early_termination_penalty_months, non_return_penalty_rate,
  insurance_required, status, guarantors
)
VALUES (
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'vivienda',
  CURRENT_DATE - INTERVAL '6 months',
  CURRENT_DATE + INTERVAL '18 months',
  150000.00,
  150000.00,  -- No adjustments yet
  150000.00,
  10,
  'ICL',
  'semestral',
  CURRENT_DATE - INTERVAL '6 months',
  CURRENT_DATE + INTERVAL '5 days',  -- In 5 days
  0.1,
  3,
  20,
  false,
  'activo',
  '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- CONTRACT C: Recently adjusted with ESTIMATION (quarterly IPC)
-- Has an estimated adjustment that can be corrected
INSERT INTO contracts (
  id, property_id, contract_type, start_date, end_date,
  base_rent_amount, current_rent_amount, deposit_amount,
  payment_due_day, adjustment_type, adjustment_period,
  last_adjustment_date, next_adjustment_date,
  late_payment_interest_rate, early_termination_penalty_months, non_return_penalty_rate,
  insurance_required, status, guarantors
)
VALUES (
  '30000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000003',
  'vivienda',
  CURRENT_DATE - INTERVAL '5 months',
  CURRENT_DATE + INTERVAL '19 months',
  80000.00,
  85600.00,  -- After 1 estimated adjustment (7% estimated)
  80000.00,
  10,
  'IPC',
  'trimestral',
  CURRENT_DATE - INTERVAL '2 months',  -- Last adjustment 2 months ago
  CURRENT_DATE + INTERVAL '1 month',   -- Next adjustment in 1 month
  0.1,
  3,
  20,
  false,
  'activo',
  '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- CONTRACT D: Annual adjustment (not due yet)
INSERT INTO contracts (
  id, property_id, contract_type, start_date, end_date,
  base_rent_amount, current_rent_amount, deposit_amount,
  payment_due_day, adjustment_type, adjustment_period,
  last_adjustment_date, next_adjustment_date,
  late_payment_interest_rate, early_termination_penalty_months, non_return_penalty_rate,
  insurance_required, status, guarantors
)
VALUES (
  '30000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000004',
  'vivienda',
  CURRENT_DATE - INTERVAL '8 months',
  CURRENT_DATE + INTERVAL '28 months',
  200000.00,
  200000.00,  -- No adjustments yet
  200000.00,
  10,
  'IPC',
  'anual',
  CURRENT_DATE - INTERVAL '8 months',
  CURRENT_DATE + INTERVAL '4 months',  -- In 4 months
  0.1,
  3,
  20,
  false,
  'activo',
  '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- CONTRACT E: Fixed rent (should NOT be touched)
INSERT INTO contracts (
  id, property_id, contract_type, start_date, end_date,
  base_rent_amount, current_rent_amount, deposit_amount,
  payment_due_day, adjustment_type, adjustment_period,
  last_adjustment_date, next_adjustment_date,
  late_payment_interest_rate, early_termination_penalty_months, non_return_penalty_rate,
  insurance_required, status, guarantors
)
VALUES (
  '30000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000005',
  'comercial',
  CURRENT_DATE - INTERVAL '12 months',
  CURRENT_DATE + INTERVAL '24 months',
  120000.00,
  120000.00,
  120000.00,
  10,
  'fijo',
  NULL,  -- No adjustment period for fixed
  NULL,
  NULL,
  0.1,
  3,
  20,
  false,
  'activo',
  '[]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. LINK TENANTS TO CONTRACTS
-- ============================================

INSERT INTO contract_tenants (contract_id, tenant_id, role)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'titular'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'titular'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'titular'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'titular'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'titular')
ON CONFLICT (contract_id, tenant_id) DO NOTHING;

-- ============================================
-- 6. CREATE HISTORICAL ADJUSTMENTS
-- ============================================

-- Contract A: 1 adjustment applied at contract start
INSERT INTO adjustment_history (
  id, contract_id, executed_at, effective_from_period,
  adjustment_type, index_value_used, previous_amount, new_amount,
  source, notes
)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '3 months',
  TO_CHAR(CURRENT_DATE - INTERVAL '3 months', 'YYYY-MM'),
  'IPC',
  7.0,
  100000.00,
  107000.00,
  'manual',
  'Ajuste inicial al firmar contrato'
)
ON CONFLICT (id) DO NOTHING;

-- Contract C: 1 ESTIMATED adjustment (to test correction flow)
INSERT INTO adjustment_history (
  id, contract_id, executed_at, effective_from_period,
  adjustment_type, index_value_used, previous_amount, new_amount,
  source, notes, is_estimated, inflation_period
)
VALUES (
  '40000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000003',
  CURRENT_DATE - INTERVAL '2 months',
  TO_CHAR(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM'),
  'IPC',
  7.0,
  80000.00,
  85600.00,
  'automatico',
  'Ajuste con datos estimados - pendiente de corrección',
  true,  -- ESTIMATED (needs correction)
  'Sep 2025 - Nov 2025 (estimado)'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. CREATE PAYMENTS FOR CONTRACTS
-- ============================================

-- Generate payments for each test contract
DO $$
DECLARE
  contract_rec RECORD;
  month_offset INT;
  payment_month INT;
  payment_year INT;
  due_date_val DATE;
  rent_val NUMERIC;
  payment_status TEXT;
  payment_date_val DATE;
  actual_amount_val NUMERIC;
BEGIN
  -- Loop through test contracts
  FOR contract_rec IN
    SELECT id, start_date, current_rent_amount, payment_due_day
    FROM contracts
    WHERE id IN (
      '30000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000003',
      '30000000-0000-0000-0000-000000000004',
      '30000000-0000-0000-0000-000000000005'
    )
  LOOP
    rent_val := contract_rec.current_rent_amount;

    -- Generate 6 months of payments (past) and 3 months (future)
    FOR month_offset IN 0..8 LOOP
      payment_year := EXTRACT(YEAR FROM (contract_rec.start_date + (month_offset || ' months')::INTERVAL))::INT;
      payment_month := EXTRACT(MONTH FROM (contract_rec.start_date + (month_offset || ' months')::INTERVAL))::INT;

      -- Calculate due date
      due_date_val := calculate_payment_due_date(payment_year, payment_month, contract_rec.payment_due_day);

      -- Determine status based on due date
      IF due_date_val < CURRENT_DATE - INTERVAL '15 days' THEN
        -- Old payments: PAID
        payment_status := 'pagado';
        payment_date_val := due_date_val + INTERVAL '2 days';
        actual_amount_val := rent_val;
      ELSIF due_date_val < CURRENT_DATE THEN
        -- Recent past: some PAID, some OVERDUE
        IF month_offset % 2 = 0 THEN
          payment_status := 'pagado';
          payment_date_val := due_date_val + INTERVAL '3 days';
          actual_amount_val := rent_val;
        ELSE
          payment_status := 'vencido';
          payment_date_val := NULL;
          actual_amount_val := NULL;
        END IF;
      ELSE
        -- Future payments: PENDING
        payment_status := 'pendiente';
        payment_date_val := NULL;
        actual_amount_val := NULL;
      END IF;

      -- Insert payment (skip if already exists)
      INSERT INTO payments (
        contract_id, period_month, period_year,
        expected_amount, rent_amount, total_amount, actual_amount,
        due_date, payment_date, status
      )
      VALUES (
        contract_rec.id, payment_month, payment_year,
        rent_val, rent_val, rent_val, actual_amount_val,
        due_date_val, payment_date_val, payment_status
      )
      ON CONFLICT (contract_id, period_year, period_month) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View created contracts with adjustment status
SELECT
  c.id,
  p.name as property,
  c.base_rent_amount,
  c.current_rent_amount,
  c.adjustment_type,
  c.adjustment_period,
  c.next_adjustment_date,
  CASE
    WHEN c.next_adjustment_date <= CURRENT_DATE AND c.adjustment_type IN ('IPC', 'ICL') THEN '⚠️ AJUSTE PENDIENTE'
    WHEN c.next_adjustment_date <= CURRENT_DATE + INTERVAL '7 days' AND c.adjustment_type IN ('IPC', 'ICL') THEN '⏰ PRÓXIMO'
    WHEN c.adjustment_type = 'fijo' THEN '🔒 FIJO'
    ELSE '✅ OK'
  END as estado
FROM contracts c
JOIN properties p ON c.property_id = p.id
WHERE c.id LIKE '30000000-%'
ORDER BY c.next_adjustment_date NULLS LAST;

-- View adjustment history (including estimated)
SELECT
  ah.executed_at::date as fecha,
  p.name as propiedad,
  ah.adjustment_type as tipo,
  ah.previous_amount as anterior,
  ah.new_amount as nuevo,
  ROUND(ah.index_value_used, 2) || '%' as porcentaje,
  CASE WHEN ah.is_estimated THEN '⚠️ ESTIMADO' ELSE '✅ OFICIAL' END as estado,
  ah.inflation_period as periodo
FROM adjustment_history ah
JOIN contracts c ON ah.contract_id = c.id
JOIN properties p ON c.property_id = p.id
WHERE c.id LIKE '30000000-%'
ORDER BY ah.executed_at DESC;

-- View payment summary per contract
SELECT
  p.name as propiedad,
  COUNT(*) as total_pagos,
  SUM(CASE WHEN pm.status = 'pagado' THEN 1 ELSE 0 END) as pagados,
  SUM(CASE WHEN pm.status = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
  SUM(CASE WHEN pm.status = 'vencido' THEN 1 ELSE 0 END) as vencidos
FROM contracts c
JOIN properties p ON c.property_id = p.id
LEFT JOIN payments pm ON c.id = pm.contract_id
WHERE c.id LIKE '30000000-%'
GROUP BY p.name
ORDER BY p.name;

-- Show contracts that need adjustment NOW
SELECT
  'CONTRATOS PENDIENTES DE AJUSTE:' as mensaje,
  COUNT(*) as cantidad
FROM contracts
WHERE status = 'activo'
  AND adjustment_type IN ('IPC', 'ICL')
  AND next_adjustment_date <= CURRENT_DATE
  AND id LIKE '30000000-%';
