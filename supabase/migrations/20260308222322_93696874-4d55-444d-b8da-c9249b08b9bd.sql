
-- Facial assessments table
CREATE TABLE public.facial_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.doctors(id),
  skin_type text,
  flaccidity_level text,
  wrinkles text,
  facial_asymmetry text,
  lip_volume text,
  malar_volume text,
  mandibular_volume text,
  clinical_notes text,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.facial_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view assessments" ON public.facial_assessments FOR SELECT USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert assessments" ON public.facial_assessments FOR INSERT WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update assessments" ON public.facial_assessments FOR UPDATE USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete assessments" ON public.facial_assessments FOR DELETE USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all assessments" ON public.facial_assessments FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Patient procedures table
CREATE TABLE public.patient_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  procedure_id uuid REFERENCES public.procedures(id),
  protocol_id uuid REFERENCES public.protocols(id),
  doctor_id uuid REFERENCES public.doctors(id),
  procedure_date date NOT NULL DEFAULT CURRENT_DATE,
  area_treated text,
  quantity_applied text,
  clinical_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view patient procedures" ON public.patient_procedures FOR SELECT USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert patient procedures" ON public.patient_procedures FOR INSERT WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update patient procedures" ON public.patient_procedures FOR UPDATE USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete patient procedures" ON public.patient_procedures FOR DELETE USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all patient procedures" ON public.patient_procedures FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Patient evolutions table
CREATE TABLE public.patient_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.doctors(id),
  evolution_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_evolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view evolutions" ON public.patient_evolutions FOR SELECT USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert evolutions" ON public.patient_evolutions FOR INSERT WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update evolutions" ON public.patient_evolutions FOR UPDATE USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete evolutions" ON public.patient_evolutions FOR DELETE USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all evolutions" ON public.patient_evolutions FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Clinical photos table
CREATE TABLE public.clinical_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL DEFAULT 'followup',
  procedure_id uuid REFERENCES public.procedures(id),
  observation text,
  photo_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view photos" ON public.clinical_photos FOR SELECT USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert photos" ON public.clinical_photos FOR INSERT WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update photos" ON public.clinical_photos FOR UPDATE USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete photos" ON public.clinical_photos FOR DELETE USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all photos" ON public.clinical_photos FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Storage bucket for clinical photos
INSERT INTO storage.buckets (id, name, public) VALUES ('clinical-photos', 'clinical-photos', false);

CREATE POLICY "Authenticated users can upload clinical photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'clinical-photos');
CREATE POLICY "Authenticated users can view clinical photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'clinical-photos');
CREATE POLICY "Authenticated users can delete clinical photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'clinical-photos');
