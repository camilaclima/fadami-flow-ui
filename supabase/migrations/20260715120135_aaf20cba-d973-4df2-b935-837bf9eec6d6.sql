
DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;

CREATE POLICY "Authenticated read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments');

CREATE POLICY "Authenticated upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments' AND owner = auth.uid());

CREATE POLICY "Owner or admin update attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'attachments' AND (owner = auth.uid() OR public.has_permission(auth.uid(), 'users')))
WITH CHECK (bucket_id = 'attachments' AND (owner = auth.uid() OR public.has_permission(auth.uid(), 'users')));

CREATE POLICY "Owner or admin delete attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'attachments' AND (owner = auth.uid() OR public.has_permission(auth.uid(), 'users')));
