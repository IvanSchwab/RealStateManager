-- ============================================
-- Seed: Test Data for Development
-- ============================================
-- Run this after migrations to populate the database with test data.
-- Usage: supabase db reset (runs migrations + seed automatically)

-- ============================================
-- Owners (5 owners)
-- ============================================
INSERT INTO owners (full_name, email, phone, address, cuit_cuil, notes) VALUES
  ('María González', 'maria.gonzalez@example.com', '+54 11 4567-8901', 'Av. Libertador 1234, Vicente López', '27-12345678-9', 'Propietaria desde 2018. Excelente comunicación.'),
  ('Carlos Rodríguez', 'carlos.rodriguez@example.com', '+54 11 5678-9012', 'Av. Rivadavia 5678, CABA', '20-23456789-0', 'Tiene 3 propiedades en cartera.'),
  ('Ana Martínez', 'ana.martinez@example.com', '+54 11 6789-0123', 'Calle Corrientes 910, San Martín', '27-34567890-1', NULL),
  ('Roberto Fernández', 'roberto.fernandez@example.com', '+54 11 7890-1234', 'Av. Santa Fe 1112, Olivos', '20-45678901-2', 'Inversor inmobiliario. Prefiere contratos largos.'),
  ('Laura Sánchez', 'laura.sanchez@example.com', '+54 11 8901-2345', 'Av. Cabildo 1314, Belgrano', '27-56789012-3', 'Heredó propiedades de familia.')
ON CONFLICT DO NOTHING;

