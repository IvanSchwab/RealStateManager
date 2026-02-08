-- ============================================
-- PAYMENTS MODULE - SEED DATA FOR TESTING
-- ============================================
-- Migration: 20240110000000_seed_payments_data.sql
-- Description: Adds sample tenants, contracts, and payments for testing
--
-- This migration creates:
--   - 5 test tenants
--   - 2 active contracts with payments
--   - Monthly payments for the contract duration
--   - Sample concepts (ABL, Expensas)
--   - Mix of paid, pending, and overdue statuses
--
-- Note: This migration is idempotent - it checks for existing data before inserting.

-- ============================================
-- TEST TENANTS
-- ============================================

INSERT INTO tenants (
  first_name,
  last_name,
  email,
  phone,
  dni,
  cuit_cuil,
  address,
  employer,
  employer_phone,
  monthly_income,
  emergency_contact_name,
  emergency_contact_phone,
  status,
  notes
) VALUES
  (
    'Juan Pablo',
    'Pérez',
    'juanp@example.com',
    '11-1234-5678',
    '32456789',
    '20-32456789-0',
    'Av. Córdoba 2345, CABA',
    'Acme Corp S.A.',
    '11-4567-8900',
    850000.00,
    'María Pérez',
    '11-9876-5432',
    'activo',
    'Excelente inquilino. Paga puntualmente.'
  ),
  (
    'Carolina',
    'López',
    'carolina.lopez@example.com',
    '11-2345-6789',
    '28765432',
    '27-28765432-9',
    'Av. Las Heras 1234, CABA',
    'Banco Nacional',
    '11-5678-9012',
    1200000.00,
    'Pedro López',
    '11-8765-4321',
    'activo',
    'Contrato renovado en enero 2025.'
  ),
  (
    'Martín',
    'García',
    'martin.g@example.com',
    '11-3456-7890',
    '35123456',
    '20-35123456-7',
    'Av. Callao 567, CABA',
    'Tech Solutions SRL',
    '11-6789-0123',
    950000.00,
    'Ana García',
    '11-7654-3210',
    'activo',
    NULL
  ),
  (
    'Luciana',
    'Fernández',
    'luciana.f@example.com',
    '11-4567-8901',
    '30987654',
    '27-30987654-5',
    'Av. Pueyrredón 890, CABA',
    'Estudio Jurídico Fernández',
    '11-7890-1234',
    1500000.00,
    'Carlos Fernández',
    '11-6543-2109',
    'activo',
    'Co-titular del contrato con su esposo.'
  ),
  (
    'Diego',
    'Martínez',
    'diego.martinez@example.com',
    '11-5678-9012',
    '33456789',
    '20-33456789-4',
    'Av. Rivadavia 4567, CABA',
    'Freelancer',
    NULL,
    700000.00,
    'Rosa Martínez',
    '11-5432-1098',
    'activo',
    'Trabajador independiente, presenta monotributo.'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- TEST CONTRACTS
-- ============================================
-- Create two active contracts with different scenarios

-- Contract 1: Standard residential contract (24 months, quarterly ICL adjustment)
-- Property: Casa 3 dormitorios Belgrano (already marked as 'alquilada')
DO $$
DECLARE
  v_property_id UUID;
  v_tenant_id UUID;
  v_contract_id UUID;
  v_current_date DATE := CURRENT_DATE;
  v_start_date DATE;
  v_payment_id UUID;
  v_month_counter INTEGER := 0;
  v_status TEXT;
  v_paid_date DATE;
BEGIN
  -- Get property ID (Casa 3 dormitorios Belgrano)
  SELECT id INTO v_property_id
  FROM properties
  WHERE name = 'Casa 3 dormitorios Belgrano'
  LIMIT 1;

  -- Get tenant ID (Juan Pablo Pérez)
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE email = 'juanp@example.com'
  LIMIT 1;

  -- Only proceed if both exist and no contract exists
  IF v_property_id IS NOT NULL AND v_tenant_id IS NOT NULL THEN
    -- Check if contract already exists
    IF NOT EXISTS (
      SELECT 1 FROM contracts WHERE property_id = v_property_id AND deleted_at IS NULL
    ) THEN
      -- Contract started 8 months ago
      v_start_date := v_current_date - INTERVAL '8 months';

      -- Insert contract
      INSERT INTO contracts (
        property_id,
        contract_type,
        base_rent_amount,
        current_rent_amount,
        deposit_amount,
        start_date,
        end_date,
        payment_due_day,
        adjustment_type,
        adjustment_period,
        last_adjustment_date,
        next_adjustment_date,
        late_payment_interest_rate,
        early_termination_penalty_months,
        non_return_penalty_rate,
        insurance_required,
        status,
        guarantors,
        notes
      ) VALUES (
        v_property_id,
        'vivienda',
        350000.00, -- Base rent at contract start
        385000.00, -- Current rent after 2 adjustments
        350000.00,
        v_start_date,
        v_start_date + INTERVAL '24 months',
        10, -- Due on 10th of each month
        'ICL',
        'trimestral',
        v_current_date - INTERVAL '1 month', -- Last adjustment was 1 month ago
        v_current_date + INTERVAL '2 months', -- Next adjustment in 2 months
        0.5, -- 0.5% daily late interest
        2, -- 2 months penalty for early termination
        10.0, -- 10% daily penalty for non-return
        true,
        'activo',
        '[{"type": "persona_fisica", "full_name": "Roberto Pérez", "dni": "20456789", "cuil": "20-20456789-0", "phone": "11-9999-8888", "address": "Av. San Martín 1234, CABA"}]'::jsonb,
        'Contrato de prueba para el módulo de pagos.'
      )
      RETURNING id INTO v_contract_id;

      -- Link tenant to contract
      INSERT INTO contract_tenants (contract_id, tenant_id, role)
      VALUES (v_contract_id, v_tenant_id, 'titular')
      ON CONFLICT DO NOTHING;

      -- Generate payments for all months
      FOR v_month_counter IN 0..23 LOOP
        -- Determine payment status based on position relative to current date
        IF v_start_date + (v_month_counter || ' months')::INTERVAL < v_current_date - INTERVAL '1 month' THEN
          -- Past months: paid
          v_status := 'pagado';
          v_paid_date := (v_start_date + (v_month_counter || ' months')::INTERVAL + INTERVAL '8 days')::DATE;
        ELSIF v_start_date + (v_month_counter || ' months')::INTERVAL < v_current_date THEN
          -- Current month: 50% chance of being paid
          IF v_month_counter % 2 = 0 THEN
            v_status := 'pagado';
            v_paid_date := (v_start_date + (v_month_counter || ' months')::INTERVAL + INTERVAL '5 days')::DATE;
          ELSE
            v_status := 'pendiente';
            v_paid_date := NULL;
          END IF;
        ELSE
          -- Future months: pending
          v_status := 'pendiente';
          v_paid_date := NULL;
        END IF;

        -- Insert payment
        INSERT INTO payments (
          contract_id,
          period_month,
          period_year,
          rent_amount,
          total_amount,
          expected_amount,
          due_date,
          status,
          payment_date,
          actual_amount,
          payment_method,
          reference_number,
          notes
        ) VALUES (
          v_contract_id,
          EXTRACT(MONTH FROM v_start_date + (v_month_counter || ' months')::INTERVAL)::INTEGER,
          EXTRACT(YEAR FROM v_start_date + (v_month_counter || ' months')::INTERVAL)::INTEGER,
          CASE
            WHEN v_month_counter < 3 THEN 350000.00
            WHEN v_month_counter < 6 THEN 367500.00
            ELSE 385000.00
          END,
          CASE
            WHEN v_month_counter < 3 THEN 380000.00 -- rent + ABL + expensas
            WHEN v_month_counter < 6 THEN 399500.00
            ELSE 419000.00
          END,
          CASE
            WHEN v_month_counter < 3 THEN 380000.00
            WHEN v_month_counter < 6 THEN 399500.00
            ELSE 419000.00
          END,
          calculate_payment_due_date(
            EXTRACT(YEAR FROM v_start_date + (v_month_counter || ' months')::INTERVAL)::INTEGER,
            EXTRACT(MONTH FROM v_start_date + (v_month_counter || ' months')::INTERVAL)::INTEGER,
            10
          ),
          v_status,
          v_paid_date,
          CASE WHEN v_status = 'pagado' THEN
            CASE
              WHEN v_month_counter < 3 THEN 380000.00
              WHEN v_month_counter < 6 THEN 399500.00
              ELSE 419000.00
            END
          END,
          CASE WHEN v_status = 'pagado' THEN 'transferencia' END,
          CASE WHEN v_status = 'pagado' THEN
            generate_receipt_number(v_paid_date)
          END,
          NULL
        )
        RETURNING id INTO v_payment_id;

        -- Add concepts to each payment
        INSERT INTO payment_concepts (payment_id, concept_name, amount, is_recurring)
        VALUES
          (v_payment_id, 'ABL', 15000.00, true),
          (v_payment_id, 'Expensas', 19000.00, true);
      END LOOP;

      RAISE NOTICE 'Created contract and 24 payments for Casa Belgrano';
    END IF;
  END IF;
END $$;

-- Contract 2: Apartment rental (36 months, semestral IPC adjustment)
-- Property: Depto 2 ambientes Palermo
DO $$
DECLARE
  v_property_id UUID;
  v_tenant_id UUID;
  v_co_tenant_id UUID;
  v_contract_id UUID;
  v_current_date DATE := CURRENT_DATE;
  v_start_date DATE;
  v_payment_id UUID;
  v_month_counter INTEGER := 0;
  v_status TEXT;
  v_paid_date DATE;
BEGIN
  -- Get property ID (Depto 2 ambientes Palermo)
  SELECT id INTO v_property_id
  FROM properties
  WHERE name = 'Depto 2 ambientes Palermo'
  LIMIT 1;

  -- Get tenant IDs
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE email = 'carolina.lopez@example.com'
  LIMIT 1;

  SELECT id INTO v_co_tenant_id
  FROM tenants
  WHERE email = 'martin.g@example.com'
  LIMIT 1;

  -- Only proceed if all exist
  IF v_property_id IS NOT NULL AND v_tenant_id IS NOT NULL THEN
    -- Check if contract already exists
    IF NOT EXISTS (
      SELECT 1 FROM contracts WHERE property_id = v_property_id AND deleted_at IS NULL
    ) THEN
      -- Contract started 4 months ago
      v_start_date := v_current_date - INTERVAL '4 months';

      -- Update property status
      UPDATE properties SET status = 'alquilada' WHERE id = v_property_id;

      -- Insert contract
      INSERT INTO contracts (
        property_id,
        contract_type,
        base_rent_amount,
        current_rent_amount,
        deposit_amount,
        start_date,
        end_date,
        payment_due_day,
        adjustment_type,
        adjustment_period,
        last_adjustment_date,
        next_adjustment_date,
        late_payment_interest_rate,
        early_termination_penalty_months,
        non_return_penalty_rate,
        insurance_required,
        status,
        guarantors,
        notes
      ) VALUES (
        v_property_id,
        'vivienda',
        280000.00, -- Base rent
        280000.00, -- No adjustment yet (less than 6 months)
        280000.00,
        v_start_date,
        v_start_date + INTERVAL '36 months',
        0, -- Due on last day of month
        'IPC',
        'semestral',
        NULL, -- No adjustment yet
        v_start_date + INTERVAL '6 months', -- First adjustment at 6 months
        0.5,
        2,
        10.0,
        false,
        'activo',
        '[{"type": "finaer", "company_name": "FINAER S.A.", "cuit": "30-12345678-9", "guarantee_code": "FIN-2025-00123", "representative_name": "María Gómez", "representative_dni": "25678901"}]'::jsonb,
        'Contrato con garantía FINAER. Co-titular agregado.'
      )
      RETURNING id INTO v_contract_id;

      -- Link tenants to contract
      INSERT INTO contract_tenants (contract_id, tenant_id, role)
      VALUES
        (v_contract_id, v_tenant_id, 'titular'),
        (v_contract_id, v_co_tenant_id, 'co_titular')
      ON CONFLICT DO NOTHING;

      -- Generate payments for 12 months (first year)
      FOR v_month_counter IN 0..11 LOOP
        -- Determine status
        IF v_start_date + (v_month_counter || ' months')::INTERVAL < v_current_date - INTERVAL '15 days' THEN
          v_status := 'pagado';
          v_paid_date := (v_start_date + (v_month_counter || ' months')::INTERVAL + INTERVAL '25 days')::DATE;
        ELSIF v_start_date + (v_month_counter || ' months')::INTERVAL < v_current_date THEN
          -- Last month has one overdue payment
          IF v_month_counter = 3 THEN
            v_status := 'vencido';
            v_paid_date := NULL;
          ELSE
            v_status := 'pendiente';
            v_paid_date := NULL;
          END IF;
        ELSE
          v_status := 'pendiente';
          v_paid_date := NULL;
        END IF;

        -- Insert payment
        INSERT INTO payments (
          contract_id,
          period_month,
          period_year,
          rent_amount,
          total_amount,
          expected_amount,
          due_date,
          status,
          payment_date,
          actual_amount,
          payment_method,
          reference_number,
          notes
        ) VALUES (
          v_contract_id,
          EXTRACT(MONTH FROM v_start_date + (v_month_counter || ' months')::INTERVAL)::INTEGER,
          EXTRACT(YEAR FROM v_start_date + (v_month_counter || ' months')::INTERVAL)::INTEGER,
          280000.00,
          305000.00, -- rent + ABL + expensas
          305000.00,
          calculate_payment_due_date(
            EXTRACT(YEAR FROM v_start_date + (v_month_counter || ' months')::INTERVAL)::INTEGER,
            EXTRACT(MONTH FROM v_start_date + (v_month_counter || ' months')::INTERVAL)::INTEGER,
            0 -- Last day of month
          ),
          v_status,
          v_paid_date,
          CASE WHEN v_status = 'pagado' THEN 305000.00 END,
          CASE WHEN v_status = 'pagado' THEN 'efectivo' END,
          CASE WHEN v_status = 'pagado' THEN
            generate_receipt_number(v_paid_date)
          END,
          CASE WHEN v_status = 'vencido' THEN 'PAGO VENCIDO - Contactar inquilino' END
        )
        RETURNING id INTO v_payment_id;

        -- Add concepts
        INSERT INTO payment_concepts (payment_id, concept_name, amount, is_recurring)
        VALUES
          (v_payment_id, 'ABL', 12000.00, true),
          (v_payment_id, 'Expensas', 13000.00, true);
      END LOOP;

      RAISE NOTICE 'Created contract and 12 payments for Depto Palermo';
    END IF;
  END IF;
END $$;

-- ============================================
-- ADJUSTMENT HISTORY SAMPLES
-- ============================================

INSERT INTO adjustment_history (
  contract_id,
  executed_at,
  effective_from_period,
  adjustment_type,
  index_value_used,
  previous_amount,
  new_amount,
  source,
  notes
)
SELECT
  c.id,
  NOW() - INTERVAL '4 months',
  TO_CHAR(NOW() - INTERVAL '4 months', 'YYYY-MM'),
  'ICL',
  1.05,
  350000.00,
  367500.00,
  'manual',
  'Primer ajuste trimestral ICL (5%)'
FROM contracts c
JOIN properties p ON p.id = c.property_id
WHERE p.name = 'Casa 3 dormitorios Belgrano'
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM adjustment_history ah
    WHERE ah.contract_id = c.id AND ah.previous_amount = 350000.00
  )
