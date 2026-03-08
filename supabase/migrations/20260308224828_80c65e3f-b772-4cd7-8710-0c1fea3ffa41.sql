
-- Positions (Cargos) table
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view positions" ON public.positions FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert positions" ON public.positions FOR INSERT WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update positions" ON public.positions FOR UPDATE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete positions" ON public.positions FOR DELETE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all positions" ON public.positions FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert positions" ON public.positions FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update positions" ON public.positions FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete positions" ON public.positions FOR DELETE USING (is_super_admin(auth.uid()));

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add fields to doctors table
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS hire_date date;

-- Commission rules (per-procedure overrides)
CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  procedure_id uuid REFERENCES public.procedures(id) ON DELETE CASCADE,
  percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, doctor_id, procedure_id)
);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view commission rules" ON public.commission_rules FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert commission rules" ON public.commission_rules FOR INSERT WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update commission rules" ON public.commission_rules FOR UPDATE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete commission rules" ON public.commission_rules FOR DELETE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all commission rules" ON public.commission_rules FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert commission rules" ON public.commission_rules FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update commission rules" ON public.commission_rules FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete commission rules" ON public.commission_rules FOR DELETE USING (is_super_admin(auth.uid()));

CREATE TRIGGER update_commission_rules_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