-- ============================================
-- Properties (8 properties with mix of types and purposes)
-- ============================================
INSERT INTO properties (
  owner_id, name, property_type, purpose, address_street, address_number,
  address_floor, address_apartment, address_city, address_state, address_zip_code,
  status, bedrooms, bathrooms, square_meters, description
) VALUES
  -- Property 1: Available apartment for rent
  (
    (SELECT id FROM owners WHERE email = 'maria.gonzalez@example.com'),
    'Depto 2 ambientes Palermo',
    'departamento', 'alquiler',
    'Av. Santa Fe', '3456', '5', 'A',
    'CABA', 'CABA', '1425',
    'disponible', 2, 1, 45.5,
    'Departamento luminoso en pleno Palermo. Cocina integrada, balcón con parrilla. A metros del subte D.'
  ),
  -- Property 2: Rented house
  (
    (SELECT id FROM owners WHERE email = 'carlos.rodriguez@example.com'),
    'Casa 3 dormitorios Belgrano',
    'casa', 'alquiler',
    'Av. Cabildo', '1234', NULL, NULL,
    'CABA', 'CABA', '1426',
    'alquilada', 3, 2, 120.0,
    'Casa amplia con jardín y cochera. Ideal para familias. Cerca de colegios y transporte.'
  ),
  -- Property 3: Commercial local for rent
  (
    (SELECT id FROM owners WHERE email = 'ana.martinez@example.com'),
    'Local comercial Microcentro',
    'local', 'alquiler',
    'Av. Corrientes', '789', 'PB', NULL,
    'CABA', 'CABA', '1043',
    'disponible', NULL, 1, 80.0,
    'Local a la calle sobre avenida principal. Gran vidriera. Ideal para gastronomía o retail.'
  ),
  -- Property 4: Rented office
  (
    (SELECT id FROM owners WHERE email = 'roberto.fernandez@example.com'),
    'Oficina premium Puerto Madero',
    'oficina', 'alquiler',
    'Juana Manso', '205', '12', '1201',
    'CABA', 'CABA', '1107',
    'alquilada', NULL, 2, 150.0,
    'Oficina AAA con vista al dique. Edificio inteligente, seguridad 24hs, cochera incluida.'
  ),
  -- Property 5: Apartment in maintenance
  (
    (SELECT id FROM owners WHERE email = 'laura.sanchez@example.com'),
    'Monoambiente Recoleta',
    'departamento', 'alquiler',
    'Av. Callao', '1567', '8', 'B',
    'CABA', 'CABA', '1022',
    'mantenimiento', 1, 1, 32.0,
    'Monoambiente con cocina separada. Edificio con amenities. En proceso de refacción.'
  ),
  -- Property 6: Rented apartment in Vicente López
  (
    (SELECT id FROM owners WHERE email = 'maria.gonzalez@example.com'),
    'Depto 3 ambientes Vicente López',
    'departamento', 'alquiler',
    'Av. Maipú', '1850', '3', 'C',
    'Vicente López', 'Buenos Aires', '1638',
    'alquilada', 3, 2, 85.0,
    'Excelente ubicación a 2 cuadras del tren. Luminoso, balcón terraza. Edificio con pileta.'
  ),
  -- Property 7: Property for sale
  (
    (SELECT id FROM owners WHERE email = 'carlos.rodriguez@example.com'),
    'PH reciclado San Telmo',
    'departamento', 'venta',
    'Defensa', '1234', NULL, NULL,
    'CABA', 'CABA', '1065',
    'disponible', 2, 1, 70.0,
    'PH de 2 ambientes totalmente reciclado. Patio privado. Zona histórica.'
  ),
  -- Property 8: Rented apartment in San Martín
  (
    (SELECT id FROM owners WHERE email = 'ana.martinez@example.com'),
    'Depto 2 ambientes San Martín',
    'departamento', 'alquiler',
    'Av. San Martín', '2456', '2', 'D',
    'San Martín', 'Buenos Aires', '1650',
    'alquilada', 2, 1, 50.0,
    'Departamento con vista a la avenida. Cerca de estación de tren y comercios.'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- Tenants (6 tenants)
-- ============================================
INSERT INTO tenants (
  first_name, last_name, email, phone, dni, cuit_cuil,
  address, employer, employer_phone, monthly_income,
  emergency_contact_name, emergency_contact_phone, status, notes
) VALUES
  (
    'Juan Pablo', 'Pérez',
    'juanpablo.perez@example.com', '+54 11 1234-5678',
    '32456789', '20-32456789-0',
    'Av. Córdoba 2345, CABA',
    'Banco Nación', '+54 11 4567-8900',
    950000.00,
    'María Pérez', '+54 11 9876-5432',
    'activo', 'Excelente inquilino. Paga siempre puntual.'
  ),
  (
    'Carolina', 'López',
    'carolina.lopez@example.com', '+54 11 2345-6789',
    '28765432', '27-28765432-9',
    'Av. Las Heras 1234, CABA',
    'Estudio Contable García', '+54 11 5678-9012',
    1200000.00,
    'Pedro López', '+54 11 8765-4321',
    'activo', 'Contadora. Contrato renovado en enero 2024.'
  ),
  (
    'Martín', 'García',
    'martin.garcia@example.com', '+54 11 3456-7890',
    '35123456', '20-35123456-7',
    'Av. Callao 567, CABA',
    'Tech Solutions SRL', '+54 11 6789-0123',
    1100000.00,
    'Ana García', '+54 11 7654-3210',
    'activo', 'Desarrollador de software. Trabaja remoto.'
  ),
  (
    'Luciana', 'Fernández',
    'luciana.fernandez@example.com', '+54 11 4567-8901',
    '30987654', '27-30987654-5',
    'Av. Pueyrredón 890, CABA',
    'Hospital Italiano', '+54 11 7890-1234',
    1400000.00,
    'Carlos Fernández', '+54 11 6543-2109',
    'activo', 'Médica. Horarios rotativos.'
  ),
  (
    'Diego', 'Martínez',
    'diego.martinez@example.com', '+54 11 5678-9012',
    '33456789', '20-33456789-4',
    'Av. Rivadavia 4567, CABA',
    'Freelancer', NULL,
    850000.00,
    'Rosa Martínez', '+54 11 5432-1098',
    'activo', 'Diseñador gráfico independiente. Monotributista.'
  ),
  (
    'Valentina', 'Silva',
    'valentina.silva@example.com', '+54 11 6789-0123',
    '31234567', '27-31234567-8',
    'Av. Belgrano 789, CABA',
    'Ministerio de Educación', '+54 11 8901-2345',
    800000.00,
    'Jorge Silva', '+54 11 4321-0987',
    'activo', 'Docente. Contrato reciente.'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- Contracts (4 active contracts)
-- ============================================

-- Contract 1: Casa Belgrano - Started 10 months ago, ICL trimestral
INSERT INTO contracts (
  property_id, contract_type, base_rent_amount, current_rent_amount, deposit_amount,
  start_date, end_date, first_payment_date, payment_due_day,
  adjustment_type, adjustment_period, last_adjustment_date, next_adjustment_date,
  late_payment_interest_rate, early_termination_penalty_months, non_return_penalty_rate,
  insurance_required, status, guarantors, notes
) VALUES (
  (SELECT id FROM properties WHERE name = 'Casa 3 dormitorios Belgrano'),
  'vivienda',
  320000.00,
  380000.00,
  320000.00,
  CURRENT_DATE - INTERVAL '10 months',
  CURRENT_DATE - INTERVAL '10 months' + INTERVAL '36 months',
  CURRENT_DATE - INTERVAL '10 months',
  10,
  'ICL', 'trimestral',
  CURRENT_DATE - INTERVAL '1 month',
  CURRENT_DATE + INTERVAL '2 months',
  0.5, 2, 10.0,
  true, 'activo',
  '[{"type": "persona_fisica", "full_name": "Roberto Pérez", "dni": "20456789", "cuil": "20-20456789-0", "phone": "+54 11 9999-8888", "address": "Av. San Martín 1234, CABA"}]'::jsonb,
  'Contrato de vivienda familiar. Ajuste trimestral ICL.'
) ON CONFLICT DO NOTHING;

-- Link tenant to contract 1
INSERT INTO contract_tenants (contract_id, tenant_id, role)
SELECT c.id, t.id, 'titular'
FROM contracts c
JOIN properties p ON p.id = c.property_id
JOIN tenants t ON t.email = 'juanpablo.perez@example.com'
WHERE p.name = 'Casa 3 dormitorios Belgrano'
ON CONFLICT DO NOTHING;

-- Contract 2: Oficina Puerto Madero - Started 8 months ago, IPC semestral
INSERT INTO contracts (
  property_id, contract_type, base_rent_amount, current_rent_amount, deposit_amount,
  start_date, end_date, first_payment_date, payment_due_day,
  adjustment_type, adjustment_period, last_adjustment_date, next_adjustment_date,
  late_payment_interest_rate, early_termination_penalty_months, non_return_penalty_rate,
  insurance_required, status, guarantors, notes
) VALUES (
  (SELECT id FROM properties WHERE name = 'Oficina premium Puerto Madero'),
  'comercial',
  480000.00,
  520000.00,
  960000.00,
  CURRENT_DATE - INTERVAL '8 months',
  CURRENT_DATE - INTERVAL '8 months' + INTERVAL '24 months',
  CURRENT_DATE - INTERVAL '8 months',
  5,
  'IPC', 'semestral',
  CURRENT_DATE - INTERVAL '2 months',
  CURRENT_DATE + INTERVAL '4 months',
  0.8, 3, 15.0,
  true, 'activo',
  '[{"type": "finaer", "company_name": "FINAER S.A.", "cuit": "30-71234567-9", "guarantee_code": "FIN-2024-00456", "representative_name": "María Gómez", "representative_dni": "25678901"}]'::jsonb,
  'Contrato comercial para oficina corporativa. Depósito equivalente a 2 meses.'
) ON CONFLICT DO NOTHING;

-- Link tenant to contract 2
INSERT INTO contract_tenants (contract_id, tenant_id, role)
SELECT c.id, t.id, 'titular'
FROM contracts c
JOIN properties p ON p.id = c.property_id
JOIN tenants t ON t.email = 'carolina.lopez@example.com'
WHERE p.name = 'Oficina premium Puerto Madero'
ON CONFLICT DO NOTHING;

-- Contract 3: Depto Vicente López - Started 6 months ago, ICL trimestral
INSERT INTO contracts (
  property_id, contract_type, base_rent_amount, current_rent_amount, deposit_amount,
  start_date, end_date, first_payment_date, payment_due_day,
  adjustment_type, adjustment_period, last_adjustment_date, next_adjustment_date,
  late_payment_interest_rate, early_termination_penalty_months, non_return_penalty_rate,
  insurance_required, status, guarantors, notes
) VALUES (
  (SELECT id FROM properties WHERE name = 'Depto 3 ambientes Vicente López'),
  'vivienda',
  280000.00,
  295000.00,
  280000.00,
  CURRENT_DATE - INTERVAL '6 months',
  CURRENT_DATE - INTERVAL '6 months' + INTERVAL '36 months',
  CURRENT_DATE - INTERVAL '6 months',
  1,
  'ICL', 'trimestral',
  CURRENT_DATE - INTERVAL '3 months',
  CURRENT_DATE,
  0.5, 1.5, 10.0,
  false, 'activo',
  '[{"type": "propiedad", "guarantor_name": "Jorge García", "guarantor_dni": "18234567", "guarantor_cuil": "20-18234567-0", "property_address": "Av. Mitre 2345, Avellaneda", "cadastral_data": "Circ II, Sec A, Manzana 23, Parcela 5"}]'::jsonb,
  'Contrato de vivienda. Garantía propietaria.'
) ON CONFLICT DO NOTHING;

-- Link tenants to contract 3 (titular + co-titular)
INSERT INTO contract_tenants (contract_id, tenant_id, role)
SELECT c.id, t.id, 'titular'
FROM contracts c
JOIN properties p ON p.id = c.property_id
JOIN tenants t ON t.email = 'martin.garcia@example.com'
WHERE p.name = 'Depto 3 ambientes Vicente López'
ON CONFLICT DO NOTHING;

INSERT INTO contract_tenants (contract_id, tenant_id, role)
SELECT c.id, t.id, 'co_titular'
FROM contracts c
JOIN properties p ON p.id = c.property_id
JOIN tenants t ON t.email = 'luciana.fernandez@example.com'
WHERE p.name = 'Depto 3 ambientes Vicente López'
ON CONFLICT DO NOTHING;

-- Contract 4: Depto San Martín - Started 4 months ago, fijo anual
INSERT INTO contracts (
  property_id, contract_type, base_rent_amount, current_rent_amount, deposit_amount,
  start_date, end_date, first_payment_date, payment_due_day,
  adjustment_type, adjustment_period, last_adjustment_date, next_adjustment_date,
  late_payment_interest_rate, early_termination_penalty_months, non_return_penalty_rate,
  insurance_required, status, guarantors, notes
) VALUES (
  (SELECT id FROM properties WHERE name = 'Depto 2 ambientes San Martín'),
  'vivienda',
  220000.00,
  220000.00,
  220000.00,
  CURRENT_DATE - INTERVAL '4 months',
  CURRENT_DATE - INTERVAL '4 months' + INTERVAL '24 months',
  CURRENT_DATE - INTERVAL '4 months',
  15,
  'fijo', 'anual',
  NULL,
  CURRENT_DATE + INTERVAL '8 months',
  0.5, 1, 10.0,
  false, 'activo',
  '[{"type": "persona_fisica", "full_name": "Rosa Martínez", "dni": "22345678", "cuil": "27-22345678-9", "phone": "+54 11 5432-1098", "address": "Av. Rivadavia 4567, CABA"}]'::jsonb,
  'Contrato con ajuste fijo anual del 25%.'
) ON CONFLICT DO NOTHING;

-- Link tenant to contract 4
INSERT INTO contract_tenants (contract_id, tenant_id, role)
SELECT c.id, t.id, 'titular'
FROM contracts c
JOIN properties p ON p.id = c.property_id
JOIN tenants t ON t.email = 'diego.martinez@example.com'
WHERE p.name = 'Depto 2 ambientes San Martín'
ON CONFLICT DO NOTHING;

-- ============================================
-- Payments for Contract 1 (Casa Belgrano - 10 months)
-- ============================================
DO $$
DECLARE
  v_contract_id UUID;
  v_payment_id UUID;
  v_month INTEGER;
  v_year INTEGER;
  v_rent NUMERIC;
  v_status TEXT;
  v_paid_date DATE;
  v_due_date DATE;
BEGIN
  SELECT c.id INTO v_contract_id
  FROM contracts c
  JOIN properties p ON p.id = c.property_id
  WHERE p.name = 'Casa 3 dormitorios Belgrano';

  IF v_contract_id IS NOT NULL THEN
    FOR i IN 0..11 LOOP
      v_month := EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '10 months' + (i || ' months')::INTERVAL)::INTEGER;
      v_year := EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '10 months' + (i || ' months')::INTERVAL)::INTEGER;
      v_due_date := MAKE_DATE(v_year, v_month, 10);

      -- Rent increases over time
      IF i < 3 THEN v_rent := 320000;
      ELSIF i < 6 THEN v_rent := 350000;
      ELSE v_rent := 380000;
      END IF;

      -- Status based on position
      IF v_due_date < CURRENT_DATE - INTERVAL '30 days' THEN
        v_status := 'pagado';
        v_paid_date := v_due_date + (random() * 5)::INTEGER;
      ELSIF v_due_date < CURRENT_DATE THEN
        IF random() > 0.3 THEN
          v_status := 'pagado';
          v_paid_date := v_due_date + (random() * 10)::INTEGER;
        ELSE
          v_status := 'vencido';
          v_paid_date := NULL;
        END IF;
      ELSE
        v_status := 'pendiente';
        v_paid_date := NULL;
      END IF;

      INSERT INTO payments (
        contract_id, period_month, period_year, rent_amount, total_amount,
        expected_amount, due_date, status, payment_date, actual_amount,
        payment_method, reference_number
      ) VALUES (
        v_contract_id, v_month, v_year, v_rent, v_rent + 35000,
        v_rent + 35000, v_due_date, v_status, v_paid_date,
        CASE WHEN v_status = 'pagado' THEN v_rent + 35000 ELSE NULL END,
        CASE WHEN v_status = 'pagado' THEN 'transferencia' ELSE NULL END,
        CASE WHEN v_status = 'pagado' THEN 'REC-' || TO_CHAR(v_paid_date, 'YYYYMM') || '-' || LPAD((i+1)::TEXT, 4, '0') ELSE NULL END
      )
      RETURNING id INTO v_payment_id;

      -- Add ABL concept
      INSERT INTO payment_concepts (payment_id, concept_name, amount, is_recurring)
      VALUES (v_payment_id, 'ABL', 18000, true);

      -- Add Expensas concept
      INSERT INTO payment_concepts (payment_id, concept_name, amount, is_recurring)
      VALUES (v_payment_id, 'Expensas', 17000, true);
    END LOOP;
  END IF;
