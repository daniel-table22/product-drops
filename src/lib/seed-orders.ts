import { createServiceClient } from "@/lib/supabase/service";

// Seeds test orders against a drop by pulling from the partner's actual
// audience (subscribers + partner_contacts with phones) plus some ghost
// customers (fresh fictional identities) for realism. Replaces the old
// hardcoded FAKE_CUSTOMERS flow so from_csv matching, drop-count display,
// and audience-derived behavior can all be exercised in testing.
//
// Options:
//   targetFillRate: fraction of each drop_item.total_qty to sell (0..1).
//     Accounts for already-sold inventory — only seeds the delta.
//   readyRatio / pickedUpRatio: fraction of created orders to advance past
//     'paid' into those states. Used by the Pickup open / closed presets.
//
// Returns { created } on success, or { error } if the drop has no items
// or the partner has no audience to seed from.

const GHOST_FIRST = ["Sam", "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Drew", "Quinn", "Avery", "Blake", "Rowan", "Skyler", "Hayden", "Kai"];
const GHOST_LAST = ["Martinez", "Johnson", "Anderson", "Mitchell", "Parker", "Walker", "Nguyen", "Patel", "Foster", "Hayes", "Reyes", "Morgan", "Ellis"];
const GHOST_AREA_CODES = ["415", "408", "650", "510", "925"];

export type SeedOrdersOptions = {
  targetFillRate: number;
  readyRatio?: number;
  pickedUpRatio?: number;
};

type Orderer = { name: string; email: string | null; phone: string };

