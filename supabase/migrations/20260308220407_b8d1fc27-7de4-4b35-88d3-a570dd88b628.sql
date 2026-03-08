
-- Add materials field to protocols
ALTER TABLE public.protocols ADD COLUMN materials TEXT;

-- Add procedure_id to appointments (optional link)
ALTER TABLE public.appointments ADD COLUMN procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL;
