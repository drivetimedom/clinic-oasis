
-- Patient interactions table for CRM relationship history
CREATE TABLE public.patient_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  interaction_type text NOT NULL DEFAULT 'contact',
  description text NOT NULL,
  interaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view interactions" ON public.patient_interactions FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert interactions" ON public.patient_interactions FOR INSERT WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update interactions" ON public.patient_interactions FOR UPDATE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete interactions" ON public.patient_interactions FOR DELETE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all interactions" ON public.patient_interactions FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert interactions" ON public.patient_interactions FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update interactions" ON public.patient_interactions FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete interactions" ON public.patient_interactions FOR DELETE USING (is_super_admin(auth.uid()));

-- Add recommended return days to procedures table
ALTER TABLE public.procedures ADD COLUMN IF NOT EXISTS return_days integer DEFAULT NULL;
