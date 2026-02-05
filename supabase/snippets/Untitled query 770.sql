-- Primero un owner
INSERT INTO owners (full_name, email, phone)
VALUES ('María González', 'maria@example.com', '+54 11 1234-5678')
RETURNING id;

-- Usa el ID del owner en esta query
INSERT INTO properties (
  owner_id, 
  address, 
  property_type, 
  status,
  bedrooms,
  bathrooms,
  total_area
)
VALUES (
  'AQUI_EL_ID_DEL_OWNER', 
  'Av. Corrientes 1234, CABA', 
  'departamento', 
  'disponible',
  2,
  1,
  50.00
);