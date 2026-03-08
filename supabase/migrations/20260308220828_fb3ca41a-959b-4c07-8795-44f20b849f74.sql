
-- Stock Products
CREATE TABLE public.stock_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  description TEXT,
  quantity_in_stock NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'unidade',
  min_stock NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stock Movements
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.stock_products(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'entry', 'exit', 'adjustment'
  quantity NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responsible TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stock Batches
CREATE TABLE public.stock_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.stock_products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_batches ENABLE ROW LEVEL SECURITY;

-- RLS stock_products
CREATE POLICY "Clinic members can view stock products" ON public.stock_products FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Admins/managers can insert stock products" ON public.stock_products FOR INSERT WITH CHECK (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can update stock products" ON public.stock_products FOR UPDATE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can delete stock products" ON public.stock_products FOR DELETE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Super admins can view all stock products" ON public.stock_products FOR SELECT USING (is_super_admin(auth.uid()));

-- RLS stock_movements
CREATE POLICY "Clinic members can view stock movements" ON public.stock_movements FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Admins/managers can insert stock movements" ON public.stock_movements FOR INSERT WITH CHECK (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can update stock movements" ON public.stock_movements FOR UPDATE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can delete stock movements" ON public.stock_movements FOR DELETE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Super admins can view all stock movements" ON public.stock_movements FOR SELECT USING (is_super_admin(auth.uid()));

-- RLS stock_batches
CREATE POLICY "Clinic members can view stock batches" ON public.stock_batches FOR SELECT USING (is_clinic_member(auth.uid(), clinic_id));
CREATE POLICY "Admins/managers can insert stock batches" ON public.stock_batches FOR INSERT WITH CHECK (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can update stock batches" ON public.stock_batches FOR UPDATE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Admins/managers can delete stock batches" ON public.stock_batches FOR DELETE USING (has_clinic_role(auth.uid(), clinic_id, ARRAY['admin', 'manager']));
CREATE POLICY "Super admins can view all stock batches" ON public.stock_batches FOR SELECT USING (is_super_admin(auth.uid()));

-- Function to auto-update stock quantity on movement insert
CREATE OR REPLACE FUNCTION public.update_stock_on_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.type = 'entry' THEN
    UPDATE stock_products SET quantity_in_stock = quantity_in_stock + NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.type = 'exit' THEN
    UPDATE stock_products SET quantity_in_stock = quantity_in_stock - NEW.quantity WHERE id = NEW.product_id;
  ELSIF NEW.type = 'adjustment' THEN
    UPDATE stock_products SET quantity_in_stock = NEW.quantity WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_stock_on_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_on_movement();
