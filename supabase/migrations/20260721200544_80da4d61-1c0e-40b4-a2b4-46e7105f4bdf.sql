DROP POLICY IF EXISTS "Authenticated can insert absences" ON public.dev_absences;
CREATE POLICY "Users or GPs insert absences"
ON public.dev_absences
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    user_id = auth.uid()
    OR public.has_permission(auth.uid(), 'painel_gp')
  )
);