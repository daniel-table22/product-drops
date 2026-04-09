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

  await supabase
    .from("drops")
    .update({
      name,
      description,
      order_window_starts_at: new Date(order_window_starts_at).toISOString(),
      order_window_ends_at: new Date(order_window_ends_at).toISOString(),
      pickup_window_starts_at: new Date(pickup_window_starts_at).toISOString(),
      pickup_window_ends_at: new Date(pickup_window_ends_at).toISOString(),
    })
    .eq("id", id);

  revalidatePath(`/dashboard/drops/${id}`);
  revalidatePath("/dashboard/drops");
  redirect(`/dashboard/drops/${id}`);
}
