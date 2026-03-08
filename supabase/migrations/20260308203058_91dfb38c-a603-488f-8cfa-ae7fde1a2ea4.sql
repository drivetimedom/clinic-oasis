
-- Multi-tenant architecture migration

-- 1. Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'reception', 'financial');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- 3. Clinics table
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  phone text,
  email text,
  address text,
  logo_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- 4. Clinic members
CREATE TABLE public.clinic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'reception',
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(clinic_id, user_id)
);
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

-- 5. Security definer functions
CREATE OR REPLACE FUNCTION public.is_clinic_member(_user_id uuid, _clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM clinic_members WHERE user_id = _user_id AND clinic_id = _clinic_id) $$;

CREATE OR REPLACE FUNCTION public.get_clinic_role(_user_id uuid, _clinic_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role::text FROM clinic_members WHERE user_id = _user_id AND clinic_id = _clinic_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.has_clinic_role(_user_id uuid, _clinic_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM clinic_members WHERE user_id = _user_id AND clinic_id = _clinic_id AND role::text = ANY(_roles)) $$;

-- 6. Function to create clinic with admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_clinic_with_admin(_name text, _phone text DEFAULT NULL, _email text DEFAULT NULL, _address text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _clinic_id uuid;
BEGIN
  INSERT INTO clinics (name, phone, email, address) VALUES (_name, _phone, _email, _address) RETURNING id INTO _clinic_id;
  INSERT INTO clinic_members (clinic_id, user_id, role) VALUES (_clinic_id, auth.uid(), 'admin');
  RETURN _clinic_id;
END;
$$;

-- 7. Clinics RLS
CREATE POLICY "Members can view clinic" ON public.clinics FOR SELECT TO authenticated USING (public.is_clinic_member(auth.uid(), id));
CREATE POLICY "Admins can update clinic" ON public.clinics FOR UPDATE TO authenticated USING (public.has_clinic_role(auth.uid(), id, ARRAY['admin']));
CREATE POLICY "Admins can delete clinic" ON public.clinics FOR DELETE TO authenticated USING (public.has_clinic_role(auth.uid(), id, ARRAY['admin']));

-- 8. Clinic members RLS
CREATE POLICY "Members can view clinic members" ON public.clinic_members FOR SELECT TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Admins can insert members" ON public.clinic_members FOR INSERT TO authenticated WITH CHECK (public.has_clinic_role(auth.uid(), clinic_id, ARRAY['admin']));
CREATE POLICY "Admins can update members" ON public.clinic_members FOR UPDATE TO authenticated USING (public.has_clinic_role(auth.uid(), clinic_id, ARRAY['admin']));
CREATE POLICY "Admins can delete members" ON public.clinic_members FOR DELETE TO authenticated USING (public.has_clinic_role(auth.uid(), clinic_id, ARRAY['admin']));

-- 9. Add clinic_id to existing tables
ALTER TABLE public.patients ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.doctors ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.availability_slots ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.receivables ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;
ALTER TABLE public.payables ADD COLUMN clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE;

-- 10. Drop old RLS policies
DO $$
DECLARE
  _tables text[] := ARRAY['patients', 'doctors', 'appointments', 'availability_slots', 'receivables', 'payables'];
  _tbl text;
  _pol record;
BEGIN
  FOREACH _tbl IN ARRAY _tables LOOP
    FOR _pol IN SELECT policyname FROM pg_policies WHERE tablename = _tbl AND schemaname = 'public' LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', _pol.policyname, _tbl);
    END LOOP;
  END LOOP;
END$$;

-- 11. New clinic-based RLS
CREATE POLICY "Clinic members can view patients" ON public.patients FOR SELECT TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update patients" ON public.patients FOR UPDATE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete patients" ON public.patients FOR DELETE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can view doctors" ON public.doctors FOR SELECT TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create doctors" ON public.doctors FOR INSERT TO authenticated WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update doctors" ON public.doctors FOR UPDATE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete doctors" ON public.doctors FOR DELETE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can view appointments" ON public.appointments FOR SELECT TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update appointments" ON public.appointments FOR UPDATE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete appointments" ON public.appointments FOR DELETE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can view availability" ON public.availability_slots FOR SELECT TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create availability" ON public.availability_slots FOR INSERT TO authenticated WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update availability" ON public.availability_slots FOR UPDATE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete availability" ON public.availability_slots FOR DELETE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can view receivables" ON public.receivables FOR SELECT TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create receivables" ON public.receivables FOR INSERT TO authenticated WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update receivables" ON public.receivables FOR UPDATE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete receivables" ON public.receivables FOR DELETE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can view payables" ON public.payables FOR SELECT TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create payables" ON public.payables FOR INSERT TO authenticated WITH CHECK (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update payables" ON public.payables FOR UPDATE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete payables" ON public.payables FOR DELETE TO authenticated USING (public.is_clinic_member(auth.uid(), clinic_id));

-- 12. Indexes
CREATE INDEX idx_clinic_members_user_id ON public.clinic_members(user_id);
CREATE INDEX idx_clinic_members_clinic_id ON public.clinic_members(clinic_id);
CREATE INDEX idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX idx_doctors_clinic_id ON public.doctors(clinic_id);
CREATE INDEX idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX idx_availability_slots_clinic_id ON public.availability_slots(clinic_id);
CREATE INDEX idx_receivables_clinic_id ON public.receivables(clinic_id);
CREATE INDEX idx_payables_clinic_id ON public.payables(clinic_id);

-- 13. Updated_at triggers
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_clinics_updated_at BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
