import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DropStorefront } from "../[drop]/drop-storefront";

const DUMMY_DROP = {
  id: "preview",
  name: "Spring Bake",
  slug: "preview",
  description: "Our seasonal lineup — freshly milled, baked to order.",
  state: "orders_open" as const,
  order_window_ends_at: new Date(Date.now() + 86400000 * 2).toISOString(),
  pickup_window_starts_at: new Date(Date.now() + 86400000 * 4).toISOString(),
  pickup_window_ends_at: new Date(Date.now() + 86400000 * 5).toISOString(),
};

const DUMMY_ITEMS = [
  {
    id: "preview-1",
    item_name: "Country Sourdough",
    description: "Open crumb, chewy crust, mild tang",
    photo_url: "/placeholder1.jpeg",
    price_cents: 1400,
    available_qty: 6,
  },
  {
    id: "preview-2",
    item_name: "Sesame Batard",
    description: "Toasted sesame, nutty and earthy",
    photo_url: "/placeholder2.png",
    price_cents: 1600,
    available_qty: 4,
  },
  {
    id: "preview-3",
    item_name: "Olive Fougasse",
    description: "Niçoise olives, rosemary, sea salt",
    photo_url: "/placeholder3.png",
    price_cents: 1800,
    available_qty: 3,
  },
];

export default async function DropPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("slug, business_name, pickup_address, logo_url, bg_color, fg_color, accent_color, font_style")
    .eq("slug", slug)
    .single();

  if (!partner) notFound();

  return (
    <DropStorefront
      drop={DUMMY_DROP}
      partner={{
        slug: partner.slug,
        business_name: partner.business_name,
        pickup_address: partner.pickup_address,
        logo_url: partner.logo_url ?? null,
        bg_color: partner.bg_color ?? "#faf9f6",
        fg_color: partner.fg_color ?? "#000000",
        accent_color: partner.accent_color ?? "#501b00",
        font_style: partner.font_style ?? "sans",
        stripe_account_id: "",
      }}
      items={DUMMY_ITEMS}
    />
  );
}
