"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CheckoutFooter } from "./checkout-footer";
import { ThemeListener } from "@/components/theme-listener";
import type { Database } from "@/types/database";

type DropState = Database["public"]["Enums"]["drop_state"];

type DropItem = {
  id: string;
  item_name: string;
  description: string | null;
  photo_url: string | null;
  price_cents: number;
  available_qty: number;
};

interface Props {
  drop: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    state: DropState;
    order_window_ends_at: string;
    pickup_window_starts_at: string;
    pickup_window_ends_at: string;
  };
  partner: {
    slug: string;
    business_name: string;
    pickup_address: string;
    logo_url: string | null;
    bg_color: string;
    fg_color: string;
    accent_color: string;
    font_style: string;
    stripe_account_id: string;
  };
  items: DropItem[];
}

const fontFamilies: Record<string, string> = {
  sans:    "system-ui, -apple-system, sans-serif",
  serif:   "Georgia, 'Times New Roman', serif",
  display: "'Palatino Linotype', Palatino, 'Book Antiqua', serif",
  mono:    "'Courier New', Courier, monospace",
};

function useCountdown(target: string) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function tick() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setLabel(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(`${h}h ${m}m`);
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [target]);
  return label;
}

export function DropStorefront({ drop, partner, items }: Props) {
  const searchParams = useSearchParams();
  const preloadedPhone = searchParams.get("phone") ?? "";

  const [cart, setCart] = useState<Record<string, number>>({});

  const ordersOpen = drop.state === "orders_open";
  const countdown = useCountdown(drop.order_window_ends_at);
  const fontFamily = fontFamilies[partner.font_style] ?? fontFamilies.sans;

  function updateQty(id: string, delta: number, max: number) {
    setCart((prev) => {
      const next = Math.min(max, Math.max(0, (prev[id] ?? 0) + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  }

  const cartLines = items
    .filter((i) => (cart[i.id] ?? 0) > 0)
    .map((i) => ({
      drop_item_id: i.id,
      item_name: i.item_name,
      price_cents: i.price_cents,
      qty: cart[i.id],
    }));

  const subtotalCents = cartLines.reduce((s, l) => s + l.price_cents * l.qty, 0);
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);

  const pickupDate = new Date(drop.pickup_window_starts_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  return (
    <div
      data-theme-root
      className="min-h-screen"
      style={{
        backgroundColor: partner.bg_color,
        color: partner.fg_color,
        fontFamily,
        ["--color-bg" as string]: partner.bg_color,
        ["--color-fg" as string]: partner.fg_color,
        ["--color-accent" as string]: partner.accent_color,
        paddingBottom: cartCount > 0 ? "128px" : "48px",
      }}
    >
      <ThemeListener />

      {/* Sticky header */}
      <div
        className="sticky top-0 z-20 flex items-center justify-center px-5 py-3"
      >
        {partner.logo_url ? (
          <img
            src={partner.logo_url}
            alt={partner.business_name}
            className="h-5 w-auto object-contain mix-blend-multiply"
          />
        ) : (
          <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-70">
            {partner.business_name}
          </p>
        )}
      </div>

      {/* Hero */}
      <div className="mx-2 pt-2 pb-6 flex flex-col gap-2 text-center">
        <p className="text-lg font-semibold leading-snug">{drop.name}</p>
        <p className="text-sm opacity-60">{pickupDate} · {partner.pickup_address}</p>
        {drop.description && (
          <p className="text-base opacity-70 leading-relaxed px-4">{drop.description}</p>
        )}
        {ordersOpen && countdown && (
          <p className="text-base font-mono" style={{ color: "var(--color-accent)" }}>
            Orders close in {countdown}
          </p>
        )}
        {!ordersOpen && (
          <p className="text-sm opacity-50">
            {drop.state === "scheduled" ? "Orders aren't open yet." : "Orders are closed for this drop."}
          </p>
        )}
      </div>

      {/* Item list — no card backgrounds, just stacked */}
      {items.length > 0 && (
        <div className="mx-2 flex flex-col">
          {items.map((item) => {
            const qty = cart[item.id] ?? 0;
            const soldOut = item.available_qty === 0;
            const inCart = qty > 0;

            return (
              <div key={item.id} className="py-4">
                {/* Photo + controls row */}
                <div className="flex gap-2">
                  {/* Photo — square, ~62% width */}
                  <div
                    className="shrink-0 rounded-[4px] overflow-hidden bg-[#f0efee]"
                    style={{ width: "62%", aspectRatio: "1 / 1" }}
                  >
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt={item.item_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20 text-4xl">
                        🍞
                      </div>
                    )}
                  </div>

                  {/* Right controls */}
                  <div className="flex-1 flex flex-col justify-between">
                    {/* Top group: badge → price → x{qty} */}
                    <div className="flex flex-col gap-2">
                      <span className="self-start text-sm font-medium px-2.5 py-1 rounded-[4px] bg-[rgba(0,164,51,0.1)] text-[rgba(0,113,63,0.87)]">
                        {soldOut ? "Sold out" : `${item.available_qty} left`}
                      </span>
                      <p className="font-mono text-[24px] text-[#242021] leading-[24px]">
                        ${(item.price_cents / 100).toFixed(2)}
                      </p>
                      {inCart && (
                        <p
                          className="font-mono text-[24px] leading-[24px]"
                          style={{ color: "var(--color-accent)" }}
                        >
                          x{qty}
                        </p>
                      )}
                    </div>

                    {/* ± buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1, item.available_qty)}
                        disabled={!ordersOpen || qty === 0}
                        className="flex-1 h-[56px] rounded-[4px] flex items-center justify-center transition-colors cursor-pointer disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: inCart ? "#242021" : "#e2e2e2",
                          opacity: !ordersOpen || qty === 0 ? (inCart ? 0.3 : 1) : 1,
                        }}
                      >
                        <span
                          className="text-xl leading-none select-none"
                          style={{ color: inCart ? "#fff" : "#242021" }}
                        >
                          −
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1, item.available_qty)}
                        disabled={!ordersOpen || soldOut || qty >= item.available_qty}
                        className="flex-1 h-[56px] bg-[#242021] rounded-[4px] flex items-center justify-center disabled:opacity-30 transition-opacity cursor-pointer"
                      >
                        <span className="text-white text-xl leading-none select-none">+</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Name + description */}
                <div className="mt-3 flex flex-col gap-1">
                  <p className="text-[18px] font-semibold leading-snug text-black">{item.item_name}</p>
                  {item.description && (
                    <p className="text-base opacity-60 leading-relaxed text-black">{item.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Docked checkout footer */}
      <CheckoutFooter
        drop={{ id: drop.id, slug: drop.slug, state: drop.state, order_window_ends_at: drop.order_window_ends_at }}
        partner={{ slug: partner.slug, stripe_account_id: partner.stripe_account_id }}
        cartLines={cartLines}
        subtotalCents={subtotalCents}
      />
    </div>
  );
}
