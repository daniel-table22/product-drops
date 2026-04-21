import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSms } from "@/lib/sms";
import type Stripe from "stripe";

type LineItem = {
  drop_item_id: string;
  item_name: string;
  price_cents: number;
  qty: number;
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
  }

  if (event.type === "payment_intent.succeeded") {
    await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
  }

  return NextResponse.json({ received: true });
}

async function getPartnerForDrop(dropId: string): Promise<{ id: string; business_name: string } | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("drops")
    .select("partners!inner(id, business_name)")
    .eq("id", dropId)
    .single();
  return (data?.partners as { id: string; business_name: string } | null) ?? null;
}

// If the order's email matches a partner_contacts row, flag the subscriber
// (if one exists for that phone) as from_csv. This is how we track which
// drops subscribers originally came from an imported contact list.
async function flagFromCsvIfMatches(
  partnerId: string,
  phone: string | null,
  email: string | null,
) {
  if (!phone || !email) return;
  const supabase = createServiceClient();
  const { data: contact } = await supabase
    .from("partner_contacts")
    .select("id")
    .eq("partner_id", partnerId)
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (!contact) return;
  await supabase
    .from("subscribers")
    .update({ from_csv: true })
    .eq("partner_id", partnerId)
    .eq("phone", phone);
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const supabase = createServiceClient();

  const { pending_order_id } = session.metadata ?? {};
  if (!pending_order_id) return;

  const { data: pendingOrder } = await supabase
    .from("pending_orders")
    .select("*")
    .eq("id", pending_order_id)
    .single();

  if (!pendingOrder) return;

  const lineItems = pendingOrder.line_items as LineItem[];
  const subtotalCents = lineItems.reduce((sum, l) => sum + l.price_cents * l.qty, 0);
  const platformFeeCents = Math.max(1, Math.round(subtotalCents * 0.001));
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? "";

  // Pull customer info from Stripe session (collected on Stripe's page)
  const customerName = session.customer_details?.name ?? "Guest";
  const customerEmail = session.customer_details?.email ?? pendingOrder.customer_email;
  const customerPhone = session.customer_details?.phone ?? null;

  // Idempotency: both checkout.session.completed and payment_intent.succeeded
  // fire for the same card payment — skip if order already created.
  const { data: existing } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (existing) {
    await supabase.from("pending_orders").delete().eq("id", pending_order_id);
    return;
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      drop_id: pendingOrder.drop_id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      stripe_payment_intent_id: paymentIntentId,
      subtotal_cents: subtotalCents,
      tip_cents: 0,
      total_cents: subtotalCents,
      platform_fee_cents: platformFeeCents,
      state: "paid",
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (orderErr || !order) return;

  // Create order_items
  await supabase.from("order_items").insert(
    lineItems.map((l) => ({
      order_id: order.id,
      item_name: l.item_name,
      price_cents: l.price_cents,
      qty: l.qty,
    }))
  );

  // Delete pending order
  await supabase.from("pending_orders").delete().eq("id", pending_order_id);

  const partner = await getPartnerForDrop(pendingOrder.drop_id);

  // Flag from_csv on the subscriber if their email matches a partner_contacts row
  if (partner) {
    await flagFromCsvIfMatches(partner.id, customerPhone, customerEmail).catch(() => {});
  }

  // Send order confirmation SMS
  if (customerPhone && partner) {
    await sendSms(
      customerPhone,
      `Your order from ${partner.business_name} is confirmed. We'll text you when it's ready for pickup.`
    ).catch(() => {});
  }
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  const supabase = createServiceClient();

  const { pending_order_id, customer_name, customer_email, customer_phone } =
    intent.metadata ?? {};

  if (!pending_order_id) return;

  const { data: pendingOrder } = await supabase
    .from("pending_orders")
    .select("*")
    .eq("id", pending_order_id)
    .single();

  if (!pendingOrder) return;

  const lineItems = pendingOrder.line_items as LineItem[];
  const subtotalCents = lineItems.reduce((sum, l) => sum + l.price_cents * l.qty, 0);
  const platformFeeCents = Math.max(1, Math.round(subtotalCents * 0.001));

  const { data: existing2 } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", intent.id)
    .maybeSingle();

  if (existing2) {
    await supabase.from("pending_orders").delete().eq("id", pending_order_id);
    return;
  }

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      drop_id: pendingOrder.drop_id,
      customer_name: customer_name ?? "Guest",
      customer_email: customer_email ?? "",
      customer_phone: customer_phone || null,
      stripe_payment_intent_id: intent.id,
      subtotal_cents: subtotalCents,
      tip_cents: 0,
      total_cents: subtotalCents,
      platform_fee_cents: platformFeeCents,
      state: "paid",
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (orderErr || !order) return;

  await supabase.from("order_items").insert(
    lineItems.map((l) => ({
      order_id: order.id,
      item_name: l.item_name,
      price_cents: l.price_cents,
      qty: l.qty,
    }))
  );

  await supabase.from("pending_orders").delete().eq("id", pending_order_id);

  const partner = await getPartnerForDrop(pendingOrder.drop_id);

  // Flag from_csv on the subscriber if their email matches a partner_contacts row
  if (partner) {
    await flagFromCsvIfMatches(partner.id, customer_phone || null, customer_email || null).catch(() => {});
  }

  // Send order confirmation SMS
  if (customer_phone && partner) {
    await sendSms(
      customer_phone,
      `Your order from ${partner.business_name} is confirmed. We'll text you when it's ready for pickup.`
    ).catch(() => {});
  }
}
