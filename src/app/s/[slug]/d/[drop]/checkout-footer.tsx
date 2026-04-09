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
  const prRef = useRef<PaymentRequest | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
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
          cartLines,
          subtotalCents,
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
    const formData = new FormData();
    formData.set("drop_id", drop.id);
    formData.set("partner_slug", partner.slug);
    formData.set("drop_slug", drop.slug);
    formData.set("cart", JSON.stringify(cartLines));
    const result = await createCheckoutSession(formData);
    if ("url" in result) window.location.href = result.url;
  }

  const visible = drop.state === "orders_open" && cartCount > 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e0e1e6] px-6 pt-4 pb-12 transition-transform duration-300 ease-out"
      style={{ transform: visible ? "translateY(0)" : "translateY(110%)" }}
    >
      {applePayError && (
        <p className="text-xs text-red-600 text-center mb-2">{applePayError}</p>
      )}

      {canApplePay ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleApplePay}
            disabled={applePayPending}
            className="w-full bg-black text-white text-xl font-medium py-4 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {applePayPending ? "Processing…" : (
              <>
                <svg viewBox="0 0 24 10" className="h-5 fill-white" aria-hidden><path d="M4.52 2.17c-.3.36-.78.64-1.26.6-.06-.48.18-.99.46-1.3C4.02.09 4.54-.16 5 .13c.06.5-.14.98-.48 1.34zm.46.64c-.7-.04-1.3.4-1.63.4-.34 0-.86-.38-1.42-.37-.73.01-1.4.42-1.77 1.08-.76 1.31-.2 3.25.54 4.32.36.53.8 1.11 1.37 1.09.54-.02.75-.35 1.4-.35.65 0 .84.35 1.42.34.59-.01.96-.53 1.32-1.06.41-.6.58-1.18.59-1.21-.01-.01-1.14-.44-1.15-1.74-.01-1.09.89-1.61.93-1.64-.51-.75-1.3-.83-1.6-.86zm4.14-.94v8.08h1.25V6.8h1.73c1.58 0 2.69-1.08 2.69-2.67 0-1.59-1.09-2.66-2.65-2.66H9.12zm1.25 1.05h1.44c1.08 0 1.7.58 1.7 1.62 0 1.04-.62 1.62-1.71 1.62h-1.43V2.92zm6.44 7.09c.78 0 1.51-.4 1.84-1.03h.03v.97h1.16V5.41c0-1.17-.93-1.92-2.36-1.92-1.33 0-2.31.76-2.35 1.81h1.13c.09-.5.55-.82 1.19-.82.77 0 1.2.36 1.2 1.02v.45l-1.57.09c-1.46.09-2.25.69-2.25 1.73 0 1.05.82 1.74 2.0 1.74zm.34-1c-.67 0-1.1-.32-1.1-.82 0-.52.41-.81 1.2-.86l1.4-.09v.46c0 .77-.65 1.31-1.5 1.31zm4.55 3.24c1.22 0 1.79-.47 2.29-1.88l2.19-6.17h-1.27l-1.47 4.76h-.03l-1.47-4.76h-1.31l2.13 5.9-.11.36c-.19.6-.49.83-.94.83-.09 0-.26-.01-.33-.03v.97c.07.02.24.02.32.02z"/></svg>
                Pay ${(subtotalCents / 100).toFixed(2)}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleManualCheckout}
            className="w-full text-center text-sm text-neutral-10 underline py-1"
          >
            Or pay with card
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleManualCheckout}
          className="w-full bg-black text-white text-xl font-medium py-4 flex items-center justify-center gap-2"
        >
          <span>Checkout</span>
          <span>${(subtotalCents / 100).toFixed(2)}</span>
        </button>
      )}
    </div>
  );
}