LIMIT 1;

INSERT INTO adjustment_history (
  contract_id,
  executed_at,
  effective_from_period,
  adjustment_type,
  index_value_used,
  previous_amount,
  new_amount,
  source,
  notes
)
SELECT
  c.id,
  NOW() - INTERVAL '1 month',
  TO_CHAR(NOW() - INTERVAL '1 month', 'YYYY-MM'),
  'ICL',
  1.0476,
  367500.00,
  385000.00,
  'manual',
  'Segundo ajuste trimestral ICL (4.76%)'
FROM contracts c
JOIN properties p ON p.id = c.property_id
WHERE p.name = 'Casa 3 dormitorios Belgrano'
  AND c.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM adjustment_history ah
    WHERE ah.contract_id = c.id AND ah.previous_amount = 367500.00
  )
LIMIT 1;

-- ============================================
-- VERIFY SEED DATA
-- ============================================

DO $$
DECLARE
  v_tenant_count INTEGER;
  v_contract_count INTEGER;
  v_payment_count INTEGER;
  v_concept_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_tenant_count FROM tenants WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_contract_count FROM contracts WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_payment_count FROM payments;
  SELECT COUNT(*) INTO v_concept_count FROM payment_concepts;

  RAISE NOTICE '=== Seed Data Summary ===';
  RAISE NOTICE 'Tenants: %', v_tenant_count;
  RAISE NOTICE 'Contracts: %', v_contract_count;
  RAISE NOTICE 'Payments: %', v_payment_count;
  RAISE NOTICE 'Payment Concepts: %', v_concept_count;
END $$;
