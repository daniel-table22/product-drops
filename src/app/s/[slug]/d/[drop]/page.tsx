import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DropStorefront } from "./drop-storefront";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; drop: string }>;
}): Promise<Metadata> {
  const { slug, drop: dropSlug } = await params;
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("id, business_name, hero_url, logo_url")
    .eq("slug", slug)
    .single();

  if (!partner) return { title: "Not found" };

  const { data: drop } = await supabase
    .from("drops")
    .select("name, description")
    .eq("partner_id", partner.id)
    .eq("slug", dropSlug)
    .single();

  if (!drop) return { title: "Not found" };

  const image = partner.hero_url ?? partner.logo_url;

  return {
    title: `${drop.name} — ${partner.business_name}`,
    description:
      drop.description ??
      `Order from ${partner.business_name}`,
    openGraph: {
      title: `${drop.name} — ${partner.business_name}`,
      description: drop.description ?? `Order from ${partner.business_name}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function DropDetailPage({
  params,
}: {
  params: Promise<{ slug: string; drop: string }>;
}) {
  const { slug, drop: dropSlug } = await params;
  const supabase = await createClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("id, business_name, slug, pickup_address, logo_url, hero_url, bg_color, fg_color, accent_color, font_style")
    .eq("slug", slug)
    .single();

  if (!partner) notFound();

  const { data: drop } = await supabase
    .from("drops")
    .select("*")
    .eq("partner_id", partner.id)
    .eq("slug", dropSlug)
    .single();

  if (!drop) notFound();

  const { data: dropItems } = await supabase
    .from("drop_items")
    .select("id, price_cents, available_qty, item:items(name, description, photo_url)")
    .eq("drop_id", drop.id);

  const items = (dropItems ?? []).map((di) => ({
    id: di.id,
    item_name: (di.item as any).name as string,
    description: (di.item as any).description as string | null,
    photo_url: (di.item as any).photo_url as string | null,
    price_cents: di.price_cents,
    available_qty: di.available_qty,
  }));

  return (
    <DropStorefront
      drop={{
        id: drop.id,
        name: drop.name,
        slug: drop.slug,
        description: drop.description,
        state: drop.state,
        order_window_ends_at: drop.order_window_ends_at,
        pickup_window_starts_at: drop.pickup_window_starts_at,
        pickup_window_ends_at: drop.pickup_window_ends_at,
        image_url: drop.image_url ?? null,
      }}
      partner={{
        slug: partner.slug,
        business_name: partner.business_name,
        pickup_address: partner.pickup_address,
        logo_url: partner.logo_url ?? null,
        bg_color: partner.bg_color ?? "#faf9f6",
        fg_color: partner.fg_color ?? "#000000",
        accent_color: partner.accent_color ?? "#501b00",
        font_style: partner.font_style ?? "sans",
      }}
      items={items}
    />
  );
}
