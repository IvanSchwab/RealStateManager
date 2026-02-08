-- File: supabase/migrations/[timestamp]_add_deleted_at_to_owners.sql

ALTER TABLE owners 
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index para mejorar queries
CREATE INDEX idx_owners_deleted_at ON owners(deleted_at) 
WHERE deleted_at IS NULL;

COMMENT ON COLUMN owners.deleted_at IS 'Soft delete timestamp';