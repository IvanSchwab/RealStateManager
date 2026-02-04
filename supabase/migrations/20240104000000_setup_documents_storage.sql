-- ============================================
-- DOCUMENTS STORAGE SETUP
-- ============================================
-- Migration: 20240104000000_setup_documents_storage.sql
-- Description: Creates Supabase Storage bucket for documents and RLS policies.

-- Create bucket for documents (private - requires authentication)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  5242880, -- 5MB max file size
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
);

-- ============================================
-- STORAGE RLS POLICIES
-- ============================================

-- Allow authenticated users to upload documents
-- Path structure: {user_id}/{entity_type}/{entity_id}/{filename}
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view documents
-- Users can view any document in the bucket (RLS on documents table handles access control)
CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow users to update their uploaded documents
CREATE POLICY "Users can update their uploaded documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their uploaded documents
CREATE POLICY "Users can delete their uploaded documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- ADDITIONAL INDEXES FOR DOCUMENTS TABLE
-- ============================================
-- Note: Basic index idx_documents_entity already exists in complete_schema.sql
-- Adding additional indexes for common queries

-- Index for listing documents by type
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

-- Index for finding recent uploads
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