END $$;

-- ============================================
-- Payments for Contract 2 (Oficina Puerto Madero - 8 months)
-- ============================================
DO $$
DECLARE
  v_contract_id UUID;
  v_payment_id UUID;
  v_month INTEGER;
  v_year INTEGER;
  v_rent NUMERIC;
  v_status TEXT;
  v_paid_date DATE;
  v_due_date DATE;
BEGIN
  SELECT c.id INTO v_contract_id
  FROM contracts c
  JOIN properties p ON p.id = c.property_id
  WHERE p.name = 'Oficina premium Puerto Madero';

  IF v_contract_id IS NOT NULL THEN
    FOR i IN 0..9 LOOP
      v_month := EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '8 months' + (i || ' months')::INTERVAL)::INTEGER;
      v_year := EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '8 months' + (i || ' months')::INTERVAL)::INTEGER;
      v_due_date := MAKE_DATE(v_year, v_month, 5);

      IF i < 6 THEN v_rent := 480000;
      ELSE v_rent := 520000;
      END IF;

      IF v_due_date < CURRENT_DATE - INTERVAL '15 days' THEN
        v_status := 'pagado';
        v_paid_date := v_due_date + (random() * 3)::INTEGER;
      ELSIF v_due_date < CURRENT_DATE THEN
        v_status := 'pendiente';
        v_paid_date := NULL;
      ELSE
        v_status := 'pendiente';
        v_paid_date := NULL;
      END IF;

      INSERT INTO payments (
        contract_id, period_month, period_year, rent_amount, total_amount,
        expected_amount, due_date, status, payment_date, actual_amount,
        payment_method, reference_number
      ) VALUES (
        v_contract_id, v_month, v_year, v_rent, v_rent + 25000,
        v_rent + 25000, v_due_date, v_status, v_paid_date,
        CASE WHEN v_status = 'pagado' THEN v_rent + 25000 ELSE NULL END,
        CASE WHEN v_status = 'pagado' THEN 'transferencia' ELSE NULL END,
        CASE WHEN v_status = 'pagado' THEN 'REC-' || TO_CHAR(v_paid_date, 'YYYYMM') || '-' || LPAD((100+i)::TEXT, 4, '0') ELSE NULL END
      )
      RETURNING id INTO v_payment_id;

      INSERT INTO payment_concepts (payment_id, concept_name, amount, is_recurring)
      VALUES (v_payment_id, 'Expensas', 25000, true);
    END LOOP;
  END IF;
