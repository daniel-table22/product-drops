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
    photos: [
      "5Aop72ShQHGGGOLy0t7JLg.jpeg",
      "6VFsROUVS2mDLFhgdYcKvQ.png",
      "6riUhak2SuqoreAnSHkoGA.jpeg",
      "7F3T8p-zR_ihH3VEsh6HkA.png",
      "a3ln2zaiQSCNBo-bB7fbpA.jpeg",
    ],
    items: [
      { name: "Sourdough Loaf", description: "24-hour naturally leavened, dark crust", price: 10 },
      { name: "Butter Croissant", description: "Hand-laminated with European butter", price: 5 },
      { name: "Cinnamon Roll", description: "Cardamom-spiced, morning-baked", price: 6 },
      { name: "Morning Bun", description: "Flaky, sugar-crusted, orange zest", price: 5 },
      { name: "Chocolate Chip Cookie", description: "Brown butter, sea salt", price: 4 },
    ],
  },
  butcher: {
    photos: [
      "butcher1.jpg",
      "butcher2.jpeg",
      "butcher3.jpg",
      "premium_photo-1722686466966-d4290d91faab.jpeg",
      "premium_photo-1726869690878-85cd6cab7437.jpeg",
    ],
    items: [
      { name: "Dry-Aged Ribeye", description: "45-day dry-aged, 16oz", price: 38 },
      { name: "Pork Ribs", description: "Heritage breed, bone-in rack", price: 24 },
      { name: "House Sausage", description: "Chef's selection, 1lb", price: 14 },
      { name: "Duck Breast", description: "Pekin, skin scored", price: 18 },
      { name: "Bone Broth", description: "48-hour simmer, quart", price: 12 },
    ],
  },
  alcohol: {
    photos: [
      "Screen-Shot-2022-09-15-at-1.58.19-PM.png",
      "Unknown-8.jpg.webp",
      "Woody-Creek-Mary-s-Select-Gin-ForWhiskeyLovers-1.png.webp",
      "spirit-works-gin.jpg.webp",
      "suntory-suntory-roku-gin-750ml.jpg",
    ],
    items: [
      { name: "Small Batch Bourbon", description: "Rye-forward, 750ml", price: 48 },
      { name: "Mezcal Espadín", description: "Artisanal, Oaxaca", price: 52 },
      { name: "Amaro Nonino", description: "Bittersweet digestif", price: 42 },
      { name: "Gin Botanique", description: "Juniper-forward, local botanicals", price: 38 },
      { name: "Single Malt Whisky", description: "12-year Highland", price: 68 },
    ],
  },
  wine: {
    photos: [
      "21F6D2C8-B53E-45B9-ABB9-F77B0C802DB5_1184x1184.jpg",
      "4D69A66E-3862-4F24-913D-58AABC3F6668_1184x1184.jpg",
      "wine1.jpeg",
      "wine2.jpeg",
      "wine3.jpeg",
    ],
    items: [
      { name: "Natural Orange Wine", description: "Skin-contact, unfiltered", price: 34 },
      { name: "Pét-Nat Rosé", description: "Ancestral method, bubbly", price: 28 },
      { name: "Biodynamic Red", description: "Earthy, medium-bodied", price: 32 },
      { name: "Estate Chardonnay", description: "Lightly oaked, Sonoma", price: 38 },
      { name: "Amphora Skin Contact", description: "Unconventional, complex", price: 44 },
    ],
  },
  cheese: {
    photos: [
      "camembert.jpeg",
      "cammebert.jpeg",
      "cheese1.jpg",
      "cheese2.jpg",
      "photo-1668094497457-29f4bd775c95.jpeg",
    ],
    items: [
      { name: "Aged Comté", description: "24-month, Jura mountains", price: 18 },
      { name: "Camembert", description: "Bloomy rind, creamy center", price: 14 },
      { name: "Blue Stilton", description: "English classic, 8oz wedge", price: 22 },
      { name: "Burrata", description: "Hand-pulled, delivered fresh", price: 16 },
      { name: "Aged Gruyère", description: "18-month cave-aged", price: 20 },
    ],
  },
  provisions: {
    photos: [
      "5Aop72ShQHGGGOLy0t7JLg.jpeg",
      "6VFsROUVS2mDLFhgdYcKvQ.png",
      "6riUhak2SuqoreAnSHkoGA.jpeg",
      "7F3T8p-zR_ihH3VEsh6HkA.png",
      "9d3ada90-4914-493d-af7e-27183804e516.png",
    ],
    items: [
      { name: "Single-Origin Olive Oil", description: "Cold-pressed, Sicilian", price: 32 },
      { name: "Flaky Sea Salt", description: "Maldon, 8oz tin", price: 8 },
      { name: "Wild Honey", description: "Raw, unfiltered, 12oz", price: 16 },
      { name: "Fermented Hot Sauce", description: "Small batch, habanero", price: 12 },
      { name: "Stone-Ground Grits", description: "Heirloom corn, 2lb bag", price: 10 },
    ],
  },
  restaurant: {
    photos: [
      "Unknown.jpeg",
      "rintaro bento01.jpg",
      "rintaro bento03.jpg",
      "rintaro bento04.jpg",
      "unnamed-5.jpg",
    ],
    items: [
      { name: "Family-Style Lasagna", description: "Feeds 4–6, ready to heat", price: 42 },
      { name: "Roast Chicken", description: "Brined, herb-stuffed", price: 28 },
      { name: "Seasonal Soup (quart)", description: "Chef's daily, served chilled or hot", price: 14 },
      { name: "Chef's Bento Box", description: "Seasonal selection, single serving", price: 22 },
      { name: "House-Made Pasta", description: "Fresh, 1lb, sauce included", price: 18 },
    ],
  },
};

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
    photo_url: `/preview-photos/${category}/${encodeURIComponent(seed.photos[idx])}`,
    default_price_cents: Math.round(it.price * 100),
  }));

  const { error } = await supabase.from("items").insert(rows);
  if (error) return { inserted: 0, error: error.message };

  revalidatePath("/dashboard/products");
  return { inserted: rows.length };
}
