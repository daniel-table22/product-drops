"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSms, isSmsTestMode } from "@/lib/sms";
import { anthropic } from "@/lib/anthropic/client";
import type { Database } from "@/types/database";

type OrderState = Database["public"]["Enums"]["order_state"];

export async function updateOrderState(orderId: string, dropId: string, newState: OrderState) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const extra: Record<string, string> = {};
  if (newState === "ready") extra.ready_at = new Date().toISOString();
  if (newState === "picked_up") extra.picked_up_at = new Date().toISOString();

  await supabase
    .from("orders")
    .update({ state: newState, ...extra })
    .eq("id", orderId);

  if (newState === "ready") {
    const serviceClient = createServiceClient();
    const { data: orderRow } = await serviceClient
      .from("orders")
      .select("customer_phone, drops!inner(partners!inner(business_name))")
      .eq("id", orderId)
      .single();

    const phone = orderRow?.customer_phone;
    const businessName = (
      orderRow?.drops as { partners: { business_name: string } } | null
    )?.partners?.business_name;

    if (phone && businessName) {
      await sendSms(phone, `Your order from ${businessName} is ready for pickup!`).catch(() => {});
    }
  }

  revalidatePath(`/dashboard/drops/${dropId}`);
}

export async function updateBlastSettings(
  dropId: string,
  announceDaysBefore: number | null,
  reminderDaysBefore: number | null,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("drops")
    .update({ announce_days_before: announceDaysBefore, reminder_days_before: reminderDaysBefore })
    .eq("id", dropId);

  revalidatePath(`/dashboard/drops/${dropId}`);
}

export async function publishDrop(dropId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug, business_name, onboarding_state")
    .eq("user_id", user.id)
    .single();

  if (!partner || partner.onboarding_state !== "stripe_ready") {
    return { error: "Connect Stripe before publishing." };
  }

  const { data: drop } = await supabase
    .from("drops")
    .select("name, slug")
    .eq("id", dropId)
    .single();

  await supabase
    .from("drops")
    .update({ state: "orders_open", published_at: new Date().toISOString() })
    .eq("id", dropId);

  // Blast opted-in subscribers
  if (drop) {
    const { data: subscribers } = await supabase
      .from("subscribers")
      .select("phone")
      .eq("partner_id", partner.id)
      .eq("opted_in", true);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const dropUrl = `${appUrl}/s/${partner.slug}/d/${drop.slug}`;

    const testMode = await isSmsTestMode();
    const results = await Promise.allSettled(
      (subscribers ?? []).map((s) =>
        sendSms(
          s.phone,
          `${partner.business_name} drop is open: ${drop.name}. Order now → ${dropUrl}`,
          { testMode }
        )
      )
    );
    const sent = results.filter((r) => r.status === "fulfilled").length;
    await supabase.from("drops").update({ blast_count: sent }).eq("id", dropId);
  }

  revalidatePath(`/dashboard/drops/${dropId}`);
  revalidatePath("/dashboard/drops");
  revalidatePath("/dashboard");
}

