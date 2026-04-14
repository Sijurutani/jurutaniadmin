-- Add DELETE RLS policies for instructors table.
-- Without these policies, hard delete in admin UI fails with:
-- new row violates row-level security policy for table "instructors"

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instructors_delete_admin" ON public.instructors;
CREATE POLICY "instructors_delete_admin"
ON public.instructors
FOR DELETE
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "instructors_delete_own" ON public.instructors;
CREATE POLICY "instructors_delete_own"
ON public.instructors
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
