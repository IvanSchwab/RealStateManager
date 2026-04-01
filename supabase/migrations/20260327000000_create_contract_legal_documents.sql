-- ============================================
-- CONTRACT LEGAL DOCUMENTS TABLE
-- ============================================
-- Migration: 20260327000000_create_contract_legal_documents.sql
-- Description:
--   1. Creates contract_legal_documents table for storing generated legal document metadata
--      (contracts, rescissions, extensions, renewals as PDF files)
--   2. Adds updated_at trigger
--   3. Creates indexes for common query patterns
--   4. Enables RLS with organization-scoped policies
--
-- Storage Note:
--   This table reuses the existing 'contract-documents' storage bucket.
--   Storage path pattern: {org_id}/{contract_id}/{uuid}-{filename}
--   No new bucket is needed - generated legal documents are stored alongside
--   uploaded contract documents in the same bucket.

BEGIN;

-- ============================================
-- STEP 1: CREATE CONTRACT_LEGAL_DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS contract_legal_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_type    TEXT NOT NULL CHECK (document_type IN (
                     'contrato', 'rescision', 'prorroga', 'renovacion'
                   )),
  storage_path     TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  generated_by     UUID REFERENCES auth.users(id),
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ DEFAULT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE contract_legal_documents IS
  'Stores metadata for generated legal documents (contracts, rescissions, extensions, renewals as PDFs).';
COMMENT ON COLUMN contract_legal_documents.document_type IS
  'Type of legal document: contrato (contract), rescision (termination), prorroga (extension), renovacion (renewal).';
COMMENT ON COLUMN contract_legal_documents.storage_path IS
  'Path in Supabase Storage (contract-documents bucket): {org_id}/{contract_id}/{uuid}-{filename}';
COMMENT ON COLUMN contract_legal_documents.file_name IS
  'Original file name of the generated document.';
COMMENT ON COLUMN contract_legal_documents.generated_by IS
  'User who generated this legal document.';
COMMENT ON COLUMN contract_legal_documents.generated_at IS
  'Timestamp when the document was generated.';
COMMENT ON COLUMN contract_legal_documents.deleted_at IS
  'Soft delete timestamp. NULL = active, NOT NULL = deleted.';

-- ============================================
-- STEP 2: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contract_legal_documents_contract_id
  ON contract_legal_documents(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_legal_documents_organization_id
  ON contract_legal_documents(organization_id);

CREATE INDEX IF NOT EXISTS idx_contract_legal_documents_document_type
  ON contract_legal_documents(document_type);

-- Partial index for active (non-deleted) records
CREATE INDEX IF NOT EXISTS idx_contract_legal_documents_deleted_at
  ON contract_legal_documents(deleted_at) WHERE deleted_at IS NULL;

-- Composite index for common query pattern: org + contract + not deleted
CREATE INDEX IF NOT EXISTS idx_contract_legal_documents_org_contract
  ON contract_legal_documents(organization_id, contract_id) WHERE deleted_at IS NULL;

-- ============================================
-- STEP 3: ADD UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_contract_legal_documents_updated_at
  BEFORE UPDATE ON contract_legal_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 4: ENABLE RLS AND CREATE POLICIES
-- ============================================

ALTER TABLE contract_legal_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users in the same organization can read legal documents
CREATE POLICY "contract_legal_documents_org_select" ON contract_legal_documents
  FOR SELECT TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND deleted_at IS NULL
  );

-- INSERT: All authenticated users in the same organization can insert
-- (collaborators need to be able to save generated PDFs)
CREATE POLICY "contract_legal_documents_org_insert" ON contract_legal_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND generated_by = auth.uid()
  );

-- UPDATE: Only admin role can update legal documents
CREATE POLICY "contract_legal_documents_org_update" ON contract_legal_documents
  FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

-- DELETE: Only admin role can delete legal documents
CREATE POLICY "contract_legal_documents_org_delete" ON contract_legal_documents
  FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

COMMENT ON POLICY "contract_legal_documents_org_select" ON contract_legal_documents IS
  'All organization members can view legal documents.';
COMMENT ON POLICY "contract_legal_documents_org_insert" ON contract_legal_documents IS
  'All organization members can insert legal documents they generate.';
COMMENT ON POLICY "contract_legal_documents_org_update" ON contract_legal_documents IS
  'Only admins can update legal documents.';
COMMENT ON POLICY "contract_legal_documents_org_delete" ON contract_legal_documents IS
  'Only admins can delete legal documents.';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;
