-- 1. Eliminar la columna
ALTER TABLE properties
DROP COLUMN purpose;

-- 2. Eliminar el enum
DROP TYPE property_purpose;

-- 3. Crear el enum correcto
CREATE TYPE property_purpose AS ENUM ('alquiler', 'venta');

-- 4. Volver a crear la columna
ALTER TABLE properties
ADD COLUMN purpose property_purpose;
