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
  const [canApplePay, setCanApplePay] = useState<boolean | null>(null);
  const [applePayPending, setApplePayPending] = useState(false);
  const [applePayError, setApplePayError] = useState<string | null>(null);
  const [cardPending, setCardPending] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const prRef = useRef<PaymentRequest | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const cartLinesRef = useRef(cartLines);
  const subtotalCentsRef = useRef(subtotalCents);
  cartLinesRef.current = cartLines;
  subtotalCentsRef.current = subtotalCents;

  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const ordersOpen = drop.state === "orders_open";

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      const stripe = await stripePromise;
      if (!stripe || cancelled) return;
      stripeRef.current = stripe;

      const pr = stripe.paymentRequest({
        country: "US",
        currency: "usd",
        total: { label: "Order total", amount: subtotalCents || 1 },
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

        const stripe = stripeRef.current!;
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

        const { error: actionError } = await stripe.confirmCardPayment(intentResult.clientSecret);
        if (actionError) {
          setApplePayError(actionError.message ?? "Payment failed.");
          setApplePayPending(false);
          return;
        }

        window.location.href = `/s/${partner.slug}/d/${drop.slug}/success?payment_intent=${intentResult.paymentIntentId}`;
      });
    }
    detect();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplePay() {
    if (!prRef.current || !subtotalCents) return;
    prRef.current.update({ total: { label: "Order total", amount: subtotalCents } });
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

  if (!ordersOpen || cartCount === 0) return null;

  return (
    <div className="fixed md:sticky bottom-0 left-0 right-0 z-30 bg-black">
      <div
        className="max-w-[400px] mx-auto flex flex-col gap-[10px] px-6 py-4 pb-safe"
        style={{ backgroundColor: "var(--color-bg, #faf9f6)", boxShadow: "0px 0px 21px 0px rgba(0,0,51,0.16)" }}
      >
      {/* Error */}
      {(applePayError || cardError) && (
        <p className="text-xs text-red-600 text-center">{applePayError ?? cardError}</p>
      )}

      {/* Total */}
      <p className="font-mono text-[16px] leading-[16px]" style={{ color: "var(--color-fg, #000)" }}>
        Total ${(subtotalCents / 100).toFixed(2)}
      </p>

      {/* Buttons */}
      <div className="flex gap-[10px]">
        {/* Pay by card */}
        <button
          type="button"
          onClick={handleManualCheckout}
          disabled={cardPending}
          className="flex-1 py-4 px-[10px] rounded-[4px] flex items-center justify-center text-[16px] font-medium text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          style={{ backgroundColor: "#242021" }}
        >
          {cardPending ? "Redirecting…" : "Pay by card"}
        </button>

        {/* Apple Pay — only shown if available */}
        {canApplePay && (
          <button
            type="button"
            onClick={handleApplePay}
            disabled={applePayPending}
            aria-label="Pay with Apple Pay"
            style={{
              WebkitAppearance: "-apple-pay-button" as React.CSSProperties["WebkitAppearance"],
              ["--apple-pay-button-style" as string]: "black",
              ["--apple-pay-button-type" as string]: "plain",
              flex: "1",
              borderRadius: "4px",
              opacity: applePayPending ? 0.35 : 1,
              cursor: applePayPending ? "not-allowed" : "pointer",
            }}
          />
        )}

        {/* Fallback: single full-width checkout when Apple Pay not available */}
        {canApplePay === false && (
          <button
            type="button"
            onClick={handleManualCheckout}
            disabled={cardPending}
            className="flex-1 py-4 px-[10px] rounded-[4px] flex items-center justify-center text-[16px] font-medium text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#242021" }}
          >
            {cardPending ? "Redirecting…" : "Checkout"}
          </button>
        )}
      </div>
      </div>
    </div>
  );
}
