import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ProductsClient } from "./products-client";
import { PageHeader } from "@/components/page-header";
import { SectionIntro } from "@/components/section-intro";

export default async function ProductsPage() {
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

  const [{ data: items }, { data: settings }] = await Promise.all([
    supabase
      .from("items")
      .select("*")
      .eq("partner_id", partner.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    isAdmin
      ? createServiceClient().from("system_settings").select("ui_test_mode").single()
      : Promise.resolve({ data: null }),
  ]);

  const uiTestMode = (settings as { ui_test_mode?: boolean } | null)?.ui_test_mode ?? false;

  return (
    <div className="px-8 py-10 space-y-6">
      <PageHeader title="Products" size="large" />
      <SectionIntro
        storageKey="intro_dismissed_items"
        illustration="/illustrations/items-intro.png"
        title="Build your menu"
        description="Add the items you sell — names, photos, and descriptions. You'll pick from these when building a drop."
      >
        <ProductsClient items={items ?? []} userId={user.id} isAdmin={isAdmin} uiTestMode={uiTestMode} />
      </SectionIntro>
    </div>
  );
}
