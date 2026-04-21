CREATE TABLE partner_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  email       TEXT,
  name        TEXT,
  phone       TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_contacts_partner_email
  ON partner_contacts(partner_id, email) WHERE email IS NOT NULL;

ALTER TABLE partner_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_contacts: select own" ON partner_contacts
  FOR SELECT USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_contacts: insert own" ON partner_contacts
  FOR INSERT WITH CHECK (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

CREATE POLICY "partner_contacts: delete own" ON partner_contacts
  FOR DELETE USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- from_csv flips to true when a subscriber's email matches a partner_contacts row
-- (match happens at order time, since that's when we first get the email).
ALTER TABLE subscribers ADD COLUMN from_csv BOOLEAN NOT NULL DEFAULT false;
