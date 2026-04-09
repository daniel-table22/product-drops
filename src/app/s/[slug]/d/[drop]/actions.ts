"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/client";

type CartLine = {
  drop_item_id: string;
  item_name: string;
  price_cents: number;
  qty: number;
};

export async function createCheckoutSession(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  const drop_id = formData.get("drop_id") as string;
  const partner_slug = formData.get("partner_slug") as string;
  const drop_slug = formData.get("drop_slug") as string;
  const customer_name = formData.get("customer_name") as string;
  const customer_email = formData.get("customer_email") as string;
  const customer_phone = (formData.get("customer_phone") as string) || "";
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

  // Verify drop is still orders_open
  const { data: drop } = await supabase
    .from("drops")
    .select("id, state, partner_id")
    .eq("id", drop_id)
    .single();

  if (!drop || drop.state !== "orders_open") {
    return { error: "This drop is no longer accepting orders." };
  }

  // Fetch partner's Stripe account
  const { data: partner } = await supabase
    .from("partners")
    .select("stripe_account_id")
    .eq("id", drop.partner_id)
    .single();

  if (!partner?.stripe_account_id) {
    return { error: "This store cannot accept payments right now." };
  }

  // Atomically decrement available_qty per item (best-effort with optimistic lock)
  for (const line of cartLines) {
    const { data: dropItem } = await serviceClient
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

  // Create pending_order
  const subtotalCents = cartLines.reduce(
    (sum, l) => sum + l.price_cents * l.qty,
    0
  );
  const reserved_until = drop
    ? (
        await supabase
          .from("drops")
          .select("order_window_ends_at")
          .eq("id", drop_id)
          .single()
      ).data?.order_window_ends_at ?? new Date().toISOString()
    : new Date().toISOString();

  const { data: pendingOrder, error: pendingErr } = await serviceClient
    .from("pending_orders")
    .insert({
      drop_id,
      customer_email,
      stripe_session_id: "placeholder", // will update after session creation
      line_items: cartLines,
      reserved_until,
    })
    .select("id")
    .single();

  if (pendingErr || !pendingOrder) {
    return { error: "Could not create your order. Please try again." };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const platformFee = Math.max(1, Math.round(subtotalCents * 0.001)); // 0.1%, min $0.01

  // Create Stripe Checkout session
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email,
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
        customer_name,
        customer_phone,
      },
      success_url: `${appUrl}/s/${partner_slug}/d/${drop_slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/s/${partner_slug}/d/${drop_slug}`,
    });
  } catch {
    // Delete the pending order; pg_cron sweep will restore inventory on drop close
    await serviceClient.from("pending_orders").delete().eq("id", pendingOrder.id);
    return { error: "Payment setup failed. Please try again." };
  }

  // Update pending_order with real session ID
  await serviceClient
    .from("pending_orders")
    .update({ stripe_session_id: session.id })
    .eq("id", pendingOrder.id);

  return { url: session.url! };
}
