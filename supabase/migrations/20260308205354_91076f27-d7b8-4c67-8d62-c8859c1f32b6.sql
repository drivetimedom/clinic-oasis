
-- Add 'profissional' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'profissional';

-- Add status to clinics
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create super_admins table
CREATE TABLE IF NOT EXISTS public.super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Security definer function to check super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM super_admins WHERE user_id = _user_id)
$$;

-- Super admins can read super_admins table
CREATE POLICY "Super admins can view" ON public.super_admins
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can read ALL clinics (regardless of membership)
CREATE POLICY "Super admins can view all clinics" ON public.clinics
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can insert clinics
CREATE POLICY "Super admins can insert clinics" ON public.clinics
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can update all clinics
CREATE POLICY "Super admins can update all clinics" ON public.clinics
  FOR UPDATE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can delete all clinics
CREATE POLICY "Super admins can delete all clinics" ON public.clinics
  FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can read all clinic_members
CREATE POLICY "Super admins can view all members" ON public.clinic_members
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can insert clinic_members
CREATE POLICY "Super admins can insert members" ON public.clinic_members
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can update clinic_members
CREATE POLICY "Super admins can update all members" ON public.clinic_members
  FOR UPDATE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can delete clinic_members
CREATE POLICY "Super admins can delete all members" ON public.clinic_members
  FOR DELETE TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can read all profiles
CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can read all patients (for metrics)
CREATE POLICY "Super admins can view all patients" ON public.patients
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can read all appointments (for metrics)
CREATE POLICY "Super admins can view all appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can read all receivables (for metrics)
CREATE POLICY "Super admins can view all receivables" ON public.receivables
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can read all payables (for metrics)
CREATE POLICY "Super admins can view all payables" ON public.payables
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));
