import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StoreEditor } from "./store-editor";

export default async function StorePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  return <StoreEditor partner={partner} userId={user.id} />;
}
