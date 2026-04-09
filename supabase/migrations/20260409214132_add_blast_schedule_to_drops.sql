ALTER TABLE drops
  ADD COLUMN IF NOT EXISTS announce_days_before integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS reminder_days_before integer;
