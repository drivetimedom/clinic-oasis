
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read platform assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'platform-assets');

CREATE POLICY "Super admins can upload platform assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'platform-assets' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update platform assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'platform-assets' AND public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete platform assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'platform-assets' AND public.is_super_admin(auth.uid()));
