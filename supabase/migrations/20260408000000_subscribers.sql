CREATE TABLE subscribers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  phone      TEXT NOT NULL,
  opted_in   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_id, phone)
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Partners can read their own subscribers
CREATE POLICY "subscribers: select own" ON subscribers
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM partners WHERE user_id = auth.uid()
    )
  );

-- Public insert for opt-in form (anon users)
CREATE POLICY "subscribers: insert public" ON subscribers
  FOR INSERT WITH CHECK (true);

-- Public update for opt-in confirmation (anon users, Twilio webhook)
CREATE POLICY "subscribers: update public" ON subscribers
  FOR UPDATE USING (true);

-- Public delete for STOP opt-out
CREATE POLICY "subscribers: delete public" ON subscribers
  FOR DELETE USING (true);
