"use server";

import { createClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/client";
import type { Database } from "@/types/database";

// Anon client — reads public data via RLS (no cookies needed for storefront)
function createAnonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type CartLine = {
  drop_item_id: string;
  item_name: string;
  price_cents: number;
  qty: number;
};

export async function createCheckoutSession(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const db = createAnonClient();
  const serviceClient = createServiceClient();

  const drop_id = formData.get("drop_id") as string;
  const partner_slug = formData.get("partner_slug") as string;
  const drop_slug = formData.get("drop_slug") as string;
  const cartRaw = formData.get("cart") as string;

  let cart: CartLine[];
  try {
    cart = JSON.parse(cartRaw);
  } catch {
    return { error: "Invalid cart data." };
  }

  if (!cart || cart.length === 0 || cart.every((l) => l.qty === 0)) {
    return { error: "Your cart is empty." };
  }

  const cartLines = cart.filter((l) => l.qty > 0);

  // Verify drop is still orders_open (serviceClient bypasses RLS — works regardless of published_at)
  const { data: drop } = await serviceClient
    .from("drops")
    .select("id, state, partner_id, order_window_ends_at")
    .eq("id", drop_id)
    .single();

  if (!drop || drop.state !== "orders_open") {
    return { error: "This drop is no longer accepting orders." };
  }

  // Fetch partner's Stripe account
  const { data: partner } = await serviceClient
    .from("partners")
    .select("stripe_account_id")
    .eq("id", drop.partner_id)
    .single();

  if (!partner?.stripe_account_id) {
    return { error: "This store cannot accept payments right now." };
  }

  // Atomically decrement available_qty (needs service role to write)
  for (const line of cartLines) {
    const { data: dropItem } = await db
      .from("drop_items")
      .select("available_qty")
      .eq("id", line.drop_item_id)
      .single();

    if (!dropItem || dropItem.available_qty < line.qty) {
      return { error: `"${line.item_name}" doesn't have enough inventory.` };
    }

    const { error } = await serviceClient
      .from("drop_items")
      .update({ available_qty: dropItem.available_qty - line.qty })
      .eq("id", line.drop_item_id)
      .eq("available_qty", dropItem.available_qty); // optimistic lock

    if (error) {
      return { error: `Could not reserve "${line.item_name}". Please try again.` };
    }
  }

  const subtotalCents = cartLines.reduce((sum, l) => sum + l.price_cents * l.qty, 0);

  const { data: pendingOrder, error: pendingErr } = await serviceClient
    .from("pending_orders")
    .insert({
      drop_id,
      customer_email: "",
      stripe_session_id: `cs_pending_${crypto.randomUUID()}`,
      line_items: cartLines,
      reserved_until: drop.order_window_ends_at,
    })
    .select("id")
    .single();

  if (pendingErr || !pendingOrder) {
    return { error: "Could not create your order. Please try again." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const platformFee = Math.max(1, Math.round(subtotalCents * 0.001));

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      line_items: cartLines.map((l) => ({
        price_data: {
          currency: "usd",
          product_data: { name: l.item_name },
          unit_amount: l.price_cents,
        },
        quantity: l.qty,
      })),
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: { destination: partner.stripe_account_id },
      },
      metadata: {
        pending_order_id: pendingOrder.id,
        drop_id,
      },
      success_url: `${appUrl}/s/${partner_slug}/d/${drop_slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/s/${partner_slug}/d/${drop_slug}`,
    });
  } catch {
    await serviceClient.from("pending_orders").delete().eq("id", pendingOrder.id);
    return { error: "Payment setup failed. Please try again." };
  }

  await serviceClient
    .from("pending_orders")
    .update({ stripe_session_id: session.id })
    .eq("id", pendingOrder.id);

  return { url: session.url! };
}

// ── Apple Pay / Google Pay path ───────────────────────────────────────────────

interface CreatePaymentIntentParams {
  dropId: string;
  cartLines: CartLine[];
  subtotalCents: number;
  partnerStripeAccountId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<{ clientSecret: string; paymentIntentId: string; pendingOrderId: string } | { error: string }> {
  const { dropId, cartLines, subtotalCents, partnerStripeAccountId, customerName, customerEmail, customerPhone } = params;
  const db = createAnonClient();
  const serviceClient = createServiceClient();

  // Verify drop state (serviceClient bypasses RLS — works regardless of published_at)
  const { data: drop } = await serviceClient
    .from("drops")
    .select("id, state, order_window_ends_at")
    .eq("id", dropId)
    .single();

  if (!drop || drop.state !== "orders_open") {
    return { error: "This drop is no longer accepting orders." };
  }

  // Decrement inventory (needs service role to write)
  for (const line of cartLines) {
    const { data: dropItem } = await db
      .from("drop_items")
      .select("available_qty")
      .eq("id", line.drop_item_id)
      .single();

    if (!dropItem || dropItem.available_qty < line.qty) {
      return { error: `"${line.item_name}" doesn't have enough inventory.` };
    }

    const { error } = await serviceClient
      .from("drop_items")
      .update({ available_qty: dropItem.available_qty - line.qty })
      .eq("id", line.drop_item_id)
      .eq("available_qty", dropItem.available_qty);

    if (error) {
      return { error: `Could not reserve "${line.item_name}". Please try again.` };
    }
  }

  const platformFee = Math.max(1, Math.round(subtotalCents * 0.001));

  const { data: pendingOrder, error: pendingErr } = await serviceClient
    .from("pending_orders")
    .insert({
      drop_id: dropId,
      customer_email: customerEmail,
      stripe_session_id: `pi_pending_${crypto.randomUUID()}`,
      line_items: cartLines,
      reserved_until: drop.order_window_ends_at,
    })
    .select("id")
    .single();

  if (pendingErr || !pendingOrder) {
    return { error: "Could not create your order. Please try again." };
  }

  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: subtotalCents,
      currency: "usd",
      application_fee_amount: platformFee,
      transfer_data: { destination: partnerStripeAccountId },
      metadata: {
        pending_order_id: pendingOrder.id,
        drop_id: dropId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
    });
  } catch {
    await serviceClient.from("pending_orders").delete().eq("id", pendingOrder.id);
    return { error: "Payment setup failed. Please try again." };
  }

  await serviceClient
    .from("pending_orders")
    .update({ stripe_session_id: intent.id })
    .eq("id", pendingOrder.id);

  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
    pendingOrderId: pendingOrder.id,
  };
}
