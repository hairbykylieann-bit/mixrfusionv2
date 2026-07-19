-- Persist the charge shown to the stylist at save time so reports
-- never need to recompute it and the number always matches what the
-- client was actually quoted.
ALTER TABLE color_sessions
  ADD COLUMN IF NOT EXISTS charged_amount NUMERIC(10,2);
