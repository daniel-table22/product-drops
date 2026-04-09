import { createServiceClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe/client";

type CartLine = {
  drop_item_id: string;
  item_name: string;
  price_cents: number;
  qty: number;
};

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; drop: string }>;
  searchParams: Promise<{ session_id?: string; payment_intent?: string }>;
}) {
  const { slug, drop: dropSlug } = await params;
  const { session_id, payment_intent } = await searchParams;

  const serviceClient = createServiceClient();

  // Load partner + drop
  const { data: partner } = await serviceClient
    .from("partners")
    .select("id, business_name, slug, bg_color, fg_color, accent_color, font_style")
    .eq("slug", slug)
    .single();

  const { data: drop } = partner
    ? await serviceClient
        .from("drops")
        .select("id, name, pickup_window_starts_at, pickup_window_ends_at")
        .eq("partner_id", partner.id)
        .eq("slug", dropSlug)
        .single()
    : { data: null };

  // Resolve order line items from pending_order
  let lineItems: CartLine[] = [];
  let customerName: string | null = null;

  const lookupId = session_id ?? payment_intent;

  if (lookupId) {
    // Try to find pending_order by stripe_session_id
    const { data: pending } = await serviceClient
      .from("pending_orders")
      .select("line_items")
      .eq("stripe_session_id", lookupId)
      .maybeSingle();

    if (pending?.line_items) {
      lineItems = pending.line_items as CartLine[];
    }

    // Get customer name from Stripe if it's a checkout session
    if (session_id) {
      try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        customerName = session.customer_details?.name ?? null;
      } catch {
        // ignore
      }
    } else if (payment_intent) {
      try {
        const intent = await stripe.paymentIntents.retrieve(payment_intent);
        customerName = (intent.metadata?.customer_name as string) ?? null;
      } catch {
        // ignore
      }
    }
  }

  const subtotalCents = lineItems.reduce((s, l) => s + l.price_cents * l.qty, 0);

  const pickupStart = drop
    ? new Date(drop.pickup_window_starts_at).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      })
    : null;
  const pickupEnd = drop
    ? new Date(drop.pickup_window_ends_at).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      })
    : null;

  const businessName = partner?.business_name ?? "the store";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[#faf9f6]">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-14 h-14 rounded-full bg-[#e6f4ea] flex items-center justify-center text-2xl">
            ✓
          </div>
          <h1 className="text-2xl font-semibold text-[#1a1a1a] tracking-tight">
            Order confirmed!
          </h1>
          {customerName && (
            <p className="text-base text-[#666]">Thanks, {customerName}.</p>
          )}
        </div>

        {/* Order summary */}
        {lineItems.length > 0 && (
          <div className="rounded-2xl border border-[#e0e1e6] bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e0e1e6]">
              <p className="text-sm font-semibold text-[#1a1a1a]">Your order</p>
            </div>
            <div className="divide-y divide-[#f0f0f0]">
              {lineItems.map((line, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-[#888] shrink-0">{line.qty}×</span>
                    <span className="text-sm text-[#1a1a1a] truncate">{line.item_name}</span>
                  </div>
                  <span className="text-sm text-[#1a1a1a] font-medium shrink-0">
                    ${((line.price_cents * line.qty) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1a1a1a]">Total</span>
                <span className="text-sm font-semibold text-[#1a1a1a]">
                  ${(subtotalCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pickup window */}
        {pickupStart && (
          <div className="rounded-2xl border border-[#e0e1e6] bg-white px-4 py-4 flex gap-3 items-start">
            <span className="text-xl mt-0.5">📍</span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-[#1a1a1a]">Pickup window</p>
              <p className="text-sm text-[#666]">
                {pickupStart === pickupEnd ? pickupStart : `${pickupStart} – ${pickupEnd}`}
              </p>
              <p className="text-xs text-[#999] mt-1">
                You'll get a reminder when it's time.
              </p>
            </div>
          </div>
        )}

        {/* Club CTA */}
        <div className="rounded-2xl border border-[#e0e1e6] bg-white px-4 py-5 flex flex-col gap-3 text-center items-center">
          <p className="text-sm text-[#444] leading-relaxed">
            Members of the <strong className="font-semibold text-[#1a1a1a]">{businessName} club</strong> get
            early access to every drop — before anyone else.
          </p>
          <a
            href={`/s/${slug}`}
            className="w-full py-3 rounded-xl bg-[#1a1a1a] text-white text-sm font-semibold text-center"
          >
            Visit Club
          </a>
        </div>

      </div>
    </div>
  );
}
