-- ============================================
-- ADD FOREIGN KEY FROM CONTRACT_DOCUMENTS TO PROFILES
-- ============================================
-- Migration: 20260317100000_add_contract_documents_profiles_fkey.sql
-- Description:
--   Adds a foreign key from contract_documents.uploaded_by to public.profiles(id)
--   to allow PostgREST to resolve the join between contract_documents and profiles.
--
-- Root cause: contract_documents.uploaded_by references auth.users(id), but PostgREST
--   cannot resolve a join to public.profiles because there's no direct FK relationship.
--   Since profiles.id references auth.users(id), both columns share the same UUID values,
--   so adding this FK is safe.

ALTER TABLE contract_documents
ADD CONSTRAINT contract_documents_uploaded_by_profiles_fkey
FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);
