import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewDropForm } from "./new-drop-form";

export default async function NewDropPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const { data: libraryItems } = await supabase
    .from("items")
    .select("id, name, description, photo_url, default_price_cents")
    .is("archived_at", null)
    .order("name");

  return <NewDropForm libraryItems={libraryItems ?? []} />;
}
