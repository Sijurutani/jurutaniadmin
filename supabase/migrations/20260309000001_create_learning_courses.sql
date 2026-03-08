-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Learning Courses (LMS)
-- Date     : 2026-03-09
-- Tables   : learning_courses, course_lessons, course_lesson_progress,
--            course_completions, course_comments, course_ratings
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


-- ── 0. Helpers ────────────────────────────────────────────────────────────────

-- handle_updated_at() sudah ada dari migration sebelumnya, tapi kita OR REPLACE
-- agar safe jika dijalankan ulang.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fungsi untuk generate human-readable prefixed ID: <prefix>-<12 hex chars>
CREATE OR REPLACE FUNCTION public.generate_prefixed_id(prefix text)
RETURNS text LANGUAGE sql AS $$
  SELECT prefix || '-' || lower(substring(replace(gen_random_uuid()::text, '-', ''), 1, 12))
$$;


-- ── 1. learning_courses ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.learning_courses (
  id          text        PRIMARY KEY DEFAULT public.generate_prefixed_id('crs'),
  title       text        NOT NULL,
  slug        text        UNIQUE,
  description jsonb       NOT NULL DEFAULT '{}',
  cover_image text,
  category    text,
  status      text        NOT NULL DEFAULT 'pending',
  author_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at  timestamptz,

  CONSTRAINT learning_courses_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'archived', 'deleted'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_courses_deleted_at
  ON public.learning_courses (deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_learning_courses_status
  ON public.learning_courses (status);

CREATE INDEX IF NOT EXISTS idx_learning_courses_author_id
  ON public.learning_courses (author_id);

CREATE INDEX IF NOT EXISTS idx_learning_courses_slug
  ON public.learning_courses (slug);

CREATE INDEX IF NOT EXISTS idx_learning_courses_description
  ON public.learning_courses USING GIN (description jsonb_path_ops);

-- RLS
ALTER TABLE public.learning_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "learning_courses_public_read" ON public.learning_courses;
CREATE POLICY "learning_courses_public_read"
  ON public.learning_courses FOR SELECT
  USING (status = 'approved' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "learning_courses_author_read_own" ON public.learning_courses;
CREATE POLICY "learning_courses_author_read_own"
  ON public.learning_courses FOR SELECT
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "learning_courses_author_insert" ON public.learning_courses;
CREATE POLICY "learning_courses_author_insert"
  ON public.learning_courses FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "learning_courses_author_update" ON public.learning_courses;
CREATE POLICY "learning_courses_author_update"
  ON public.learning_courses FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "learning_courses_admin_all" ON public.learning_courses;
CREATE POLICY "learning_courses_admin_all"
  ON public.learning_courses FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_learning_courses_updated_at'
      AND tgrelid = 'public.learning_courses'::regclass
  ) THEN
    CREATE TRIGGER set_learning_courses_updated_at
      BEFORE UPDATE ON public.learning_courses
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END;
$$;


-- ── 2. course_lessons ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id          text        PRIMARY KEY DEFAULT public.generate_prefixed_id('lsn'),
  course_id   text        NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  slug        text        NOT NULL,
  content     jsonb       NOT NULL DEFAULT '{}',
  embeds      jsonb       NOT NULL DEFAULT '[]',
  order_index int         NOT NULL DEFAULT 0,
  status      text        NOT NULL DEFAULT 'pending',
  published_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,

  CONSTRAINT course_lessons_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'archived', 'deleted')),

  CONSTRAINT course_lessons_slug_unique UNIQUE (course_id, slug)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id
  ON public.course_lessons (course_id);

