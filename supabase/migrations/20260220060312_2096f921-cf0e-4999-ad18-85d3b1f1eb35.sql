ALTER TABLE public.color_sessions 
ADD COLUMN service_id uuid REFERENCES public.service_menu(id);