-- =============================================================================
-- Migration: Create meeting_schedules table
-- Created  : 2026-03-08
-- =============================================================================
--
-- Summary:
--   Tabel baru untuk mencatat jadwal / recap pertemuan berbasis embed sosial media.
--   Tidak ada upload gambar — konten disajikan langsung dari postingan sosmed
--   (Instagram Post/Reel, Facebook, YouTube, TikTok, Twitter/X) via kolom embeds (jsonb).
--
-- Kolom embeds — setiap item:
--   {
--     "id"       : "uuid-lokal",        -- ID client-side untuk tracking
--     "platform" : "instagram_reel",    -- lihat daftar platform di bawah
--     "url"      : "https://...",       -- URL postingan sosmed
--     "order"    : 0                    -- urutan tampil
--   }
--
-- Platform yang didukung (nilai kolom platform):
--   instagram_post | instagram_reel | facebook_post | facebook_video
--   youtube        | tiktok         | twitter
--
-- RLS:
--   - Publik : SELECT semua row yang tidak di-soft-delete / archived
--   - Pemilik: SELECT + INSERT + UPDATE baris miliknya sendiri
--   - Admin  : ALL (via is_admin())
-- =============================================================================

BEGIN;

-- ── 1. Create meeting_schedules table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meeting_schedules (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Judul singkat untuk identifikasi di listing/admin
  title       text        NOT NULL,

  -- Array embed sosial media (wajib diisi minimal 1)
  embeds      jsonb       NOT NULL DEFAULT '[]'::jsonb,

  -- Catatan / deskripsi tambahan dari admin (opsional)
  content     text,

  -- Pemilik entri (otomatis terisi dari auth.uid() di sisi client/RLS)
  author_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Timestamps
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at  timestamptz
);

-- ── 2. Performance indexes ─────────────────────────────────────────────────────
-- Soft-delete filter (paling sering dipakai)
CREATE INDEX IF NOT EXISTS idx_meeting_schedules_deleted_at
  ON public.meeting_schedules (deleted_at)
  WHERE deleted_at IS NULL;

-- Archive filter
CREATE INDEX IF NOT EXISTS idx_meeting_schedules_archived_at
  ON public.meeting_schedules (archived_at)
  WHERE archived_at IS NULL;

-- Author lookup
CREATE INDEX IF NOT EXISTS idx_meeting_schedules_author_id
  ON public.meeting_schedules (author_id);

-- Created at desc (default sort di listing)
CREATE INDEX IF NOT EXISTS idx_meeting_schedules_created_at
  ON public.meeting_schedules (created_at DESC);

-- GIN index untuk query JSONB embeds (misal: filter by platform)
CREATE INDEX IF NOT EXISTS idx_meeting_schedules_embeds_gin
  ON public.meeting_schedules USING GIN (embeds);

-- ── 3. Helper function: is owner ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_meeting_schedule_author(schedule_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.meeting_schedules
    WHERE id = schedule_id
      AND author_id = auth.uid()
  );
$$;

-- ── 4. RLS Policies ───────────────────────────────────────────────────────────
ALTER TABLE public.meeting_schedules ENABLE ROW LEVEL SECURITY;

-- Publik bisa baca semua yang tidak dihapus/archived
DROP POLICY IF EXISTS "meeting_schedules_public_read" ON public.meeting_schedules;
CREATE POLICY "meeting_schedules_public_read"
  ON public.meeting_schedules FOR SELECT
  USING (deleted_at IS NULL AND archived_at IS NULL);

-- Author bisa baca semua miliknya (termasuk yang archived)
DROP POLICY IF EXISTS "meeting_schedules_author_read" ON public.meeting_schedules;
CREATE POLICY "meeting_schedules_author_read"
  ON public.meeting_schedules FOR SELECT
  USING (auth.uid() = author_id AND deleted_at IS NULL);

-- Author bisa insert (author_id harus = uid)
DROP POLICY IF EXISTS "meeting_schedules_author_insert" ON public.meeting_schedules;
CREATE POLICY "meeting_schedules_author_insert"
  ON public.meeting_schedules FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Author bisa update miliknya sendiri
DROP POLICY IF EXISTS "meeting_schedules_author_update" ON public.meeting_schedules;
CREATE POLICY "meeting_schedules_author_update"
  ON public.meeting_schedules FOR UPDATE
  USING (auth.uid() = author_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = author_id);

-- Admin bisa semua
DROP POLICY IF EXISTS "meeting_schedules_admin_all" ON public.meeting_schedules;
CREATE POLICY "meeting_schedules_admin_all"
  ON public.meeting_schedules FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 5. Auto updated_at trigger ────────────────────────────────────────────────
-- Fungsi handle_updated_at() diasumsikan sudah ada dari migration sebelumnya.
-- Jika belum, buat ulang di sini:
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_meeting_schedules_updated_at'
      AND tgrelid = 'public.meeting_schedules'::regclass
  ) THEN
    CREATE TRIGGER set_meeting_schedules_updated_at
      BEFORE UPDATE ON public.meeting_schedules
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END;
$$;

COMMIT;
