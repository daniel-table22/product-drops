"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createItem(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const photo_url = (formData.get("photo_url") as string) || null;
  const price = parseFloat(formData.get("default_price_cents") as string) || 0;
  const default_price_cents = Math.round(price * 100);

  const { data: item } = await supabase.from("items").insert({
    partner_id: partner.id,
    name,
    description,
    photo_url,
    default_price_cents,
  }).select("id, name, description, photo_url, default_price_cents").single();

  revalidatePath("/dashboard/products");
  return item;
}

export async function updateItem(id: string, formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const photo_url = (formData.get("photo_url") as string) || null;
  const price = parseFloat(formData.get("default_price_cents") as string) || 0;
  const default_price_cents = Math.round(price * 100);

  await supabase
    .from("items")
    .update({ name, description, photo_url, default_price_cents })
    .eq("id", id);

  revalidatePath("/dashboard/products");
}

export async function archiveItem(id: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("items")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/dashboard/products");
}

// ─── Test-data seed (admin only, gated in the UI by isAdmin+uiTestMode) ──────

type SeedItem = { name: string; description: string; price: number };

const CATEGORY_SEEDS: Record<string, { photos: string[]; items: SeedItem[] }> = {
  baker: {
    photos: ["1.jpeg", "2.jpeg", "3.png", "4.png", "5.jpeg"],
    items: [
      { name: "Sourdough Loaf", description: "24-hour naturally leavened, dark crust", price: 10 },
      { name: "Butter Croissant", description: "Hand-laminated with European butter", price: 5 },
      { name: "Cinnamon Roll", description: "Cardamom-spiced, morning-baked", price: 6 },
      { name: "Morning Bun", description: "Flaky, sugar-crusted, orange zest", price: 5 },
      { name: "Chocolate Chip Cookie", description: "Brown butter, sea salt", price: 4 },
    ],
  },
  butcher: {
    photos: ["1.jpg", "2.jpeg", "3.jpg", "4.jpeg", "5.jpeg"],
    items: [
      { name: "Dry-Aged Ribeye", description: "45-day dry-aged, 16oz", price: 38 },
      { name: "Pork Ribs", description: "Heritage breed, bone-in rack", price: 24 },
      { name: "House Sausage", description: "Chef's selection, 1lb", price: 14 },
      { name: "Duck Breast", description: "Pekin, skin scored", price: 18 },
      { name: "Bone Broth", description: "48-hour simmer, quart", price: 12 },
    ],
  },
  alcohol: {
    photos: ["1.jpeg", "2.jpeg", "3.png", "4.png", "5.png"],
    items: [
      { name: "Small Batch Bourbon", description: "Rye-forward, 750ml", price: 48 },
      { name: "Mezcal Espadín", description: "Artisanal, Oaxaca", price: 52 },
      { name: "Amaro Nonino", description: "Bittersweet digestif", price: 42 },
      { name: "Gin Botanique", description: "Juniper-forward, local botanicals", price: 38 },
      { name: "Single Malt Whisky", description: "12-year Highland", price: 68 },
    ],
  },
  wine: {
    photos: ["1.jpeg", "2.jpeg"],
    items: [
      { name: "Natural Orange Wine", description: "Skin-contact, unfiltered", price: 34 },
      { name: "Pét-Nat Rosé", description: "Ancestral method, bubbly", price: 28 },
    ],
  },
  cheese: {
    photos: ["1.jpg"],
    items: [
      { name: "Aged Comté", description: "24-month, Jura mountains", price: 18 },
    ],
  },
  provisions: {
    photos: ["1.jpeg", "2.jpeg", "3.png", "4.png", "5.png"],
    items: [
      { name: "Single-Origin Olive Oil", description: "Cold-pressed, Sicilian", price: 32 },
      { name: "Flaky Sea Salt", description: "Maldon, 8oz tin", price: 8 },
      { name: "Wild Honey", description: "Raw, unfiltered, 12oz", price: 16 },
      { name: "Fermented Hot Sauce", description: "Small batch, habanero", price: 12 },
      { name: "Stone-Ground Grits", description: "Heirloom corn, 2lb bag", price: 10 },
    ],
  },
  restaurant: {
    photos: ["1.jpg", "2.jpg", "3.jpg"],
    items: [
      { name: "Family-Style Lasagna", description: "Feeds 4–6, ready to heat", price: 42 },
      { name: "Roast Chicken", description: "Brined, herb-stuffed", price: 28 },
      { name: "Seasonal Soup (quart)", description: "Chef's daily, served chilled or hot", price: 14 },
    ],
  },
};

export const SEED_CATEGORIES = Object.keys(CATEGORY_SEEDS);

export async function seedItems(
  category: string
): Promise<{ inserted: number; skipped?: boolean; reason?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!user.email?.endsWith("@table22.com")) {
    return { inserted: 0, error: "Not authorized." };
  }

  const seed = CATEGORY_SEEDS[category];
  if (!seed) return { inserted: 0, error: `Unknown category: ${category}` };

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const { count } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partner.id)
    .is("archived_at", null);

  if ((count ?? 0) > 0) {
    return { inserted: 0, skipped: true, reason: "Partner already has items — delete existing first to re-seed." };
  }

  const n = Math.min(seed.items.length, seed.photos.length);
  const rows = seed.items.slice(0, n).map((it, idx) => ({
    partner_id: partner.id,
    name: it.name,
    description: it.description,
    photo_url: `/preview-photos/${category}/${seed.photos[idx]}`,
    default_price_cents: Math.round(it.price * 100),
  }));

  const { error } = await supabase.from("items").insert(rows);
  if (error) return { inserted: 0, error: error.message };

  revalidatePath("/dashboard/products");
  return { inserted: rows.length };
}
