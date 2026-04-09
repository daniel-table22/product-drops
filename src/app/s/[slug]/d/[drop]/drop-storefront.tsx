"use client";

import { useState, useEffect, useRef } from "react";
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

export function DropStorefront({ drop, partner, items, autoPlay }: Props & { autoPlay?: boolean }) {
  const searchParams = useSearchParams();
  const preloadedPhone = searchParams.get("phone") ?? "";

  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const ordersOpen = drop.state === "orders_open";
  const countdown = useCountdown(drop.order_window_ends_at);
  const fontFamily = fontFamilies[partner.font_style] ?? fontFamilies.sans;

  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        carouselRef.current?.scrollTo({ left: next * (carouselRef.current.offsetWidth * 0.9 + 12), behavior: "smooth" });
        return next;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [autoPlay, items.length]);

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

  function handleCarouselScroll() {
    const el = carouselRef.current;
    if (!el) return;
    // Each card is 90vw wide + 12px gap; snap offset starts at 5vw
    const cardWidth = el.offsetWidth * 0.9 + 12;
    setActiveIndex(Math.round((el.scrollLeft) / cardWidth));
  }

  function scrollToCard(i: number) {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.offsetWidth * 0.9 + 12;
    el.scrollTo({ left: i * cardWidth, behavior: "smooth" });
  }

  const pickupDate = new Date(drop.pickup_window_starts_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  return (
    <div
      data-theme-root
      className="min-h-screen pb-36"
      style={{
        backgroundColor: partner.bg_color,
        color: partner.fg_color,
        fontFamily,
        ["--color-bg" as string]: partner.bg_color,
        ["--color-fg" as string]: partner.fg_color,
        ["--color-accent" as string]: partner.accent_color,
      }}
    >
      <ThemeListener />

      {/* Sticky header with brand + cart */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-5 py-3"
        style={{ backgroundColor: partner.bg_color }}
      >
        <div>
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

        {/* Cart pill — only visible when cart has items */}
        <div
          className="transition-all duration-200 overflow-hidden"
          style={{ maxWidth: cartCount > 0 ? "160px" : "0px", opacity: cartCount > 0 ? 1 : 0 }}
        >
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-semibold whitespace-nowrap"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            <span>{cartCount} item{cartCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>${(subtotalCents / 100).toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* Hero text — inside padded container */}
      <div className="max-w-sm mx-auto px-5 pt-2 pb-4 flex flex-col gap-4">
        <div data-name="Hero" className="flex flex-col items-center gap-3 text-center">
          <div data-name="Text" className="flex flex-col items-center gap-2 w-full">
            <p className="text-lg font-semibold leading-snug">{drop.name}</p>
            <p className="text-sm opacity-70">{pickupDate}, {partner.pickup_address}</p>
            {drop.description && (
              <p className="text-base opacity-70 leading-relaxed">{drop.description}</p>
            )}
            {ordersOpen && countdown && (
              <p
                className="text-base underline font-mono"
                style={{ color: "var(--color-accent)" }}
              >
                Hurry! Orders close in {countdown}
              </p>
            )}
            {!ordersOpen && (
              <p className="text-sm opacity-60">
                {drop.state === "scheduled" ? "Orders aren't open yet." : "Orders are closed for this drop."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Full-bleed carousel */}
      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex overflow-x-auto snap-x snap-mandatory"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              paddingLeft: "5vw",
              paddingRight: "5vw",
              gap: "12px",
            } as React.CSSProperties}
          >
            {items.map((item) => {
              const qty = cart[item.id] ?? 0;
              const soldOut = item.available_qty === 0;

              return (
                <div
                  key={item.id}
                  data-name="Card"
                  className="flex-none snap-start bg-white rounded-[20px] p-4 flex flex-col gap-2.5"
                  style={{
                    width: "90vw",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,85,0.06), inset 0 1.5px 2px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* top row: photo + controls */}
                  <div data-name="items" className="flex gap-2">

                    {/* item photo */}
                    <div
                      data-name="item photo"
                      className="flex-1 aspect-square rounded-[4px] overflow-hidden bg-[#f0efee]"
                    >
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.item_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center opacity-20 text-3xl">
                          🍞
                        </div>
                      )}
                    </div>

                    {/* controls */}
                    <div data-name="controls" className="flex-1 flex flex-col gap-2">

                      {/* amount row */}
                      <div data-name="amount" className="flex gap-2 h-[79px]">
                        {/* qty display */}
                        <div className="flex-1 bg-[#f0efee] rounded-[4px] flex items-center justify-center">
                          <span className="text-[28px] font-normal text-[#242021]">{qty}</span>
                        </div>
                        {/* +/- */}
                        <div data-name="buttons" className="flex-1 flex flex-col gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, 1, item.available_qty)}
                            disabled={!ordersOpen || soldOut || qty >= item.available_qty}
                            className="flex-1 bg-[#242021] rounded-[4px] flex items-center justify-center disabled:opacity-30 transition-opacity"
                          >
                            <span className="text-white text-xl leading-none select-none">+</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, -1, item.available_qty)}
                            disabled={!ordersOpen || qty === 0}
                            className="flex-1 bg-[#242021] rounded-[4px] flex items-center justify-center disabled:opacity-30 transition-opacity"
                          >
                            <span className="text-white text-xl leading-none select-none">−</span>
                          </button>
                        </div>
                      </div>

                      {/* add to cart display */}
                      <div
                        data-name="button add to cart"
                        className="rounded-[4px] px-4 py-2.5 flex flex-col items-end justify-center"
                        style={{
                          backgroundColor: soldOut ? "#c0bfbe" : "var(--color-accent)",
                          aspectRatio: "167 / 79",
                        }}
                      >
                        <p className="text-white text-[11px] font-semibold tracking-[0.22px] uppercase opacity-80 leading-none">
                          {soldOut ? "SOLD OUT" : "ADD TO CART"}
                        </p>
                        <p className="text-white text-[28px] font-medium leading-none mt-1">
                          ${((qty > 0 ? qty * item.price_cents : item.price_cents) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* text */}
                  <div data-name="text" className="flex flex-col gap-2 pt-4">
                    <p className="text-lg font-semibold leading-snug text-black">{item.item_name}</p>
                    {item.description && (
                      <p className="text-base opacity-60 leading-relaxed text-black">{item.description}</p>
                    )}
                    <span className="self-start text-sm font-medium px-2.5 py-1 rounded-[4px] bg-[rgba(0,164,51,0.1)] text-[rgba(0,113,63,0.87)]">
                      {soldOut ? "Sold out" : `${item.available_qty} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* pips */}
          {items.length > 1 && (
            <div data-name="carouselpips" className="flex items-center justify-center gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => scrollToCard(i)}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{
                    backgroundColor: i === activeIndex
                      ? "var(--color-accent)"
                      : "rgba(0,0,0,0.15)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="max-w-sm mx-auto px-5">
        <div data-name="How it works" className="flex flex-col gap-8 pt-8">
          <p className="text-lg font-semibold text-center">Here's how it works</p>
          <div className="flex flex-col gap-8">
            {[
              { img: "/step-1.png", text: ["We text you when there's a drop.", "One message per batch. Nothing else."] },
              { img: "/step-2.png", text: ["You order before it's gone.", "Small batches sell out fast."] },
              { img: "/step-3.png", text: ["You pick it up fresh.", `📍 ${partner.pickup_address}`] },
            ].map((step, i) => (
              <div key={i} data-name="step" className="flex flex-col items-center gap-4">
                <div data-name="image slot" className="flex items-start max-h-36 overflow-clip p-2.5">
                  <img src={step.img} alt={`Step ${i + 1}`} className="h-36 w-auto object-contain mix-blend-multiply" />
                </div>
                <div data-name="description" className="text-center">
                  {step.text.map((line, j) => (
                    <p key={j} className="text-base opacity-60 leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CheckoutFooter
        drop={{ id: drop.id, slug: drop.slug, state: drop.state, order_window_ends_at: drop.order_window_ends_at }}
        partner={{ slug: partner.slug, stripe_account_id: partner.stripe_account_id }}
        cartLines={cartLines}
        subtotalCents={subtotalCents}
      />
    </div>
  );
}
