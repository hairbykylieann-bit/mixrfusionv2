ALTER TABLE public.session_bowls
  ADD COLUMN IF NOT EXISTS parent_bowl_id uuid REFERENCES public.session_bowls(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS remix_index integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_session_bowls_parent_bowl_id
  ON public.session_bowls(parent_bowl_id);