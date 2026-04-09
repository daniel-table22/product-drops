-- ============================================================
-- Product Drops — initial schema
-- ============================================================

-- Enums

CREATE TYPE partner_onboarding_state AS ENUM (
  'signed_up',
  'profile_complete',
  'stripe_ready',
  'stripe_action_required'
);

CREATE TYPE drop_state AS ENUM (
  'scheduled',
  'orders_open',
  'orders_closed',
  'pickup_open',
  'pickup_closed',
  'archived'
);

CREATE TYPE order_state AS ENUM (
  'paid',
  'ready',
  'picked_up',
  'no_show'
);

-- ============================================================
-- Partners
-- One row per hospitality business. Linked to a Supabase auth user.
-- ============================================================

CREATE TABLE partners (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  business_name     TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  pickup_address    TEXT NOT NULL,
  logo_url          TEXT,
  hero_url          TEXT,
  stripe_account_id TEXT,
  onboarding_state  partner_onboarding_state NOT NULL DEFAULT 'signed_up',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners: select own" ON partners
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "partners: insert own" ON partners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "partners: update own" ON partners
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- Items
-- Partner's reusable item library. Soft-deleted via archived_at.
-- ============================================================

CREATE TABLE items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id          UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  description         TEXT,
  photo_url           TEXT,
  default_price_cents INTEGER NOT NULL CHECK (default_price_cents >= 0),
  archived_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items: partner manages own" ON items
  FOR ALL USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- ============================================================
-- Drops
-- A time-limited sale. Two independent windows: order + pickup.
-- ============================================================

CREATE TABLE drops (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id               UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  slug                     TEXT NOT NULL,
  description              TEXT,
  order_window_starts_at   TIMESTAMPTZ NOT NULL,
  order_window_ends_at     TIMESTAMPTZ NOT NULL,
  pickup_window_starts_at  TIMESTAMPTZ NOT NULL,
  pickup_window_ends_at    TIMESTAMPTZ NOT NULL,
  state                    drop_state NOT NULL DEFAULT 'scheduled',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at             TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  UNIQUE (partner_id, slug),
  CONSTRAINT order_window_valid CHECK (order_window_ends_at > order_window_starts_at),
  CONSTRAINT pickup_window_valid CHECK (pickup_window_ends_at > pickup_window_starts_at)
);

ALTER TABLE drops ENABLE ROW LEVEL SECURITY;

-- Public can see published, uncancelled drops (storefront)
CREATE POLICY "drops: public read published" ON drops
  FOR SELECT USING (published_at IS NOT NULL AND cancelled_at IS NULL);

-- Partners can see and manage all their own drops (including drafts)
CREATE POLICY "drops: partner manages own" ON drops
  FOR ALL USING (
    partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  );

-- ============================================================
-- Drop items
-- Items attached to a specific drop. Inventory tracked here.
-- available_qty decremented atomically at checkout start.
-- ============================================================

CREATE TABLE drop_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id       UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items(id),
  price_cents   INTEGER NOT NULL CHECK (price_cents >= 0),
  total_qty     INTEGER NOT NULL CHECK (total_qty > 0),
  available_qty INTEGER NOT NULL CHECK (available_qty >= 0),
  UNIQUE (drop_id, item_id)
);

ALTER TABLE drop_items ENABLE ROW LEVEL SECURITY;

-- Public can see drop items for published drops
CREATE POLICY "drop_items: public read for published drop" ON drop_items
  FOR SELECT USING (
    drop_id IN (
      SELECT id FROM drops WHERE published_at IS NOT NULL AND cancelled_at IS NULL
    )
  );

-- Partners manage their own drop items
CREATE POLICY "drop_items: partner manages own" ON drop_items
  FOR ALL USING (
    drop_id IN (
      SELECT d.id FROM drops d
      JOIN partners p ON p.id = d.partner_id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================
-- Pending orders
-- Created at checkout start. Swept once reserved_until passes
-- or once checkout.session.expired fires.
-- ============================================================

CREATE TABLE pending_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id           UUID NOT NULL REFERENCES drops(id),
  customer_email    TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  -- [{drop_item_id, item_name, price_cents, qty}]
  line_items        JSONB NOT NULL,
  reserved_until    TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;

-- No direct anon access. Partners can see pending order counts for their drops.
CREATE POLICY "pending_orders: partner reads own" ON pending_orders
  FOR SELECT USING (
    drop_id IN (
      SELECT d.id FROM drops d
      JOIN partners p ON p.id = d.partner_id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================
-- Orders
-- Promoted from pending_orders on checkout.session.completed.
-- ============================================================

CREATE TABLE orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id                   UUID NOT NULL REFERENCES drops(id),
  customer_name             TEXT NOT NULL,
  customer_email            TEXT NOT NULL,
  customer_phone            TEXT,
  stripe_payment_intent_id  TEXT NOT NULL UNIQUE,
  subtotal_cents            INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  tip_cents                 INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
  total_cents               INTEGER NOT NULL CHECK (total_cents >= 0),
  platform_fee_cents        INTEGER NOT NULL CHECK (platform_fee_cents >= 0),
  state                     order_state NOT NULL DEFAULT 'paid',
  paid_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ready_at                  TIMESTAMPTZ,
  picked_up_at              TIMESTAMPTZ,
  refunded_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Partners can see and update orders for their drops
CREATE POLICY "orders: partner manages own" ON orders
  FOR ALL USING (
    drop_id IN (
      SELECT d.id FROM drops d
      JOIN partners p ON p.id = d.partner_id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================
-- Order items
-- Snapshot of what was purchased. Immutable after creation.
-- ============================================================

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_name   TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  qty         INTEGER NOT NULL CHECK (qty > 0)
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items: partner reads own" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN drops d ON d.id = o.drop_id
      JOIN partners p ON p.id = d.partner_id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================
-- Storage buckets
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('partner-assets', 'partner-assets', true),
  ('item-photos',    'item-photos',    true);

-- Partners upload to a folder prefixed by their auth user id
CREATE POLICY "partner-assets: partner upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'partner-assets'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "partner-assets: partner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'partner-assets'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "partner-assets: partner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'partner-assets'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "item-photos: partner upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'item-photos'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "item-photos: partner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'item-photos'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '/%')
  );

CREATE POLICY "item-photos: partner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'item-photos'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '/%')
  );
