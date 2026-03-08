
-- Drop all restrictive policies and recreate as permissive

-- clinics
DROP POLICY IF EXISTS "Members can view clinic" ON clinics;
DROP POLICY IF EXISTS "Admins can update clinic" ON clinics;
DROP POLICY IF EXISTS "Admins can delete clinic" ON clinics;

CREATE POLICY "Members can view clinic" ON clinics FOR SELECT TO authenticated USING (is_clinic_member(auth.uid(), id));
CREATE POLICY "Admins can update clinic" ON clinics FOR UPDATE TO authenticated USING (has_clinic_role(auth.uid(), id, ARRAY['admin'::text]));
CREATE POLICY "Admins can delete clinic" ON clinics FOR DELETE TO authenticated USING (has_clinic_role(auth.uid(), id, ARRAY['admin'::text]));

-- clinic_members
DROP POLICY IF EXISTS "Members can view clinic members" ON clinic_members;
DROP POLICY IF EXISTS "Admins can insert members" ON clinic_members;
DROP POLICY IF EXISTS "Admins can update members" ON clinic_members;
DROP POLICY IF EXISTS "Admins can delete members" ON clinic_members;

CREATE POLICY "Members can view clinic members" ON clinic_members FOR SELECT TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Admins can insert members" ON clinic_members FOR INSERT TO authenticated WITH CHECK (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin'::text]));
CREATE POLICY "Admins can update members" ON clinic_members FOR UPDATE TO authenticated USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin'::text]));
CREATE POLICY "Admins can delete members" ON clinic_members FOR DELETE TO authenticated USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin'::text]));

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- doctors
DROP POLICY IF EXISTS "Clinic members can view doctors" ON doctors;
DROP POLICY IF EXISTS "Clinic members can create doctors" ON doctors;
DROP POLICY IF EXISTS "Clinic members can update doctors" ON doctors;
DROP POLICY IF EXISTS "Clinic members can delete doctors" ON doctors;

CREATE POLICY "Clinic members can view doctors" ON doctors FOR SELECT TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create doctors" ON doctors FOR INSERT TO authenticated WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update doctors" ON doctors FOR UPDATE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete doctors" ON doctors FOR DELETE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));

-- patients
DROP POLICY IF EXISTS "Clinic members can view patients" ON patients;
DROP POLICY IF EXISTS "Clinic members can create patients" ON patients;
DROP POLICY IF EXISTS "Clinic members can update patients" ON patients;
DROP POLICY IF EXISTS "Clinic members can delete patients" ON patients;

CREATE POLICY "Clinic members can view patients" ON patients FOR SELECT TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create patients" ON patients FOR INSERT TO authenticated WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update patients" ON patients FOR UPDATE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete patients" ON patients FOR DELETE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));

-- appointments
DROP POLICY IF EXISTS "Clinic members can view appointments" ON appointments;
DROP POLICY IF EXISTS "Clinic members can create appointments" ON appointments;
DROP POLICY IF EXISTS "Clinic members can update appointments" ON appointments;
DROP POLICY IF EXISTS "Clinic members can delete appointments" ON appointments;

CREATE POLICY "Clinic members can view appointments" ON appointments FOR SELECT TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create appointments" ON appointments FOR INSERT TO authenticated WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update appointments" ON appointments FOR UPDATE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete appointments" ON appointments FOR DELETE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));

-- availability_slots
DROP POLICY IF EXISTS "Clinic members can view availability" ON availability_slots;
DROP POLICY IF EXISTS "Clinic members can create availability" ON availability_slots;
DROP POLICY IF EXISTS "Clinic members can update availability" ON availability_slots;
DROP POLICY IF EXISTS "Clinic members can delete availability" ON availability_slots;

CREATE POLICY "Clinic members can view availability" ON availability_slots FOR SELECT TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create availability" ON availability_slots FOR INSERT TO authenticated WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update availability" ON availability_slots FOR UPDATE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete availability" ON availability_slots FOR DELETE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));

-- receivables
DROP POLICY IF EXISTS "Clinic members can view receivables" ON receivables;
DROP POLICY IF EXISTS "Clinic members can create receivables" ON receivables;
DROP POLICY IF EXISTS "Clinic members can update receivables" ON receivables;
DROP POLICY IF EXISTS "Clinic members can delete receivables" ON receivables;

CREATE POLICY "Clinic members can view receivables" ON receivables FOR SELECT TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create receivables" ON receivables FOR INSERT TO authenticated WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update receivables" ON receivables FOR UPDATE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete receivables" ON receivables FOR DELETE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));

-- payables
DROP POLICY IF EXISTS "Clinic members can view payables" ON payables;
DROP POLICY IF EXISTS "Clinic members can create payables" ON payables;
DROP POLICY IF EXISTS "Clinic members can update payables" ON payables;
DROP POLICY IF EXISTS "Clinic members can delete payables" ON payables;

CREATE POLICY "Clinic members can view payables" ON payables FOR SELECT TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can create payables" ON payables FOR INSERT TO authenticated WITH CHECK (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can update payables" ON payables FOR UPDATE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Clinic members can delete payables" ON payables FOR DELETE TO authenticated USING (is_clinic_member(auth.uid(), clinic_id));
