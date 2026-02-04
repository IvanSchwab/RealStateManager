SELECT p.id, p.email, p.role, p.full_name
FROM profiles p;

-- Promover a admin (reemplazá el email con el tuyo)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@test.com';

-- Verificar
SELECT * FROM profiles WHERE email = 'admin@test.com';
