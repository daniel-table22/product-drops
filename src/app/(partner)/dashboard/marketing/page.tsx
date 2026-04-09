import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MarketingClient } from "./marketing-client";

export default async function MarketingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("business_name, slug")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  return <MarketingClient businessName={partner.business_name} partnerSlug={partner.slug} />;
}
