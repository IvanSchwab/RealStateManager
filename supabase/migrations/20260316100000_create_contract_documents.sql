-- ============================================
-- CONTRACT DOCUMENTS TABLE AND STORAGE
-- ============================================
-- Migration: 20260316100000_create_contract_documents.sql
-- Description:
--   1. Creates contract_documents table for storing document metadata
--   2. Creates contract-documents storage bucket
--   3. Sets up RLS policies for both table and storage

BEGIN;

-- ============================================
-- STEP 1: CREATE CONTRACT_DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS contract_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('dni', 'payslip', 'guarantor_doc', 'custom')),
  custom_type_label text, -- only used when document_type = 'custom'
  storage_path text NOT NULL,
  file_size bigint NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  deleted_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE contract_documents IS 'Stores metadata for documents attached to contracts (DNI, payslips, guarantor docs, etc.)';
COMMENT ON COLUMN contract_documents.document_type IS 'Type of document: dni, payslip, guarantor_doc, or custom';
COMMENT ON COLUMN contract_documents.custom_type_label IS 'Custom label when document_type is "custom"';
COMMENT ON COLUMN contract_documents.storage_path IS 'Path in Supabase Storage: {org_id}/{contract_id}/{uuid}-{filename}';
COMMENT ON COLUMN contract_documents.deleted_at IS 'Soft delete timestamp - documents are not hard deleted via RLS';

-- ============================================
-- STEP 2: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contract_documents_contract_id ON contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_org_id ON contract_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_deleted_at ON contract_documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_contract_documents_created_at ON contract_documents(created_at DESC);

-- ============================================
-- STEP 3: ENABLE RLS
-- ============================================

ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: RLS POLICIES FOR CONTRACT_DOCUMENTS
-- ============================================

-- SELECT: Authenticated users can read documents from their organization
CREATE POLICY "contract_documents_org_select" ON contract_documents
  FOR SELECT TO authenticated
  USING (org_id = get_user_organization_id());

-- INSERT: Authenticated users can insert documents for their organization
CREATE POLICY "contract_documents_org_insert" ON contract_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = get_user_organization_id()
    AND uploaded_by = auth.uid()
  );

-- UPDATE (soft delete): Only admins and managers can soft delete
CREATE POLICY "contract_documents_org_update" ON contract_documents
  FOR UPDATE TO authenticated
  USING (
    org_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  )
  WITH CHECK (
    org_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- DELETE: Not allowed via RLS (hard deletes done by Edge Function with service role)
-- No DELETE policy created intentionally

COMMENT ON POLICY "contract_documents_org_select" ON contract_documents IS
  'Authenticated users can view documents from their organization.';
COMMENT ON POLICY "contract_documents_org_insert" ON contract_documents IS
  'Authenticated users can upload documents to their organization.';
COMMENT ON POLICY "contract_documents_org_update" ON contract_documents IS
  'Only admins and managers can update (soft delete) documents in their organization.';

-- ============================================
-- STEP 5: CREATE STORAGE BUCKET
-- ============================================

-- Create bucket for contract documents (private - requires authentication)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-documents',
  'contract-documents',
  false,
  10485760, -- 10MB max file size
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 6: STORAGE RLS POLICIES
-- ============================================

-- Path structure: {org_id}/{contract_id}/{uuid}-{filename}
-- First folder is org_id for RLS matching

-- SELECT (download): Authenticated users where first folder matches their org_id
CREATE POLICY "contract_documents_storage_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = (get_user_organization_id())::text
);

-- INSERT (upload): Authenticated users where first folder matches their org_id
CREATE POLICY "contract_documents_storage_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contract-documents'
  AND (storage.foldername(name))[1] = (get_user_organization_id())::text
);

-- DELETE: Not allowed via RLS
-- Deletion is handled by Edge Function with service role key
-- No DELETE policy created intentionally

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;
