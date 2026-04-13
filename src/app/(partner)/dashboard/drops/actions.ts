"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type ItemEntry = { id: string; priceCents: number; qty: number };

export async function createDrop(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
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
  const order_window_starts_at = formData.get("order_window_starts_at") as string;
  const order_window_ends_at = formData.get("order_window_ends_at") as string;
  const pickup_window_starts_at = formData.get("pickup_window_starts_at") as string;
  const pickup_window_ends_at = formData.get("pickup_window_ends_at") as string;
  const itemsJson = (formData.get("items") as string) || "[]";
  const announceDaysRaw = formData.get("announce_days_before") as string;
  const reminderDaysRaw = formData.get("reminder_days_before") as string;
  const announce_days_before = announceDaysRaw ? parseInt(announceDaysRaw) : null;
  const reminder_days_before = reminderDaysRaw ? parseInt(reminderDaysRaw) : null;

  if (!name?.trim()) return { error: "Drop name is required." };
  if (!order_window_starts_at || !order_window_ends_at) return { error: "Order window dates are required." };
  if (!pickup_window_starts_at || !pickup_window_ends_at) return { error: "Pickup window dates are required." };

  if (new Date(order_window_ends_at) <= new Date(order_window_starts_at)) {
    return { error: "Order window end must be after its start." };
  }
  if (new Date(pickup_window_ends_at) <= new Date(pickup_window_starts_at)) {
    return { error: "Pickup window end must be after its start." };
  }

  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Date.now()}`;

  const { data: drop, error } = await supabase
    .from("drops")
    .insert({
      partner_id: partner.id,
      name,
      description,
      slug,
      order_window_starts_at: new Date(order_window_starts_at).toISOString(),
      order_window_ends_at: new Date(order_window_ends_at).toISOString(),
      pickup_window_starts_at: new Date(pickup_window_starts_at).toISOString(),
      pickup_window_ends_at: new Date(pickup_window_ends_at).toISOString(),
      announce_days_before,
      reminder_days_before,
    })
    .select("id")
    .single();

  if (error || !drop) {
    return { error: error?.message ?? "Could not create drop. Please try again." };
  }

  // Insert items
  let items: ItemEntry[] = [];
  try { items = JSON.parse(itemsJson); } catch { /* ignore */ }

  for (const item of items.filter((i) => i.qty > 0)) {
    await supabase.from("drop_items").insert({
      drop_id: drop.id,
      item_id: item.id,
      price_cents: item.priceCents,
      total_qty: item.qty,
      available_qty: item.qty,
    });
  }

  revalidatePath("/dashboard/drops");
  redirect(`/dashboard/drops/${drop.id}`);
}

export async function deleteDrop(id: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: drop } = await supabase
    .from("drops")
    .select("partner_id, partners!inner(user_id)")
    .eq("id", id)
    .single();

  if (!drop || (drop.partners as any).user_id !== user.id) redirect("/dashboard/drops");

  await supabase.from("drop_items").delete().eq("drop_id", id);
  await supabase.from("drops").delete().eq("id", id);

  revalidatePath("/dashboard/drops");
  redirect("/dashboard/drops");
}

// ─── Preset drops (dev / demo shortcuts) ─────────────────────────────────────

const PRESET_ADJECTIVES = ["Special", "Magical", "Exclusive", "Glorious", "Secret", "Legendary", "Limited", "Golden"];
const PRESET_NOUNS = ["Bake", "Treats", "Batch", "Collection", "Drop", "Bundle", "Haul", "Basket"];
const PRESET_DESCRIPTIONS = [
  "Handcrafted in small batches — fresh, local, and gone by noon.",
  "Our most requested recipes, made with love and available for one day only.",
  "Limited quantities of the good stuff. Order early or miss out.",
  "Seasonal ingredients, familiar favorites, baked fresh this morning.",
];

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function addH(d: Date, h: number): Date { return new Date(d.getTime() + h * 3_600_000); }

export type DropPreset = "preload" | "orders_closed" | "pickup_open" | "pickup_closed";

export async function createPresetDrop(preset: DropPreset) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners").select("id").eq("user_id", user.id).single();
  if (!partner) redirect("/onboarding");

  const { data: items } = await supabase
    .from("items").select("id, default_price_cents")
    .eq("partner_id", partner.id).is("archived_at", null);

  const now = new Date();
  const windows = {
    preload:       { order_window_starts_at: addH(now, -1),  order_window_ends_at: addH(now, 23),  pickup_window_starts_at: addH(now, 72),  pickup_window_ends_at: addH(now, 80), state: "orders_open"   as const },
    orders_closed: { order_window_starts_at: addH(now, -24), order_window_ends_at: addH(now, -2),  pickup_window_starts_at: addH(now, 4),   pickup_window_ends_at: addH(now, 12), state: "orders_closed" as const },
    pickup_open:   { order_window_starts_at: addH(now, -48), order_window_ends_at: addH(now, -6),  pickup_window_starts_at: addH(now, -1),  pickup_window_ends_at: addH(now, 6),  state: "pickup_open"   as const },
    pickup_closed: { order_window_starts_at: addH(now, -72), order_window_ends_at: addH(now, -24), pickup_window_starts_at: addH(now, -12), pickup_window_ends_at: addH(now, -1), state: "pickup_closed" as const },
  }[preset];

  const name = `${pickRandom(PRESET_ADJECTIVES)} ${pickRandom(PRESET_NOUNS)}`;
  const slug = `${slugify(name)}-${Date.now()}`;

  const { data: drop, error } = await supabase
    .from("drops")
    .insert({
      partner_id: partner.id,
      name,
      description: pickRandom(PRESET_DESCRIPTIONS),
      slug,
      order_window_starts_at:  windows.order_window_starts_at.toISOString(),
      order_window_ends_at:    windows.order_window_ends_at.toISOString(),
      pickup_window_starts_at: windows.pickup_window_starts_at.toISOString(),
      pickup_window_ends_at:   windows.pickup_window_ends_at.toISOString(),
      state: windows.state,
      published_at: now.toISOString(),
    })
    .select("id").single();

  if (error || !drop) return;

  if (items && items.length > 0) {
    const picks = [...items].sort(() => Math.random() - 0.5).slice(0, Math.min(3, items.length));
    for (const item of picks) {
      const qty = Math.floor(Math.random() * 21) + 10;
      await supabase.from("drop_items").insert({
        drop_id: drop.id, item_id: item.id,
        price_cents: item.default_price_cents, total_qty: qty, available_qty: qty,
      });
    }
  }

  revalidatePath("/dashboard/drops");
  redirect(`/dashboard/drops/${drop.id}`);
}

// ─────────────────────────────────────────────────────────────────────────────

export async function updateDrop(id: string, formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const order_window_starts_at = formData.get("order_window_starts_at") as string;
  const order_window_ends_at = formData.get("order_window_ends_at") as string;
  const pickup_window_starts_at = formData.get("pickup_window_starts_at") as string;
  const pickup_window_ends_at = formData.get("pickup_window_ends_at") as string;
  const announceDaysRaw = formData.get("announce_days_before") as string;
  const reminderDaysRaw = formData.get("reminder_days_before") as string;
  const announce_days_before = announceDaysRaw ? parseInt(announceDaysRaw) : null;
  const reminder_days_before = reminderDaysRaw ? parseInt(reminderDaysRaw) : null;

  await supabase
    .from("drops")
    .update({
      name,
      description,
      order_window_starts_at: new Date(order_window_starts_at).toISOString(),
      order_window_ends_at: new Date(order_window_ends_at).toISOString(),
      pickup_window_starts_at: new Date(pickup_window_starts_at).toISOString(),
      pickup_window_ends_at: new Date(pickup_window_ends_at).toISOString(),
      announce_days_before,
      reminder_days_before,
    })
    .eq("id", id);

  revalidatePath(`/dashboard/drops/${id}`);
  revalidatePath("/dashboard/drops");
  redirect(`/dashboard/drops/${id}`);
}
