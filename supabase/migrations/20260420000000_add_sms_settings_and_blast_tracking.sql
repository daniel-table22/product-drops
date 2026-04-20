-- Global settings table (single row enforced by boolean PK)
CREATE TABLE system_settings (
  id boolean PRIMARY KEY DEFAULT true,
  CONSTRAINT single_row CHECK (id = true),
  sms_test_mode boolean NOT NULL DEFAULT true
);
INSERT INTO system_settings DEFAULT VALUES;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read settings"
  ON system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update settings"
  ON system_settings FOR UPDATE TO authenticated USING (true);

-- Track whether scheduled blasts have been sent (prevents duplicates)
ALTER TABLE drops
  ADD COLUMN announced_at timestamptz,
  ADD COLUMN reminded_at timestamptz;
