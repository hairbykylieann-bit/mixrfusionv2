-- ============================================================================
-- DEFAULT MEASUREMENT UNIT → GRAMS — 2026-07-07
-- Colorists weigh in grams. The old default of ounces caused amounts typed as
-- grams (e.g. "40") to be read as 40 oz and multiplied ~28× — inflating costs
-- into the thousands. New salons now default to grams.
-- Existing salons are NOT auto-changed (they may have real oz data); they can
-- flip it in Settings → Display Unit.
-- ============================================================================
ALTER TABLE public.salon_settings ALTER COLUMN preferred_display_unit SET DEFAULT 'g';
