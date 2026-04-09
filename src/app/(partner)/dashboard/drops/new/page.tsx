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

  return <NewDropForm userId={user.id} />;
}