CREATE INDEX IF NOT EXISTS idx_course_lessons_published_at
  ON public.course_lessons (published_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_course_lessons_order
  ON public.course_lessons (course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_course_lessons_status
  ON public.course_lessons (course_id, status);

CREATE INDEX IF NOT EXISTS idx_course_lessons_embeds
  ON public.course_lessons USING GIN (embeds);

CREATE INDEX IF NOT EXISTS idx_course_lessons_content
  ON public.course_lessons USING GIN (content jsonb_path_ops);

-- RLS
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_lessons_public_read" ON public.course_lessons;
CREATE POLICY "course_lessons_public_read"
  ON public.course_lessons FOR SELECT
  USING (
    status = 'approved'
    AND published_at IS NOT NULL
    AND published_at <= now()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.learning_courses lc
      WHERE lc.id = course_id
        AND lc.status = 'approved'
        AND lc.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS "course_lessons_author_read_own" ON public.course_lessons;
CREATE POLICY "course_lessons_author_read_own"
  ON public.course_lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_courses lc
      WHERE lc.id = course_id
        AND lc.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "course_lessons_author_insert" ON public.course_lessons;
CREATE POLICY "course_lessons_author_insert"
  ON public.course_lessons FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_courses lc
      WHERE lc.id = course_id
        AND lc.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "course_lessons_author_update" ON public.course_lessons;
CREATE POLICY "course_lessons_author_update"
  ON public.course_lessons FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_courses lc
      WHERE lc.id = course_id
        AND lc.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "course_lessons_admin_all" ON public.course_lessons;
CREATE POLICY "course_lessons_admin_all"
  ON public.course_lessons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_course_lessons_updated_at'
      AND tgrelid = 'public.course_lessons'::regclass
  ) THEN
    CREATE TRIGGER set_course_lessons_updated_at
      BEFORE UPDATE ON public.course_lessons
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END;
$$;


-- ── 3. course_lesson_progress ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_lesson_progress (
  lesson_id    text        NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id    text        NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (lesson_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course
  ON public.course_lesson_progress (user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id
  ON public.course_lesson_progress (lesson_id);

-- RLS
ALTER TABLE public.course_lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lesson_progress_user_read_own" ON public.course_lesson_progress;
CREATE POLICY "lesson_progress_user_read_own"
  ON public.course_lesson_progress FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "lesson_progress_user_insert" ON public.course_lesson_progress;
CREATE POLICY "lesson_progress_user_insert"
  ON public.course_lesson_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "lesson_progress_user_delete" ON public.course_lesson_progress;
CREATE POLICY "lesson_progress_user_delete"
  ON public.course_lesson_progress FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "lesson_progress_admin_read" ON public.course_lesson_progress;
CREATE POLICY "lesson_progress_admin_read"
  ON public.course_lesson_progress FOR SELECT
  USING (public.is_admin());


-- ── 4. course_completions ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_completions (
  course_id     text        NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_at  timestamptz NOT NULL DEFAULT now(),
  lesson_count  int         NOT NULL,
  invalidated_at timestamptz,

  PRIMARY KEY (course_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_completions_course_id
  ON public.course_completions (course_id);

CREATE INDEX IF NOT EXISTS idx_course_completions_user_id
  ON public.course_completions (user_id);

-- RLS
ALTER TABLE public.course_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_completions_user_read_own" ON public.course_completions;
CREATE POLICY "course_completions_user_read_own"
  ON public.course_completions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "course_completions_admin_read" ON public.course_completions;
CREATE POLICY "course_completions_admin_read"
  ON public.course_completions FOR SELECT
  USING (public.is_admin());

-- Insert & delete hanya via service role / DB triggers — tidak ada policy untuk authenticated users.


-- ── 5. course_comments ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_comments (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id text        NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  lesson_id text        NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id uuid        REFERENCES public.course_comments(id) ON DELETE CASCADE,
  content   text        NOT NULL,
  is_hidden boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_comments_lesson_id
  ON public.course_comments (lesson_id);

CREATE INDEX IF NOT EXISTS idx_course_comments_parent_id
  ON public.course_comments (parent_id);

CREATE INDEX IF NOT EXISTS idx_course_comments_user_id
  ON public.course_comments (user_id);

CREATE INDEX IF NOT EXISTS idx_course_comments_active
  ON public.course_comments (lesson_id, created_at)
  WHERE deleted_at IS NULL AND is_hidden = false;

-- Trigger: verifikasi bahwa course_id konsisten dengan lesson_id.course_id
CREATE OR REPLACE FUNCTION public.verify_comment_course_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  expected_course_id text;
BEGIN
  SELECT course_id INTO expected_course_id
  FROM public.course_lessons
  WHERE id = NEW.lesson_id;

  IF expected_course_id IS NULL THEN
    RAISE EXCEPTION 'lesson_id % tidak ditemukan', NEW.lesson_id;
  END IF;

  IF NEW.course_id != expected_course_id THEN
    RAISE EXCEPTION 'course_id % tidak cocok dengan lesson %.course_id (%)',
      NEW.course_id, NEW.lesson_id, expected_course_id;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_verify_comment_course_id'
      AND tgrelid = 'public.course_comments'::regclass
  ) THEN
    CREATE TRIGGER trg_verify_comment_course_id
      BEFORE INSERT ON public.course_comments
      FOR EACH ROW EXECUTE FUNCTION public.verify_comment_course_id();
  END IF;
END;
$$;

-- RLS
ALTER TABLE public.course_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_comments_public_read" ON public.course_comments;
CREATE POLICY "course_comments_public_read"
  ON public.course_comments FOR SELECT
  USING (deleted_at IS NULL AND is_hidden = false);

DROP POLICY IF EXISTS "course_comments_authenticated_insert" ON public.course_comments;
CREATE POLICY "course_comments_authenticated_insert"
  ON public.course_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "course_comments_author_update" ON public.course_comments;
CREATE POLICY "course_comments_author_update"
  ON public.course_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "course_comments_author_delete" ON public.course_comments;
CREATE POLICY "course_comments_author_delete"
  ON public.course_comments FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "course_comments_admin_all" ON public.course_comments;
CREATE POLICY "course_comments_admin_all"
  ON public.course_comments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_course_comments_updated_at'
      AND tgrelid = 'public.course_comments'::regclass
  ) THEN
    CREATE TRIGGER set_course_comments_updated_at
      BEFORE UPDATE ON public.course_comments
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END;
$$;


-- ── 6. course_ratings ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_ratings (
  course_id  text      NOT NULL REFERENCES public.learning_courses(id) ON DELETE CASCADE,
  user_id    uuid      NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating     smallint  NOT NULL,
  review     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (course_id, user_id),

  CONSTRAINT course_ratings_rating_check CHECK (rating BETWEEN 1 AND 5)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_ratings_course_id
  ON public.course_ratings (course_id);

CREATE INDEX IF NOT EXISTS idx_course_ratings_user_id
  ON public.course_ratings (user_id);

-- RLS
ALTER TABLE public.course_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_ratings_public_read" ON public.course_ratings;
CREATE POLICY "course_ratings_public_read"
  ON public.course_ratings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "course_ratings_authenticated_upsert" ON public.course_ratings;
CREATE POLICY "course_ratings_authenticated_upsert"
  ON public.course_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "course_ratings_author_update" ON public.course_ratings;
CREATE POLICY "course_ratings_author_update"
  ON public.course_ratings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "course_ratings_author_delete" ON public.course_ratings;
CREATE POLICY "course_ratings_author_delete"
  ON public.course_ratings FOR DELETE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "course_ratings_admin_all" ON public.course_ratings;
CREATE POLICY "course_ratings_admin_all"
  ON public.course_ratings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_course_ratings_updated_at'
      AND tgrelid = 'public.course_ratings'::regclass
  ) THEN
    CREATE TRIGGER set_course_ratings_updated_at
      BEFORE UPDATE ON public.course_ratings
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END;
$$;