export async function sendBlast(dropId: string, message: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug, business_name")
    .eq("user_id", user.id)
    .single();

  if (!partner) return { error: "Partner not found." };

  const { data: subscribers } = await supabase
    .from("subscribers")
    .select("phone")
    .eq("partner_id", partner.id)
    .eq("opted_in", true);

  if (!subscribers?.length) return { sent: 0 };

  const testMode = await isSmsTestMode();
  const results = await Promise.allSettled(
    subscribers.map((s) =>
      sendSms(s.phone, message, { testMode })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  await supabase.from("drops").update({ blast_count: sent }).eq("id", dropId);
  revalidatePath(`/dashboard/drops/${dropId}`);
  return { sent };
}

export async function rewriteWithAI(
  text: string,
  context: { dropName: string; businessName: string; type: "sms" | "social" }
) {
  const systemPrompts = {
    sms: "You are a copywriter helping small food businesses send SMS blasts to their subscribers. Write concise, warm, direct messages under 160 characters. No hashtags. End with a call to action.",
    social: "You are a copywriter helping small food businesses craft Instagram captions. Write warm, evocative, community-focused captions. Use 2–4 relevant emojis and 3–5 hashtags at the end.",
  };

  const userPrompt = `Business: ${context.businessName}\nDrop: ${context.dropName}\n\nRewrite or improve this message:\n\n"${text}"`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: systemPrompts[context.type],
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") return { error: "Unexpected response" };
  return { text: content.text.trim() };
}

const FAKE_CUSTOMERS = [
  { name: "Alex Chen",     email: "alex.chen@example.com",     phone: "+14155550101" },
  { name: "Jordan Smith",  email: "jordan.smith@example.com",  phone: "+14155550102" },
  { name: "Sam Rivera",    email: "sam.rivera@example.com",    phone: "+14155550103" },
  { name: "Taylor Brown",  email: "taylor.brown@example.com",  phone: "+14155550104" },
  { name: "Morgan Lee",    email: "morgan.lee@example.com",    phone: "+14155550105" },
  { name: "Casey Davis",   email: "casey.davis@example.com",   phone: "+14155550106" },
  { name: "Riley Wilson",  email: "riley.wilson@example.com",  phone: "+14155550107" },
  { name: "Jamie Garcia",  email: "jamie.garcia@example.com",  phone: "+14155550108" },
  { name: "Drew Martinez", email: "drew.martinez@example.com", phone: "+14155550109" },
  { name: "Quinn Thompson",email: "quinn.t@example.com",       phone: "+14155550110" },
  { name: "Avery Johnson", email: "avery.j@example.com",       phone: "+14155550111" },
  { name: "Blake Anderson",email: "blake.a@example.com",       phone: "+14155550112" },
];

export async function seedOrders(dropId: string, mode: "full" | "partial") {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  // Use service client for writes — order_items RLS only allows service role inserts
  const supabase = createServiceClient();

  // Fetch drop items with names
  const { data: rawItems } = await supabase
    .from("drop_items")
    .select("id, price_cents, available_qty, items!inner(name)")
    .eq("drop_id", dropId);

  if (!rawItems?.length) return { error: "No items on this drop." };

  // Build pool of available units per item
  // Partial mode fills items at staggered rates: item 1 → 50%, item 2 → 90%, item 3+ → 100%
  const PARTIAL_RATES = [0.5, 0.9, 1.0];
  type Pool = {
    dropItemId: string; name: string; priceCents: number;
    remaining: number;   // units left to allocate in this seed run
    dbAvailable: number; // tracks the real available_qty to write back
  };
  const pool: Pool[] = rawItems
    .filter((i) => i.available_qty > 0)
    .map((i, idx) => {
      const rate = mode === "full" ? 1.0 : (PARTIAL_RATES[idx] ?? 1.0);
      return {
        dropItemId: i.id,
        name: (i.items as { name: string }).name,
        priceCents: i.price_cents,
        remaining: Math.max(1, Math.floor(i.available_qty * rate)),
        dbAvailable: i.available_qty,
      };
    });

  if (!pool.length) return { error: "No available quantity left." };

  // Shuffle customers so we get variety
  const customers = [...FAKE_CUSTOMERS].sort(() => Math.random() - 0.5);
  let custIdx = 0;
  let ordersCreated = 0;

  while (pool.some((p) => p.remaining > 0) && custIdx < customers.length) {
    const available = pool.filter((p) => p.remaining > 0);
    if (!available.length) break;

    const customer = customers[custIdx % customers.length];
    custIdx++;

    // Pick 1–3 random items for this order
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(3, shuffled.length));

    const lines: { dropItemId: string; name: string; priceCents: number; qty: number }[] = [];
    for (const item of picked) {
      const maxQty = Math.min(item.remaining, 3);
      const qty = Math.floor(Math.random() * maxQty) + 1;
      lines.push({ dropItemId: item.dropItemId, name: item.name, priceCents: item.priceCents, qty });
      item.remaining -= qty;
      item.dbAvailable -= qty;
    }

    const subtotalCents = lines.reduce((s, l) => s + l.priceCents * l.qty, 0);

    const { data: order } = await supabase
      .from("orders")
      .insert({
        drop_id: dropId,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        subtotal_cents: subtotalCents,
        tip_cents: 0,
        platform_fee_cents: 0,
        total_cents: subtotalCents,
        state: "paid",
        stripe_payment_intent_id: `seed_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        paid_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!order) continue;

    await supabase.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        item_name: l.name,
        price_cents: l.priceCents,
        qty: l.qty,
      }))
    );

    // Deduct from available_qty (pool.remaining already updated above)
    for (const l of lines) {
      await supabase
        .from("drop_items")
        .update({ available_qty: pool.find((p) => p.dropItemId === l.dropItemId)!.dbAvailable })
        .eq("id", l.dropItemId);
    }

    ordersCreated++;
  }

  revalidatePath(`/dashboard/drops/${dropId}`);
  return { created: ordersCreated };
}

export async function addDropItem(
  dropId: string,
  itemId: string,
  priceCents: number,
  totalQty: number
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("drop_items").insert({
    drop_id: dropId,
    item_id: itemId,
    price_cents: priceCents,
    total_qty: totalQty,
    available_qty: totalQty,
  });

  revalidatePath(`/dashboard/drops/${dropId}`);
}

export async function removeDropItem(dropItemId: string, dropId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("drop_items").delete().eq("id", dropItemId);

  revalidatePath(`/dashboard/drops/${dropId}`);
}

export async function updateDropItem(
  dropItemId: string,
  dropId: string,
  priceCents: number,
  newTotalQty: number
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch current to compute purchased qty
  const { data: di } = await supabase
    .from("drop_items")
    .select("total_qty, available_qty")
    .eq("id", dropItemId)
    .single();

  if (!di) return { error: "Item not found." };

  const purchased = di.total_qty - di.available_qty;
  if (newTotalQty < purchased) {
    return { error: `Qty can't go below ${purchased} (already purchased).` };
  }

  await supabase
    .from("drop_items")
    .update({
      price_cents: priceCents,
      total_qty: newTotalQty,
      available_qty: newTotalQty - purchased,
    })
    .eq("id", dropItemId);

  revalidatePath(`/dashboard/drops/${dropId}`);
  return {};
}
