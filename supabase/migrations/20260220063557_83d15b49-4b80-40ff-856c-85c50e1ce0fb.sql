ALTER TABLE public.salon_settings
  ADD COLUMN backbar_multiplier numeric NOT NULL DEFAULT 4,
  ADD COLUMN commission_basis text NOT NULL DEFAULT 'labor_only',
  ADD COLUMN retail_markup_percent numeric NOT NULL DEFAULT 100;