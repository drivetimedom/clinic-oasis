
-- Create procedure_categories table
CREATE TABLE public.procedure_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create procedures table
CREATE TABLE public.procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.procedure_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  suggested_price NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create protocols table
CREATE TABLE public.protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  steps TEXT,
  clinical_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.procedure_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;

-- RLS for procedure_categories
CREATE POLICY "Clinic members can view categories" ON public.procedure_categories FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Admins/managers can insert categories" ON public.procedure_categories FOR INSERT WITH CHECK (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can update categories" ON public.procedure_categories FOR UPDATE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can delete categories" ON public.procedure_categories FOR DELETE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Super admins can view all categories" ON public.procedure_categories FOR SELECT USING (is_super_admin(auth.uid()));

-- RLS for procedures
CREATE POLICY "Clinic members can view procedures" ON public.procedures FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Admins/managers can insert procedures" ON public.procedures FOR INSERT WITH CHECK (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can update procedures" ON public.procedures FOR UPDATE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can delete procedures" ON public.procedures FOR DELETE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Super admins can view all procedures" ON public.procedures FOR SELECT USING (is_super_admin(auth.uid()));

-- RLS for protocols
CREATE POLICY "Clinic members can view protocols" ON public.protocols FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Admins/managers can insert protocols" ON public.protocols FOR INSERT WITH CHECK (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can update protocols" ON public.protocols FOR UPDATE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can delete protocols" ON public.protocols FOR DELETE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Super admins can view all protocols" ON public.protocols FOR SELECT USING (is_super_admin(auth.uid()));
