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
