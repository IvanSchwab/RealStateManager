-- ============================================
-- LEGAL DOCUMENTS MODULE - DATABASE FOUNDATION
-- ============================================
-- Migration: 20260403000000_create_legal_documents.sql
-- Description:
--   Creates the database foundation for the Legal Documents module.
--   This module handles standalone legal documents that are NOT rental contracts:
--     - Corretaje authorization
--     - Boleto de compraventa
--     - Entrega de llaves
--
-- This migration:
--   1. Extends properties.status to include 'vendida'
--   2. Creates the legal_documents table
--   3. Creates performance indexes
--   4. Adds updated_at trigger
--   5. Enables RLS and creates policies
--
-- Storage: Uses existing 'contract-documents' bucket
-- Path convention: {org_id}/properties/{property_id}/legal/{uuid}-{filename}

BEGIN;

-- ============================================
-- STEP 1: EXTEND PROPERTIES STATUS CONSTRAINT
-- ============================================
-- Add 'vendida' to the allowed status values for properties.
-- This is needed because boleto_compraventa documents relate to sold properties.

ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_status_check
  CHECK (status IN ('disponible', 'alquilada', 'mantenimiento', 'reservada', 'vendida'));

COMMENT ON COLUMN properties.status IS
  'Current status: disponible, alquilada, mantenimiento, reservada, vendida.';

-- ============================================
-- STEP 2: CREATE LEGAL_DOCUMENTS TABLE
-- ============================================

CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  document_type TEXT NOT NULL CHECK (document_type IN ('corretaje', 'boleto_compraventa', 'entrega_llaves')),
  metadata JSONB NOT NULL DEFAULT '{}',
  pdf_url TEXT NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE legal_documents IS
  'Standalone legal documents not tied to rental contracts: corretaje authorization, boleto de compraventa, entrega de llaves.';
COMMENT ON COLUMN legal_documents.document_type IS
  'Type of legal document: corretaje, boleto_compraventa, entrega_llaves.';
COMMENT ON COLUMN legal_documents.metadata IS
  'Document-specific data stored as JSON (parties, dates, amounts, clauses, etc.).';
COMMENT ON COLUMN legal_documents.pdf_url IS
  'URL to the generated PDF in storage. Path: {org_id}/properties/{property_id}/legal/{uuid}-{filename}';
COMMENT ON COLUMN legal_documents.created_by IS
  'User who created this document.';

-- ============================================
-- STEP 3: CREATE INDEXES
-- ============================================

CREATE INDEX idx_legal_documents_org ON legal_documents(organization_id);
CREATE INDEX idx_legal_documents_property ON legal_documents(property_id);
CREATE INDEX idx_legal_documents_type ON legal_documents(document_type);
CREATE INDEX idx_legal_documents_org_type ON legal_documents(organization_id, document_type);

-- ============================================
-- STEP 4: ADD UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON legal_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 5: ENABLE RLS AND CREATE POLICIES
-- ============================================

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users in the same organization can read documents
CREATE POLICY legal_documents_org_select ON legal_documents
  FOR SELECT USING (organization_id = get_user_organization_id());

-- INSERT: Only admin and manager roles can create documents
CREATE POLICY legal_documents_org_insert ON legal_documents
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- UPDATE: Only admin and manager roles can update documents
CREATE POLICY legal_documents_org_update ON legal_documents
  FOR UPDATE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

-- DELETE: Only admin and manager roles can delete documents
CREATE POLICY legal_documents_org_delete ON legal_documents
  FOR DELETE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'manager')
  );

COMMENT ON POLICY legal_documents_org_select ON legal_documents IS
  'All organization members can view legal documents.';
COMMENT ON POLICY legal_documents_org_insert ON legal_documents IS
  'Only admins and managers can create legal documents.';
COMMENT ON POLICY legal_documents_org_update ON legal_documents IS
  'Only admins and managers can update legal documents.';
COMMENT ON POLICY legal_documents_org_delete ON legal_documents IS
  'Only admins and managers can delete legal documents.';

-- ============================================
-- STORAGE PATH CONVENTION (DOCUMENTATION)
-- ============================================
-- Legal documents are stored in the existing 'contract-documents' bucket.
-- No new bucket is created.
--
-- Path convention for legal documents:
--   {org_id}/properties/{property_id}/legal/{uuid}-{filename}
--
-- Examples:
--   abc123/properties/def456/legal/789xyz-corretaje_authorization.pdf
--   abc123/properties/def456/legal/789xyz-boleto_compraventa.pdf
--   abc123/properties/def456/legal/789xyz-entrega_llaves.pdf
--
-- This convention:
--   - Groups documents by organization (tenant isolation)
--   - Groups by property for easy lookup
--   - Uses /legal/ subdirectory to distinguish from contract documents
--   - Prefixes filename with UUID to ensure uniqueness

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

COMMIT;