END $$;

-- ============================================
-- Payments for Contract 3 (Vicente López - 6 months)
-- ============================================
DO $$
DECLARE
  v_contract_id UUID;
  v_payment_id UUID;
  v_month INTEGER;
  v_year INTEGER;
  v_rent NUMERIC;
  v_status TEXT;
  v_paid_date DATE;
  v_due_date DATE;
BEGIN
  SELECT c.id INTO v_contract_id
  FROM contracts c
  JOIN properties p ON p.id = c.property_id
  WHERE p.name = 'Depto 3 ambientes Vicente López';

  IF v_contract_id IS NOT NULL THEN
    FOR i IN 0..7 LOOP
      v_month := EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '6 months' + (i || ' months')::INTERVAL)::INTEGER;
      v_year := EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '6 months' + (i || ' months')::INTERVAL)::INTEGER;
      -- Due on 1st, but handle edge case
      v_due_date := MAKE_DATE(v_year, v_month, 1);

      IF i < 3 THEN v_rent := 280000;
      ELSE v_rent := 295000;
      END IF;

      IF v_due_date < CURRENT_DATE - INTERVAL '20 days' THEN
        v_status := 'pagado';
        v_paid_date := v_due_date + (random() * 2)::INTEGER;
      ELSIF v_due_date < CURRENT_DATE - INTERVAL '5 days' THEN
        -- One overdue payment
        IF i = 4 THEN
          v_status := 'vencido';
          v_paid_date := NULL;
        ELSE
          v_status := 'pagado';
          v_paid_date := v_due_date + 3;
        END IF;
      ELSIF v_due_date <= CURRENT_DATE THEN
        v_status := 'pendiente';
        v_paid_date := NULL;
      ELSE
        v_status := 'pendiente';
        v_paid_date := NULL;
      END IF;

      INSERT INTO payments (
        contract_id, period_month, period_year, rent_amount, total_amount,
        expected_amount, due_date, status, payment_date, actual_amount,
        payment_method, reference_number
      ) VALUES (
        v_contract_id, v_month, v_year, v_rent, v_rent + 22000,
        v_rent + 22000, v_due_date, v_status, v_paid_date,
        CASE WHEN v_status = 'pagado' THEN v_rent + 22000 ELSE NULL END,
        CASE WHEN v_status = 'pagado' THEN 'efectivo' ELSE NULL END,
        CASE WHEN v_status = 'pagado' THEN 'REC-' || TO_CHAR(v_paid_date, 'YYYYMM') || '-' || LPAD((200+i)::TEXT, 4, '0') ELSE NULL END
      )
      RETURNING id INTO v_payment_id;

      INSERT INTO payment_concepts (payment_id, concept_name, amount, is_recurring)
      VALUES (v_payment_id, 'ABL', 12000, true);

      INSERT INTO payment_concepts (payment_id, concept_name, amount, is_recurring)
      VALUES (v_payment_id, 'Expensas', 10000, true);
    END LOOP;
  END IF;
