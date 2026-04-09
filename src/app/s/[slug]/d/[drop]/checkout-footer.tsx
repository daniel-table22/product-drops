"use client";

import { useEffect, useState, useRef } from "react";
import { loadStripe, type Stripe, type PaymentRequest } from "@stripe/stripe-js";
import { createCheckoutSession, createPaymentIntent } from "./actions";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type CartLine = {
  drop_item_id: string;
  item_name: string;
  price_cents: number;
  qty: number;
};

interface Props {
  drop: { id: string; slug: string; state: string; order_window_ends_at: string };
  partner: { slug: string; stripe_account_id: string };
  cartLines: CartLine[];
  subtotalCents: number;
}

export function CheckoutFooter({ drop, partner, cartLines, subtotalCents }: Props) {
  const [canApplePay, setCanApplePay] = useState<boolean | null>(null); // null = loading
  const [applePayPending, setApplePayPending] = useState(false);
  const [applePayError, setApplePayError] = useState<string | null>(null);
  const [cardPending, setCardPending] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const prRef = useRef<PaymentRequest | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  // Keep latest cart state accessible inside the stale paymentmethod closure
  const cartLinesRef = useRef(cartLines);
  const subtotalCentsRef = useRef(subtotalCents);
  cartLinesRef.current = cartLines;
  subtotalCentsRef.current = subtotalCents;
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      const stripe = await stripePromise;
      if (!stripe || cancelled) return;
      stripeRef.current = stripe;

      const pr = stripe.paymentRequest({
        country: "US",
        currency: "usd",
        total: { label: "Order total", amount: subtotalCents },
        requestPayerName: true,
        requestPayerEmail: true,
        requestPayerPhone: true,
      });

      const result = await pr.canMakePayment();
      if (cancelled) return;

      prRef.current = pr;
      setCanApplePay(result !== null);

      pr.on("paymentmethod", async (ev) => {
        setApplePayPending(true);
        setApplePayError(null);

        const intentResult = await createPaymentIntent({
          dropId: drop.id,
          cartLines: cartLinesRef.current,
          subtotalCents: subtotalCentsRef.current,
          partnerStripeAccountId: partner.stripe_account_id,
          customerName: ev.payerName ?? "Guest",
          customerEmail: ev.payerEmail ?? "",
          customerPhone: ev.payerPhone ?? "",
        });

        if ("error" in intentResult) {
          ev.complete("fail");
          setApplePayError(intentResult.error);
          setApplePayPending(false);
          return;
        }

        const { error: confirmError } = await stripe.confirmCardPayment(
          intentResult.clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          ev.complete("fail");
          setApplePayError(confirmError.message ?? "Payment failed.");
          setApplePayPending(false);
          return;
        }

        ev.complete("success");

        // Handle 3DS if needed
        const { error: actionError } = await stripe.confirmCardPayment(intentResult.clientSecret);
        if (actionError) {
          setApplePayError(actionError.message ?? "Payment failed.");
          setApplePayPending(false);
          return;
        }

        // Redirect to success
        window.location.href = `/s/${partner.slug}/d/${drop.slug}/success?payment_intent=${intentResult.paymentIntentId}`;
      });
    }
    detect();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplePay() {
    if (!prRef.current || !subtotalCents) return;
    // Update amount in case cart changed
    prRef.current.update({
      total: { label: "Order total", amount: subtotalCents },
    });
    prRef.current.show();
  }

  async function handleManualCheckout() {
    setCardPending(true);
    setCardError(null);
    const formData = new FormData();
    formData.set("drop_id", drop.id);
    formData.set("partner_slug", partner.slug);
    formData.set("drop_slug", drop.slug);
    formData.set("cart", JSON.stringify(cartLines));
    const result = await createCheckoutSession(formData);
    if ("url" in result) {
      window.location.href = result.url;
    } else {
      setCardError("error" in result ? result.error : "Something went wrong. Please try again.");
      setCardPending(false);
    }
  }

  const ordersOpen = drop.state === "orders_open";
  const hasItems = cartCount > 0;

  if (!ordersOpen) return null;

  return (
    <div className="px-5 pt-4 pb-2 flex flex-col gap-2">
      {(applePayError || cardError) && (
        <p className="text-xs text-red-600 text-center mb-2">{applePayError ?? cardError}</p>
      )}

      {canApplePay ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleApplePay}
            disabled={applePayPending || !hasItems}
            aria-label="Pay with Apple Pay"
            style={{
              WebkitAppearance: "-apple-pay-button" as React.CSSProperties["WebkitAppearance"],
              ["--apple-pay-button-style" as string]: "black",
              ["--apple-pay-button-type" as string]: "plain",
              width: "100%",
              height: "48px",
              borderRadius: "8px",
              opacity: applePayPending || !hasItems ? 0.35 : 1,
              cursor: applePayPending || !hasItems ? "not-allowed" : "pointer",
            }}
          />
          <button
            type="button"
            onClick={handleManualCheckout}
            disabled={cardPending || !hasItems}
            className="w-full text-center text-sm text-neutral-500 underline py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cardPending ? "Redirecting…" : "Or pay with card"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleManualCheckout}
          disabled={cardPending || !hasItems}
          className="w-full bg-black text-white text-xl font-medium py-4 flex items-center justify-center gap-2 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>{cardPending ? "Redirecting…" : hasItems ? "Checkout" : "Add items to order"}</span>
          {!cardPending && hasItems && <span>${(subtotalCents / 100).toFixed(2)}</span>}
        </button>
      )}
    </div>
  );
}
