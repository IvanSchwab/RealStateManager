-- Add avatar_url column to profiles table for per-user avatar storage
-- This fixes the bug where user avatars were stored in organizations table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.avatar_url IS 'URL to the user profile avatar image stored in Supabase Storage';

-- Create storage bucket for user avatars (if not exists)
-- Note: This needs to be run via Supabase dashboard or CLI as storage buckets
-- cannot be created via SQL migrations. Create bucket 'avatars' with:
-- - Public access: true
-- - File size limit: 2MB
-- - Allowed MIME types: image/jpeg, image/png, image/webp, image/svg+xml

-- Storage policies for avatars bucket (run in Supabase dashboard SQL editor):
/*
-- Allow authenticated users to upload to their own folder only
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to avatars (so they can be displayed)
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
*/

-- RLS policy: Allow users to update their own profile
-- (This may already exist, adding IF NOT EXISTS safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
  END IF;
END $$;
