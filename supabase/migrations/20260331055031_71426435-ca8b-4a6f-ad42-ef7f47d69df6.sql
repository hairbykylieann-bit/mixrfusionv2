ALTER TABLE public.staff
  ADD COLUMN has_custom_bowl_fee boolean NOT NULL DEFAULT false,
  ADD COLUMN custom_bowl_fee numeric NOT NULL DEFAULT 0;