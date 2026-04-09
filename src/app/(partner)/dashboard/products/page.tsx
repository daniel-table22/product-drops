import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductsClient } from "./products-client";
import { PageHeader } from "@/components/page-header";

export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("partner_id", partner.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="px-8 py-10 space-y-6">
      <PageHeader title="Products" />
      <ProductsClient items={items ?? []} userId={user.id} />
    </div>
  );
}