END $$;

-- ============================================
-- Payments for Contract 4 (San Martín - 4 months)
-- ============================================
DO $$
DECLARE
  v_contract_id UUID;
  v_payment_id UUID;
  v_month INTEGER;
  v_year INTEGER;
  v_rent NUMERIC := 220000;
  v_status TEXT;
  v_paid_date DATE;
  v_due_date DATE;
BEGIN
  SELECT c.id INTO v_contract_id
  FROM contracts c
  JOIN properties p ON p.id = c.property_id
  WHERE p.name = 'Depto 2 ambientes San Martín';

  IF v_contract_id IS NOT NULL THEN
    FOR i IN 0..5 LOOP
      v_month := EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '4 months' + (i || ' months')::INTERVAL)::INTEGER;
      v_year := EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '4 months' + (i || ' months')::INTERVAL)::INTEGER;
      v_due_date := MAKE_DATE(v_year, v_month, 15);

      IF v_due_date < CURRENT_DATE - INTERVAL '10 days' THEN
        v_status := 'pagado';
        v_paid_date := v_due_date + (random() * 5)::INTEGER;
      ELSIF v_due_date < CURRENT_DATE THEN
        v_status := 'vencido'; -- This tenant has an overdue payment
        v_paid_date := NULL;
      ELSE
        v_status := 'pendiente';
        v_paid_date := NULL;
      END IF;

      INSERT INTO payments (
        contract_id, period_month, period_year, rent_amount, total_amount,
        expected_amount, due_date, status, payment_date, actual_amount,
        payment_method, reference_number
      ) VALUES (
        v_contract_id, v_month, v_year, v_rent, v_rent + 15000,
        v_rent + 15000, v_due_date, v_status, v_paid_date,
        CASE WHEN v_status = 'pagado' THEN v_rent + 15000 ELSE NULL END,
        CASE WHEN v_status = 'pagado' THEN 'efectivo' ELSE NULL END,
        CASE WHEN v_status = 'pagado' THEN 'REC-' || TO_CHAR(v_paid_date, 'YYYYMM') || '-' || LPAD((300+i)::TEXT, 4, '0') ELSE NULL END
      )
      RETURNING id INTO v_payment_id;

      INSERT INTO payment_concepts (payment_id, concept_name, amount, is_recurring)
      VALUES (v_payment_id, 'ABL', 8000, true);

      INSERT INTO payment_concepts (payment_id, concept_name, amount, is_recurring)
      VALUES (v_payment_id, 'Expensas', 7000, true);
    END LOOP;
  END IF;
