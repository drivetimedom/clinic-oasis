
-- Add super admin write policies for patients
CREATE POLICY "Super admins can insert patients" ON public.patients FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update patients" ON public.patients FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete patients" ON public.patients FOR DELETE USING (public.is_super_admin(auth.uid()));

-- Add super admin write policies for doctors
CREATE POLICY "Super admins can insert doctors" ON public.doctors FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update doctors" ON public.doctors FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete doctors" ON public.doctors FOR DELETE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can view all doctors" ON public.doctors FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Add super admin write policies for appointments
CREATE POLICY "Super admins can insert appointments" ON public.appointments FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update appointments" ON public.appointments FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete appointments" ON public.appointments FOR DELETE USING (public.is_super_admin(auth.uid()));

-- Add super admin write policies for availability_slots
CREATE POLICY "Super admins can insert availability" ON public.availability_slots FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update availability" ON public.availability_slots FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete availability" ON public.availability_slots FOR DELETE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can view all availability" ON public.availability_slots FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Add super admin write policies for receivables
CREATE POLICY "Super admins can insert receivables" ON public.receivables FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update receivables" ON public.receivables FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete receivables" ON public.receivables FOR DELETE USING (public.is_super_admin(auth.uid()));

-- Add super admin write policies for payables
CREATE POLICY "Super admins can insert payables" ON public.payables FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update payables" ON public.payables FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete payables" ON public.payables FOR DELETE USING (public.is_super_admin(auth.uid()));

-- Add super admin write policies for medical records tables
CREATE POLICY "Super admins can insert assessments" ON public.facial_assessments FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update assessments" ON public.facial_assessments FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete assessments" ON public.facial_assessments FOR DELETE USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert patient procedures" ON public.patient_procedures FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update patient procedures" ON public.patient_procedures FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete patient procedures" ON public.patient_procedures FOR DELETE USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert evolutions" ON public.patient_evolutions FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update evolutions" ON public.patient_evolutions FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete evolutions" ON public.patient_evolutions FOR DELETE USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert photos" ON public.clinical_photos FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update photos" ON public.clinical_photos FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete photos" ON public.clinical_photos FOR DELETE USING (public.is_super_admin(auth.uid()));
