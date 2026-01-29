-- ============================================
-- Seed: Test Data for Development
-- ============================================
-- Run this after migrations to populate the database with test data.
-- Usage: supabase db reset (runs migrations + seed automatically)

-- ============================================
-- Owners
-- ============================================
INSERT INTO owners (full_name, email, phone, address, cuit_cuil) VALUES
  ('María González', 'maria@example.com', '11-2345-6789', 'Av. Libertador 1234, CABA', '20-12345678-9'),
  ('Carlos Rodríguez', 'carlos@example.com', '11-3456-7890', 'Av. Rivadavia 5678, CABA', '20-23456789-0'),
  ('Ana Martínez', 'ana@example.com', '11-4567-8901', 'Av. Corrientes 910, CABA', '27-34567890-1'),
  ('Roberto Fernández', 'roberto@example.com', '11-5678-9012', 'Av. Santa Fe 1112, CABA', '20-45678901-2'),
  ('Laura Sánchez', 'laura@example.com', '11-6789-0123', 'Av. Cabildo 1314, CABA', '27-56789012-3')
ON CONFLICT DO NOTHING;

-- ============================================
-- Properties
-- ============================================
INSERT INTO properties (
  owner_id,
  name,
  property_type,
  address_street,
  address_number,
  address_floor,
  address_apartment,
  address_city,
  address_state,
  status,
  bedrooms,
  bathrooms,
  square_meters,
  description
) VALUES
  (
    (SELECT id FROM owners WHERE email = 'maria@example.com'),
    'Depto 2 ambientes Palermo',
    'departamento',
    'Av. Santa Fe',
    '3456',
    '5',
    'A',
    'CABA',
    'CABA',
    'disponible',
    2,
    1,
    45.5,
    'Departamento luminoso en pleno Palermo. Cocina integrada, balcón con parrilla. A metros del subte D.'
  ),
  (
    (SELECT id FROM owners WHERE email = 'carlos@example.com'),
    'Casa 3 dormitorios Belgrano',
    'casa',
    'Av. Cabildo',
    '1234',
    NULL,
    NULL,
    'CABA',
    'CABA',
    'alquilada',
    3,
    2,
    120.0,
    'Casa amplia con jardín y cochera. Ideal para familias. Cerca de colegios y transporte.'
  ),
  (
    (SELECT id FROM owners WHERE email = 'ana@example.com'),
    'Local comercial Microcentro',
    'comercial',
    'Av. Corrientes',
    '789',
    'PB',
    NULL,
    'CABA',
    'CABA',
    'disponible',
    NULL,
    1,
    80.0,
    'Local a la calle sobre avenida principal. Gran vidriera. Ideal para gastronomía o retail.'
  ),
  (
    (SELECT id FROM owners WHERE email = 'roberto@example.com'),
    'Oficina premium Puerto Madero',
    'oficina',
    'Juana Manso',
    '205',
    '12',
    '1201',
    'CABA',
    'CABA',
    'reservada',
    NULL,
    2,
    150.0,
    'Oficina AAA con vista al dique. Edificio inteligente, seguridad 24hs, cochera incluida.'
  ),
  (
    (SELECT id FROM owners WHERE email = 'laura@example.com'),
    'Monoambiente Recoleta',
    'departamento',
    'Av. Callao',
    '1567',
    '8',
    'B',
    'CABA',
    'CABA',
    'mantenimiento',
    1,
    1,
    32.0,
    'Monoambiente con cocina separada. Edificio con amenities. En proceso de refacción.'
  ),
  (
    (SELECT id FROM owners WHERE email = 'maria@example.com'),
    'Galpón industrial Avellaneda',
    'galpon',
    'Av. Mitre',
    '4500',
    NULL,
    NULL,
    'Avellaneda',
    'Buenos Aires',
    'disponible',
    NULL,
    2,
    500.0,
    'Galpón con oficinas administrativas, baños y vestuarios. Portón de acceso para camiones.'
  ),
  (
    (SELECT id FROM owners WHERE email = 'carlos@example.com'),
    'Terreno en Country',
    'terreno',
    'Lote 45 - Country Los Robles',
    NULL,
    NULL,
    NULL,
    'Pilar',
    'Buenos Aires',
    'disponible',
    NULL,
    NULL,
    800.0,
    'Lote en country privado con seguridad 24hs. Arbolado, ideal para construir casa de fin de semana.'
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- Instructions for Admin User
-- ============================================
-- After running this seed, create a user in Supabase Studio:
-- 1. Go to http://127.0.0.1:54323 → Authentication → Users → Add user
-- 2. Use email: admin@test.com, password: admin123
-- 3. Run the following to promote to admin:
--    UPDATE profiles SET role = 'admin' WHERE email = 'admin@test.com';