END $$;

-- ============================================
-- Adjustment History
-- ============================================
INSERT INTO adjustment_history (
  contract_id, executed_at, effective_from_period, adjustment_type,
  index_value_used, previous_amount, new_amount, source, notes
)
SELECT
  c.id,
  NOW() - INTERVAL '7 months',
  TO_CHAR(NOW() - INTERVAL '7 months', 'YYYY-MM'),
  'ICL', 1.094, 320000.00, 350000.00, 'manual',
  'Primer ajuste trimestral ICL (9.4%)'
FROM contracts c
JOIN properties p ON p.id = c.property_id
WHERE p.name = 'Casa 3 dormitorios Belgrano'
ON CONFLICT DO NOTHING;

INSERT INTO adjustment_history (
  contract_id, executed_at, effective_from_period, adjustment_type,
  index_value_used, previous_amount, new_amount, source, notes
)
SELECT
  c.id,
  NOW() - INTERVAL '4 months',
  TO_CHAR(NOW() - INTERVAL '4 months', 'YYYY-MM'),
  'ICL', 1.086, 350000.00, 380000.00, 'manual',
  'Segundo ajuste trimestral ICL (8.6%)'
FROM contracts c
JOIN properties p ON p.id = c.property_id
WHERE p.name = 'Casa 3 dormitorios Belgrano'
ON CONFLICT DO NOTHING;

