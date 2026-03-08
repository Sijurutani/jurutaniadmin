-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Create Storage Buckets for Courses
-- Date     : 2026-03-09
-- Bucket   : courses-images (public)
--   Path structure:
--     covers/{courseId}/{timestamp_random}.{ext}
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Create bucket jika belum ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'courses-images',
  'courses-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── RLS Policies ─────────────────────────────────────────────────────────────

-- Public: siapa saja bisa READ (karena bucket public)
DROP POLICY IF EXISTS "courses_images_public_read" ON storage.objects;
CREATE POLICY "courses_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'courses-images');

-- Authenticated: bisa UPLOAD cover ke folder covers/<courseId>/
DROP POLICY IF EXISTS "courses_images_auth_insert" ON storage.objects;
CREATE POLICY "courses_images_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'courses-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'covers'
  );

-- Update: hanya admin atau pemilik course (via is_admin)
DROP POLICY IF EXISTS "courses_images_admin_update" ON storage.objects;
CREATE POLICY "courses_images_admin_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'courses-images'
    AND (auth.role() = 'authenticated')
  );

-- Delete: hanya admin
DROP POLICY IF EXISTS "courses_images_admin_delete" ON storage.objects;
CREATE POLICY "courses_images_admin_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'courses-images'
    AND public.is_admin()
  );
