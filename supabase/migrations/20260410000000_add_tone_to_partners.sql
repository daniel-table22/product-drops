ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS tone jsonb,
  ADD COLUMN IF NOT EXISTS tone_researched_at timestamptz;
