
-- Consent Templates table
CREATE TABLE public.consent_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  title text NOT NULL,
  procedure_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL,
  content text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view consent templates" ON public.consent_templates FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert consent templates" ON public.consent_templates FOR INSERT WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update consent templates" ON public.consent_templates FOR UPDATE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete consent templates" ON public.consent_templates FOR DELETE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all consent templates" ON public.consent_templates FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert consent templates" ON public.consent_templates FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update consent templates" ON public.consent_templates FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete consent templates" ON public.consent_templates FOR DELETE USING (is_super_admin(auth.uid()));

-- Consent Requests table
CREATE TABLE public.consent_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.consent_templates(id) ON DELETE CASCADE,
  procedure_id uuid REFERENCES public.procedures(id) ON DELETE SET NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz NOT NULL DEFAULT now(),
  signed_at timestamptz,
  patient_name text,
  signature_data text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view consent requests" ON public.consent_requests FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can insert consent requests" ON public.consent_requests FOR INSERT WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update consent requests" ON public.consent_requests FOR UPDATE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete consent requests" ON public.consent_requests FOR DELETE USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Super admins can view all consent requests" ON public.consent_requests FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can insert consent requests" ON public.consent_requests FOR INSERT WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update consent requests" ON public.consent_requests FOR UPDATE USING (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete consent requests" ON public.consent_requests FOR DELETE USING (is_super_admin(auth.uid()));

-- Triggers
CREATE TRIGGER update_consent_templates_updated_at BEFORE UPDATE ON public.consent_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consent_requests_updated_at BEFORE UPDATE ON public.consent_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Public RPC functions for patient signing (no auth required)
CREATE OR REPLACE FUNCTION public.get_consent_by_token(_token uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', cr.id,
    'status', cr.status,
    'patient_name', p.name,
    'clinic_name', c.name,
    'clinic_logo', c.logo_url,
    'template_title', ct.title,
    'template_content', ct.content,
    'procedure_name', proc.name,
    'sent_at', cr.sent_at
  ) INTO result
  FROM consent_requests cr
  JOIN consent_templates ct ON ct.id = cr.template_id
  JOIN patients p ON p.id = cr.patient_id
  JOIN clinics c ON c.id = cr.clinic_id
  LEFT JOIN procedures proc ON proc.id = cr.procedure_id
  WHERE cr.token = _token;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.sign_consent(_token uuid, _patient_name text, _signature_data text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE consent_requests
  SET status = 'signed',
      signed_at = now(),
      patient_name = _patient_name,
      signature_data = _signature_data
  WHERE token = _token AND status = 'pending';

  RETURN FOUND;
END;
$$;

-- Grant anon access to these functions
GRANT EXECUTE ON FUNCTION public.get_consent_by_token TO anon;
GRANT EXECUTE ON FUNCTION public.sign_consent TO anon;
