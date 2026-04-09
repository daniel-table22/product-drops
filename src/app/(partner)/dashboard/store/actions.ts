"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateStore(formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const business_name = formData.get("business_name") as string;
  const slug = formData.get("slug") as string;
  const pickup_address = formData.get("pickup_address") as string;
  const logo_url = (formData.get("logo_url") as string) || null;
  const hero_url = (formData.get("hero_url") as string) || null;
  const bg_color = (formData.get("bg_color") as string) || "#faf9f6";
  const fg_color = (formData.get("fg_color") as string) || "#000000";
  const accent_color = (formData.get("accent_color") as string) || "#501b00";
  const font_style = (formData.get("font_style") as string) || "sans";

  await supabase
    .from("partners")
    .update({ business_name, slug, pickup_address, logo_url, hero_url, bg_color, fg_color, accent_color, font_style })
    .eq("id", partner.id);

  revalidatePath("/dashboard/store");
}
