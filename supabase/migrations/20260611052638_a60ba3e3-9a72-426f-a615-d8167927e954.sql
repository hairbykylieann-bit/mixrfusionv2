ALTER TABLE public.color_sessions
  ADD COLUMN IF NOT EXISTS canvas_data jsonb,
  ADD COLUMN IF NOT EXISTS canvas_preview_url text;