-- Add logo_url column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN organizations.logo_url IS 'URL to the organization logo image stored in Supabase Storage';

-- Create storage bucket for organization logos (if not exists)
-- Note: This needs to be run via Supabase dashboard or CLI as storage buckets
-- cannot be created via SQL migrations. Create bucket 'org-logos' with:
-- - Public access: true
-- - File size limit: 2MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp, image/svg+xml

-- Storage policies for org-logos bucket (run in Supabase dashboard SQL editor):
/*
-- Allow authenticated users to upload to their organization's folder
CREATE POLICY "Users can upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-logos' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to update their organization's logo
CREATE POLICY "Users can update org logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-logos' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- Allow authenticated users to delete their organization's logo
CREATE POLICY "Users can delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-logos' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM profiles
    WHERE id = auth.uid()
  )
);

-- Allow public read access to org logos
CREATE POLICY "Public read access for org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-logos');
*/
