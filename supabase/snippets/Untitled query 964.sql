-- Recrear usuario admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  ''
)
ON CONFLICT (email) DO NOTHING;

-- Verificar que el profile se creó
SELECT * FROM profiles WHERE email = 'admin@test.com';

-- Crear owner
INSERT INTO owners (full_name, email, phone)
VALUES ('María González', 'maria@example.com', '+54 11 1234-5678');

-- Crear property
INSERT INTO properties (
  owner_id, 
  address, 
  property_type, 
  status,
  bedrooms,
  bathrooms,
  total_area
)
SELECT 
  id,
  'Av. Corrientes 1234, CABA',
  'departamento',
  'disponible',
  2,
  1,
  50.00
FROM owners
WHERE email = 'maria@example.com'
LIMIT 1;

-- Crear tenant
INSERT INTO tenants (
  full_name,
  email,
  phone,
  address
)
VALUES (
  'Juan Pérez',
  'juan@example.com',
  '+54 11 8765-4321',
  'Calle Falsa 123, CABA'
);