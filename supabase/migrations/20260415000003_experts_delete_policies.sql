-- Add DELETE RLS policies for experts table.
-- Without these policies, hard delete in admin UI fails with:
-- new row violates row-level security policy for table "experts"

ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "experts_delete_admin" ON public.experts;
CREATE POLICY "experts_delete_admin"
ON public.experts
FOR DELETE
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "experts_delete_own" ON public.experts;
CREATE POLICY "experts_delete_own"
ON public.experts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
