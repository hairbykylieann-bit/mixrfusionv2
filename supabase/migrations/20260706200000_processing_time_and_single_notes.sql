-- ============================================================================
-- PROCESSING TIME + SINGLE NOTES HOME — 2026-07-06
--
-- Decision (Kylie): there is ONE place for notes — the head sheet (session
-- canvas). Processing time is its own field, not a note.
--
-- History: the bowl "notes" column was actually storing processing-time
-- minutes (digits only), and session notes were those digits joined together.
-- ============================================================================

-- 1. Real column for processing time
ALTER TABLE public.session_bowls
  ADD COLUMN IF NOT EXISTS processing_time_minutes integer;

-- 2. Backfill: digit-only bowl notes WERE processing times — move them over
UPDATE public.session_bowls
SET processing_time_minutes = notes::integer,
    notes = NULL
WHERE notes ~ '^[0-9]{1,3}$';

-- 3. Session notes that were just joined processing times are meaningless —
--    clear them so real head-sheet notes can take the field over.
UPDATE public.color_sessions
SET notes = NULL
WHERE notes ~ '^[0-9]{1,3}(\n---\n[0-9]{1,3})*$';

-- 4. Sessions that have head-sheet canvas notes: surface them as the session
--    notes (the app now writes canvas notes here on every save).
UPDATE public.color_sessions
SET notes = canvas_data->>'notes'
WHERE canvas_data ? 'notes'
  AND COALESCE(TRIM(canvas_data->>'notes'), '') <> ''
  AND notes IS NULL;