export async function seedOrdersForDrop(
  dropId: string,
  opts: SeedOrdersOptions,
): Promise<{ created: number; error?: string }> {
  const supabase = createServiceClient();

  // 1. Drop + partner
  const { data: drop } = await supabase
    .from("drops")
    .select("id, partner_id")
    .eq("id", dropId)
    .single();
  if (!drop) return { created: 0, error: "Drop not found." };

  // 2. Inventory (drop_items)
  const { data: rawItems } = await supabase
    .from("drop_items")
    .select("id, price_cents, total_qty, available_qty, items!inner(name)")
    .eq("drop_id", dropId);
  if (!rawItems?.length) return { created: 0, error: "No items on this drop." };

  // 3. Audience
  const [{ data: subscribers }, { data: contacts }] = await Promise.all([
    supabase
      .from("subscribers")
      .select("phone, email, name")
      .eq("partner_id", drop.partner_id),
    supabase
      .from("partner_contacts")
      .select("phone, email, name")
      .eq("partner_id", drop.partner_id)
      .not("phone", "is", null),
  ]);

  const allSubs = subscribers ?? [];
  const allContacts = contacts ?? [];

  if (allSubs.length === 0 && allContacts.length === 0) {
    return { created: 0, error: "Autofill audience first — no subscribers or contacts to seed orders from." };
  }

  // Precompute: subscribers whose email also appears on a partner_contact.
  // These are the ones that should flip from_csv=true *if* they end up ordering.
  const contactEmails = new Set(
    allContacts
      .map((c) => c.email?.toLowerCase())
      .filter((e): e is string => Boolean(e)),
  );
  const fromCsvEligiblePhones = new Set(
    allSubs
      .filter((s) => s.email && contactEmails.has(s.email.toLowerCase()))
      .map((s) => s.phone),
  );

  // Build orderer pool deduped by phone, shuffled
  const seen = new Set<string>();
  const audiencePool: Orderer[] = [];
  for (const s of allSubs) {
    if (seen.has(s.phone)) continue;
    seen.add(s.phone);
    audiencePool.push({ name: s.name ?? "Customer", email: s.email, phone: s.phone });
  }
  for (const c of allContacts) {
    if (!c.phone || seen.has(c.phone)) continue;
    seen.add(c.phone);
    audiencePool.push({ name: c.name ?? "Customer", email: c.email, phone: c.phone });
  }
  audiencePool.sort(() => Math.random() - 0.5);

  // Ghost generator (uses 555-0150..0199 range to avoid colliding with
  // seeded audience phones which live in 555-0100..0114)
  let ghostN = 0;
  function generateGhost(): Orderer {
    ghostN++;
    const first = GHOST_FIRST[Math.floor(Math.random() * GHOST_FIRST.length)];
    const last = GHOST_LAST[Math.floor(Math.random() * GHOST_LAST.length)];
    const ac = GHOST_AREA_CODES[Math.floor(Math.random() * GHOST_AREA_CODES.length)];
    const tail = 150 + Math.floor(Math.random() * 50);
    return {
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${ghostN}@fake-email213.net`,
      phone: `+1${ac}5550${tail}`,
    };
  }

  // Inventory pool per drop_item — target units to sell this run
  type InvItem = {
    dropItemId: string;
    name: string;
    priceCents: number;
    remaining: number;
    dbAvailable: number;
  };
  const inv: InvItem[] = rawItems.map((i) => {
    const alreadySold = i.total_qty - i.available_qty;
    const targetSold = Math.floor(i.total_qty * opts.targetFillRate);
    return {
      dropItemId: i.id,
      name: (i.items as { name: string }).name,
      priceCents: i.price_cents,
      remaining: Math.max(0, targetSold - alreadySold),
      dbAvailable: i.available_qty,
    };
  });

  if (inv.every((x) => x.remaining === 0)) {
    return { created: 0, error: "Target fill rate already met." };
  }

  // Create orders. ~30% ghost mix, rest from audience; if audience
  // exhausted, the rest are ghosts too.
  const orderedPhones = new Set<string>();
  const createdOrderIds: string[] = [];
  let iter = 0;
  const SAFETY_CAP = 300;

  while (inv.some((x) => x.remaining > 0) && createdOrderIds.length < SAFETY_CAP) {
    iter++;
    const useGhost = audiencePool.length === 0 || iter % 10 < 3;
    const orderer = useGhost ? generateGhost() : audiencePool.shift()!;

    const available = inv.filter((x) => x.remaining > 0);
    if (!available.length) break;

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(3, shuffled.length));

    const lines: { dropItemId: string; name: string; priceCents: number; qty: number }[] = [];
    for (const item of picked) {
      const maxQty = Math.min(item.remaining, 3);
      if (maxQty < 1) continue;
      const qty = Math.floor(Math.random() * maxQty) + 1;
      lines.push({ dropItemId: item.dropItemId, name: item.name, priceCents: item.priceCents, qty });
      item.remaining -= qty;
      item.dbAvailable -= qty;
    }
    if (lines.length === 0) break;

    const subtotal = lines.reduce((s, l) => s + l.priceCents * l.qty, 0);

    const { data: order } = await supabase
      .from("orders")
      .insert({
        drop_id: dropId,
        customer_name: orderer.name,
        customer_email: orderer.email ?? "",
        customer_phone: orderer.phone,
        subtotal_cents: subtotal,
        tip_cents: 0,
        platform_fee_cents: 0,
        total_cents: subtotal,
        state: "paid",
        stripe_payment_intent_id: `seed_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        paid_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!order) continue;
    createdOrderIds.push(order.id);
    orderedPhones.add(orderer.phone);

    await supabase.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        item_name: l.name,
        price_cents: l.priceCents,
        qty: l.qty,
      })),
    );
  }

  // Bulk-update available_qty per drop_item (one update per item, not per order)
  for (const item of inv) {
    await supabase
      .from("drop_items")
      .update({ available_qty: item.dbAvailable })
      .eq("id", item.dropItemId);
  }

  // Advance subset to ready / picked_up
  const readyCount = Math.floor(createdOrderIds.length * (opts.readyRatio ?? 0));
  const pickedUpCount = Math.floor(createdOrderIds.length * (opts.pickedUpRatio ?? 0));
  if (readyCount > 0 || pickedUpCount > 0) {
    const shuffledIds = [...createdOrderIds].sort(() => Math.random() - 0.5);
    const readyIds = shuffledIds.slice(0, readyCount);
    const pickedUpIds = shuffledIds.slice(readyCount, readyCount + pickedUpCount);
    const now = new Date().toISOString();
    if (readyIds.length > 0) {
      await supabase
        .from("orders")
        .update({ state: "ready", ready_at: now })
        .in("id", readyIds);
    }
    if (pickedUpIds.length > 0) {
      await supabase
        .from("orders")
        .update({ state: "picked_up", ready_at: now, picked_up_at: now })
        .in("id", pickedUpIds);
    }
  }

  // Flip from_csv=true on subscribers whose email matched a contact AND who
  // actually ended up ordering in this run (replicates the webhook match path
  // for seeded data since these orders don't go through Stripe).
  const toFlag = Array.from(fromCsvEligiblePhones).filter((p) => orderedPhones.has(p));
  if (toFlag.length > 0) {
    await supabase
      .from("subscribers")
      .update({ from_csv: true })
      .eq("partner_id", drop.partner_id)
      .in("phone", toFlag);
  }

  return { created: createdOrderIds.length };
}
