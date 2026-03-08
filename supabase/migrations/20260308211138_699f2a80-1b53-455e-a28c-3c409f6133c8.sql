
-- Add new columns to clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS state text;

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text,
  entity_type text,
  entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all logs"
ON public.activity_logs FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert logs"
ON public.activity_logs FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Function to get super admin users with email
CREATE OR REPLACE FUNCTION public.get_super_admin_users()
RETURNS TABLE(user_id uuid, email text, full_name text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sa.user_id, au.email::text, p.full_name, sa.created_at
  FROM super_admins sa
  JOIN auth.users au ON au.id = sa.user_id
  LEFT JOIN profiles p ON p.id = sa.user_id
$$;
