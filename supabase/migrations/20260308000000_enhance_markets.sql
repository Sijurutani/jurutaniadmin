-- =============================================================================
-- Migration: Create product_markets table + migrate data from markets
-- Created  : 2026-03-08
-- =============================================================================
--
-- Summary:
--   CREATE TABLE product_markets  (fresh schema, rich content, structured fields)
--   MIGRATE data from old markets → product_markets
--     - description → Tiptap JSON content
--     - attachments text {url_image} → thumbnail_url + attachments jsonb []
--     - links {shopee_link,...} → [{label, url}] dynamic array
--     - status normalized to lowercase
--     - published_at backfilled for approved rows
--
-- Storage bucket: markets (existing, NOT changed)
--   thumbnail   → markets/[id]/filename
--   gallery     → markets/[id]/gallery/filename
--   attachments → markets/[id]/attachments/filename
--
-- NOTE: Old `markets` table is kept intact. Not dropped by this migration.
-- =============================================================================

BEGIN;

-- ── 1. Create product_markets table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_markets (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text          NOT NULL,
  excerpt         text,
  slug            text          UNIQUE,
  content         jsonb         NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  category        text          NOT NULL,
  thumbnail_url   text,
  images          jsonb         NOT NULL DEFAULT '[]'::jsonb,
  price           numeric(12,2),
  price_unit      text,
  price_range     text,
  seller          text          NOT NULL,
  contact_seller  text,
  links           jsonb         NOT NULL DEFAULT '[]'::jsonb,
  attachments     jsonb         NOT NULL DEFAULT '[]'::jsonb,
  status          text          NOT NULL DEFAULT 'pending',
  user_id         uuid          REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at    timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- ── 2. Migrate data from markets → product_markets ────────────────────────────
-- Only migrate rows not yet in product_markets (idempotent)
INSERT INTO public.product_markets (
  id,
  name,
  excerpt,
  slug,
  content,
  category,
  thumbnail_url,
  images,
  price,
  price_range,
  seller,
  contact_seller,
  links,
  attachments,
  status,
  user_id,
  published_at,
  deleted_at,
  created_at,
  updated_at
)
SELECT
  m.id,
  m.name,
  -- excerpt: first 200 chars of description as teaser
  NULLIF(left(m.description, 200), '') AS excerpt,
  m.slug,
  -- content: wrap plain description into Tiptap paragraph node
  jsonb_build_object(
    'type', 'doc',
    'content', jsonb_build_array(
      jsonb_build_object(
        'type', 'paragraph',
        'content', CASE
          WHEN m.description IS NOT NULL AND m.description <> ''
            THEN jsonb_build_array(
                   jsonb_build_object('type', 'text', 'text', m.description)
                 )
          ELSE '[]'::jsonb
        END
      )
    )
  ) AS content,
  m.category,
  -- thumbnail_url: extract from old {"url_image": "markets/..."}  text field
  CASE
    WHEN m.attachments IS NOT NULL AND m.attachments <> '' AND m.attachments <> 'null'
      THEN (m.attachments::jsonb) ->> 'url_image'
    ELSE NULL
  END AS thumbnail_url,
  '[]'::jsonb AS images,
  m.price,
  m.price_range,
  m.seller,
  m.contact_seller,
  -- links: remap fixed keys → dynamic [{label, url}] array (skip nulls)
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', lbl, 'url', url) ORDER BY ord)
    FROM (
      VALUES
        (1, 'Shopee',    (m.links) ->> 'shopee_link'),
        (2, 'TikTok',    (m.links) ->> 'tiktok_link'),
        (3, 'Tokopedia', (m.links) ->> 'tokopedia_link')
    ) AS t(ord, lbl, url)
    WHERE url IS NOT NULL AND url <> ''
  ), '[]'::jsonb) AS links,
  '[]'::jsonb AS attachments,
  -- status: normalize to lowercase
  COALESCE(lower(m.status), 'pending') AS status,
  m.user_id,
  -- published_at: backfill for already-approved rows
  CASE
    WHEN lower(m.status) = 'approved' THEN m.updated_at
    ELSE NULL
  END AS published_at,
  m.deleted_at,
  m.created_at,
  m.updated_at
FROM public.markets m
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_markets pm WHERE pm.id = m.id
);

-- ── 3. Performance indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_product_markets_status
  ON public.product_markets (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_markets_category
  ON public.product_markets (category)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_markets_user_id
  ON public.product_markets (user_id);

CREATE INDEX IF NOT EXISTS idx_product_markets_published_at
  ON public.product_markets (published_at DESC)
  WHERE published_at IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_markets_slug
  ON public.product_markets (slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_markets_price
  ON public.product_markets (price)
  WHERE price IS NOT NULL AND deleted_at IS NULL;

-- ── 4. RLS Policies ───────────────────────────────────────────────────────────
ALTER TABLE public.product_markets ENABLE ROW LEVEL SECURITY;

-- Public can view approved, non-deleted products
DROP POLICY IF EXISTS "product_markets_public_read" ON public.product_markets;
CREATE POLICY "product_markets_public_read"
  ON public.product_markets FOR SELECT
  USING (status = 'approved' AND deleted_at IS NULL);

-- Owner (user who created) can see all their own records
DROP POLICY IF EXISTS "product_markets_owner_read" ON public.product_markets;
CREATE POLICY "product_markets_owner_read"
  ON public.product_markets FOR SELECT
  USING (auth.uid() = user_id);

-- Owner can insert
DROP POLICY IF EXISTS "product_markets_owner_insert" ON public.product_markets;
CREATE POLICY "product_markets_owner_insert"
  ON public.product_markets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owner can update their own records (not delete)
DROP POLICY IF EXISTS "product_markets_owner_update" ON public.product_markets;
CREATE POLICY "product_markets_owner_update"
  ON public.product_markets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin can do everything (uses existing is_admin() function)
DROP POLICY IF EXISTS "product_markets_admin_all" ON public.product_markets;
CREATE POLICY "product_markets_admin_all"
  ON public.product_markets FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 5. Auto updated_at trigger ────────────────────────────────────────────────
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
    WHERE tgname = 'set_product_markets_updated_at'
      AND tgrelid = 'public.product_markets'::regclass
  ) THEN
    CREATE TRIGGER set_product_markets_updated_at
      BEFORE UPDATE ON public.product_markets
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END;
$$;

COMMIT;
