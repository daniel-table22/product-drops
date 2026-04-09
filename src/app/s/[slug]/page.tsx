import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SubscribeForm } from "./subscribe-form";
import { ThemeListener } from "@/components/theme-listener";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: partner } = await supabase
    .from("partners")
    .select("business_name")
    .eq("slug", slug)
    .single();

  if (!partner) return { title: "Store not found" };
  return { title: partner.business_name };
}

export default async function StorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("id, business_name, slug, pickup_address, logo_url, hero_url, bg_color, fg_color, accent_color, font_style")
    .eq("slug", slug)
    .single();

  if (!partner) notFound();

  const { data: drops } = await supabase
    .from("drops")
    .select("id, name, slug, description, state, order_window_starts_at, order_window_ends_at, pickup_window_starts_at")
    .eq("partner_id", partner.id)
    .in("state", ["orders_open", "orders_closed", "pickup_open", "scheduled"])
    .order("order_window_starts_at", { ascending: true });

  const activeDrops = drops?.filter((d) =>
    ["orders_open", "pickup_open"].includes(d.state)
  ) ?? [];
  const upcomingDrops = drops?.filter((d) =>
    ["scheduled", "orders_closed"].includes(d.state)
  ) ?? [];
  const allDrops = [...activeDrops, ...upcomingDrops];

  const stateLabel: Record<string, string> = {
    orders_open: "Orders open",
    pickup_open: "Pickup open",
    orders_closed: "Orders closed",
    scheduled: "Coming soon",
  };

  const fontFamilies: Record<string, string> = {
    sans:    "system-ui, -apple-system, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    display: "'Palatino Linotype', Palatino, 'Book Antiqua', serif",
    mono:    "'Courier New', Courier, monospace",
  };

  const bg      = partner.bg_color     ?? "#faf9f6";
  const fg      = partner.fg_color     ?? "#000000";
  const accent  = partner.accent_color ?? "#501b00";
  const font    = fontFamilies[partner.font_style ?? "sans"];

  return (
    <div
      data-theme-root
      className="min-h-screen"
      style={{
        backgroundColor: bg,
        color: fg,
        fontFamily: font,
        ["--color-bg" as string]: bg,
        ["--color-fg" as string]: fg,
        ["--color-accent" as string]: accent,
      }}
    >
      <ThemeListener />
      <div className="max-w-sm mx-auto px-2 pt-[30px] pb-12 flex flex-col gap-6">

        {/* partner-photo */}
        {partner.hero_url ? (
          <div data-name="partner-photo" className="w-full aspect-square rounded-2xl overflow-hidden shadow-[0px_4px_16px_-8px_rgba(0,0,0,0.1),0px_3px_12px_-4px_rgba(0,0,0,0.1),0px_2px_3px_-2px_rgba(0,0,51,0.06)]">
            <img
              src={partner.hero_url}
              alt={partner.business_name}
              className="w-full h-full object-cover rounded-2xl"
            />
          </div>
        ) : (
          <div data-name="partner-photo" className="w-full aspect-square rounded-2xl bg-[#ede8e0] flex items-center justify-center shadow-[0px_4px_16px_-8px_rgba(0,0,0,0.1),0px_3px_12px_-4px_rgba(0,0,0,0.1),0px_2px_3px_-2px_rgba(0,0,51,0.06)]">
            <span className="text-6xl">🍞</span>
          </div>
        )}

        {/* branding */}
        <div data-name="branding" className="flex flex-col items-center gap-2 px-8">
          {partner.logo_url ? (
            <img
              src={partner.logo_url}
              alt={partner.business_name}
              className="h-6 object-contain mix-blend-multiply"
            />
          ) : (
            <p className="text-sm font-semibold tracking-[0.2em] uppercase text-black">
              {partner.business_name}
            </p>
          )}
        </div>

        {/* intro */}
        <div data-name="intro" className="flex flex-col gap-3 px-6 text-center">
          <p className="text-lg font-semibold text-black leading-snug">
            First dibs on our next bake
          </p>
          <p className="text-base text-black/60 leading-relaxed">
            We bake what we can, when we can. Drops go live Friday mornings and usually sell out the same day. Leave your number and we'll send a text when the next one's ready — no newsletters, no spam, just a note when there's bread.
          </p>
        </div>

        {/* sign-up */}
        <div data-name="sign-up" className="px-4">
          <SubscribeForm partnerSlug={partner.slug} partnerName={partner.business_name} />
        </div>

        {/* divider */}
        <div data-name="divider" className="px-6">
          <div className="border-t border-black/10" />
        </div>

        {/* How it works */}
        <div data-name="How it works" className="px-6 flex flex-col gap-8">
          <p className="text-lg font-semibold text-black text-center">Here's how it works</p>

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
                    <p key={j} className="text-base text-black/60 leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drops */}
        {allDrops.length > 0 && (
          <>
            <div className="px-6">
              <div className="border-t border-black/10" />
            </div>
            <div data-name="drops" className="px-4 flex flex-col gap-3">
              <p className="text-lg font-semibold text-black text-center">Drops</p>
              {allDrops.map((drop) => {
                const isActive = ["orders_open", "pickup_open"].includes(drop.state);
                return isActive ? (
                  <Link
                    key={drop.id}
                    href={`/s/${partner.slug}/d/${drop.slug}`}
                    className="block rounded-xl border border-[#e8e0d5] bg-white p-4 shadow-sm hover:border-[#d4c9b8] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="font-medium text-black text-sm">{drop.name}</p>
                        {drop.description && (
                          <p className="text-xs text-black/50">{drop.description}</p>
                        )}
                        <p className="text-xs text-black/40">
                          Orders close {new Date(drop.order_window_ends_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-white rounded-full px-2.5 py-1" style={{ backgroundColor: "var(--color-accent)" }}>
                        {stateLabel[drop.state] ?? drop.state}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={drop.id}
                    className="rounded-xl border border-[#e8e0d5] bg-white/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="font-medium text-black/60 text-sm">{drop.name}</p>
                        <p className="text-xs text-black/40">
                          Opens {new Date(drop.order_window_starts_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium bg-black/8 text-black/50 rounded-full px-2.5 py-1">
                        {stateLabel[drop.state] ?? drop.state}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
