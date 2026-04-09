ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS intro_heading text,
  ADD COLUMN IF NOT EXISTS intro_body text;
