
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- PATIENTS TABLE
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  birth_date DATE,
  gender TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own patients" ON public.patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create patients" ON public.patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own patients" ON public.patients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own patients" ON public.patients FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RECEIVABLES TABLE (Contas a Receber)
CREATE TABLE public.receivables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  category TEXT NOT NULL DEFAULT 'treatment',
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own receivables" ON public.receivables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create receivables" ON public.receivables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own receivables" ON public.receivables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own receivables" ON public.receivables FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_receivables_updated_at BEFORE UPDATE ON public.receivables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_receivables_due_date ON public.receivables(due_date);
CREATE INDEX idx_receivables_status ON public.receivables(status);

-- PAYABLES TABLE (Contas a Pagar)
CREATE TABLE public.payables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  category TEXT NOT NULL DEFAULT 'general',
  supplier TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_type TEXT CHECK (recurrence_type IN ('monthly', 'quarterly', 'semiannual', 'annual')),
  recurrence_end_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payables" ON public.payables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create payables" ON public.payables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payables" ON public.payables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payables" ON public.payables FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_payables_updated_at BEFORE UPDATE ON public.payables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_payables_due_date ON public.payables(due_date);
CREATE INDEX idx_payables_status ON public.payables(status);
CREATE INDEX idx_payables_recurring ON public.payables(is_recurring);
