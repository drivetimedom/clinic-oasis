
-- Add commission_percentage to doctors table
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS commission_percentage numeric DEFAULT 0;

-- Billings table
CREATE TABLE public.billings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  procedure_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE SET NULL,
  billing_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view billings" ON public.billings FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert billings" ON public.billings FOR INSERT WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update billings" ON public.billings FOR UPDATE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete billings" ON public.billings FOR DELETE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all billings" ON public.billings FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert billings" ON public.billings FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update billings" ON public.billings FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete billings" ON public.billings FOR DELETE USING (is_super_admin(auth.uid()));

-- Payments table
CREATE TABLE public.billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  billing_id uuid NOT NULL REFERENCES public.billings(id) ON DELETE CASCADE,
  payment_method text NOT NULL DEFAULT 'pix',
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view payments" ON public.billing_payments FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert payments" ON public.billing_payments FOR INSERT WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update payments" ON public.billing_payments FOR UPDATE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete payments" ON public.billing_payments FOR DELETE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all payments" ON public.billing_payments FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert payments" ON public.billing_payments FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update payments" ON public.billing_payments FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete payments" ON public.billing_payments FOR DELETE USING (is_super_admin(auth.uid()));

-- Commissions table
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  billing_id uuid REFERENCES public.billings(id) ON DELETE SET NULL,
  procedure_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL,
  procedure_amount numeric NOT NULL DEFAULT 0,
  commission_percentage numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  billing_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view commissions" ON public.commissions FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert commissions" ON public.commissions FOR INSERT WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update commissions" ON public.commissions FOR UPDATE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete commissions" ON public.commissions FOR DELETE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all commissions" ON public.commissions FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert commissions" ON public.commissions FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update commissions" ON public.commissions FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete commissions" ON public.commissions FOR DELETE USING (is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_billings_updated_at BEFORE UPDATE ON public.billings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
