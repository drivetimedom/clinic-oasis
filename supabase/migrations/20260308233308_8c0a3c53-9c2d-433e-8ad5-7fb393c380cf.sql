
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage platform settings
CREATE POLICY "Super admins can manage platform settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Anyone can read platform settings (for login page branding)
CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (true);

-- Insert default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('login_title', 'Hof Circle Gestão'),
  ('login_subtitle', 'Sistema de gestão para clínicas estéticas'),
  ('logo_text', 'HC'),
  ('primary_color', '#4ade80');
