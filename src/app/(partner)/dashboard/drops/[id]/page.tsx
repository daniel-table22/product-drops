import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DropDetailClient } from "./drop-detail-client";

export default async function DropDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug, onboarding_state, business_name")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const { data: drop } = await supabase
    .from("drops")
    .select("*")
    .eq("id", id)
    .eq("partner_id", partner.id)
    .single();

  if (!drop) notFound();

  const { data: dropItems } = await supabase
    .from("drop_items")
    .select("*, item:items(*)")
    .eq("drop_id", id);

  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("drop_id", id)
    .order("paid_at", { ascending: false });

  // Items in library not yet attached to this drop
  const attachedItemIds = new Set(dropItems?.map((di) => di.item_id) ?? []);
  const { data: allItems } = await supabase
    .from("items")
    .select("*")
    .eq("partner_id", partner.id)
    .is("archived_at", null);

  const libraryItems = (allItems ?? []).filter((item) => !attachedItemIds.has(item.id));

  const isAdmin = user.email?.endsWith("@table22.com") ?? false;

  const [{ count: subscriberCount }, { data: settings }] = await Promise.all([
    supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partner.id)
      .eq("opted_in", true),
    isAdmin
      ? createServiceClient().from("system_settings").select("ui_test_mode").single()
      : Promise.resolve({ data: null }),
  ]);

  const uiTestMode = (settings as { ui_test_mode?: boolean } | null)?.ui_test_mode ?? false;

  return (
    <DropDetailClient
      drop={drop}
      dropItems={(dropItems ?? []) as any}
      orders={(orders ?? []) as any}
      libraryItems={libraryItems}
      isStripeReady={partner.onboarding_state === "stripe_ready"}
      partnerSlug={partner.slug}
      subscriberCount={subscriberCount ?? 0}
      businessName={partner.business_name}
      userId={user.id}
      isAdmin={isAdmin}
      uiTestMode={uiTestMode}
    />
  );
}
