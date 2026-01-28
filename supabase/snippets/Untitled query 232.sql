-- 1. Crear un owner
INSERT INTO owners (full_name, email, phone)
VALUES ('Juan Pérez', 'juan@example.com', '11-1234-5678')
RETURNING *;

-- 2. Crear una propiedad
INSERT INTO properties (
  owner_id,
  name,
  property_type,
  address_street,
  address_number,
  address_city,
  status
) VALUES (
  (SELECT id FROM owners LIMIT 1),
  'Depto 2 ambientes Palermo',
  'departamento',
  'Av. Santa Fe',
  '3456',
  'CABA',
  'disponible'
)
RETURNING *;

-- 3. Verificar
SELECT 
  p.name,
  p.property_type,
  p.address_street,
  o.full_name as owner_name,
  p.status,
  p.created_at
FROM properties p
LEFT JOIN owners o ON o.id = p.owner_id;