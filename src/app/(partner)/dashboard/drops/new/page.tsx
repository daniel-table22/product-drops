import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NewDropForm } from "./new-drop-form";

export default async function NewDropPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = user.email?.endsWith("@table22.com") ?? false;

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const [{ data: libraryItems }, { data: settings }] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, description, photo_url, default_price_cents")
      .is("archived_at", null)
      .order("name"),
    isAdmin
      ? createServiceClient().from("system_settings").select("ui_test_mode").single()
      : Promise.resolve({ data: null }),
  ]);

  const uiTestMode = (settings as { ui_test_mode?: boolean } | null)?.ui_test_mode ?? false;
  const showAutofill = isAdmin && uiTestMode;

  return <NewDropForm libraryItems={libraryItems ?? []} userId={user.id} showAutofill={showAutofill} />;
}