INSERT INTO adjustment_history (
  contract_id, executed_at, effective_from_period, adjustment_type,
  index_value_used, previous_amount, new_amount, source, notes
)
SELECT
  c.id,
  NOW() - INTERVAL '2 months',
  TO_CHAR(NOW() - INTERVAL '2 months', 'YYYY-MM'),
  'IPC', 1.083, 480000.00, 520000.00, 'manual',
  'Ajuste semestral IPC (8.3%)'
FROM contracts c
JOIN properties p ON p.id = c.property_id
WHERE p.name = 'Oficina premium Puerto Madero'
ON CONFLICT DO NOTHING;

INSERT INTO adjustment_history (
  contract_id, executed_at, effective_from_period, adjustment_type,
  index_value_used, previous_amount, new_amount, source, notes
)
SELECT
  c.id,
  NOW() - INTERVAL '3 months',
  TO_CHAR(NOW() - INTERVAL '3 months', 'YYYY-MM'),
  'ICL', 1.054, 280000.00, 295000.00, 'manual',
  'Primer ajuste trimestral ICL (5.4%)'
FROM contracts c
JOIN properties p ON p.id = c.property_id
WHERE p.name = 'Depto 3 ambientes Vicente López'
ON CONFLICT DO NOTHING;

-- ============================================
-- Summary
-- ============================================
DO $$
DECLARE
  v_owners INTEGER;
  v_properties INTEGER;
  v_tenants INTEGER;
  v_contracts INTEGER;
  v_payments INTEGER;
  v_concepts INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_owners FROM owners WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_properties FROM properties WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_tenants FROM tenants WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_contracts FROM contracts WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO v_payments FROM payments;
  SELECT COUNT(*) INTO v_concepts FROM payment_concepts;

  RAISE NOTICE '';
  RAISE NOTICE '=== Seed Data Summary ===';
  RAISE NOTICE 'Owners: %', v_owners;
  RAISE NOTICE 'Properties: %', v_properties;
  RAISE NOTICE 'Tenants: %', v_tenants;
  RAISE NOTICE 'Contracts: %', v_contracts;
  RAISE NOTICE 'Payments: %', v_payments;
  RAISE NOTICE 'Payment Concepts: %', v_concepts;
  RAISE NOTICE '';
END $$;

-- ============================================
-- Instructions for Admin User
-- ============================================
-- After running this seed, create a user in Supabase Studio:
-- 1. Go to http://127.0.0.1:54323 → Authentication → Users → Add user
-- 2. Use email: admin@test.com, password: admin123
-- 3. Run the following to promote to admin:
--    UPDATE profiles SET role = 'admin' WHERE email = 'admin@test.com';
