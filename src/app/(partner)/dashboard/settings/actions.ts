"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function toggleSmsTestMode(testMode: boolean) {
  const supabase = createServiceClient();
  await supabase
    .from("system_settings")
    .update({ sms_test_mode: testMode })
    .eq("id", true);
  revalidatePath("/dashboard/settings");
}

export async function toggleUiTestMode(testMode: boolean) {
  const supabase = createServiceClient();
  await supabase
    .from("system_settings")
    .update({ ui_test_mode: testMode })
    .eq("id", true);
  revalidatePath("/dashboard", "layout");
}

// Destructive: wipes all test data for the current partner. Admin + testing
// mode gated in the UI. Deletes in FK-safe order so we don't trip referential
// integrity, and uses the service client to bypass RLS on order_items /
// drop_items / pending_orders (which don't have direct partner_id columns).
export async function resetTestData(): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!user.email?.endsWith("@table22.com")) {
    return { error: "Not authorized." };
  }

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) return { error: "No partner found." };

  const service = createServiceClient();

  // 1. Drops → orders → order_items, drop_items, pending_orders
  const { data: drops } = await service
    .from("drops")
    .select("id")
    .eq("partner_id", partner.id);
  const dropIds = (drops ?? []).map((d) => d.id);

  if (dropIds.length > 0) {
    const { data: orders } = await service
      .from("orders")
      .select("id")
      .in("drop_id", dropIds);
    const orderIds = (orders ?? []).map((o) => o.id);

    if (orderIds.length > 0) {
      await service.from("order_items").delete().in("order_id", orderIds);
      await service.from("orders").delete().in("id", orderIds);
    }

    await service.from("drop_items").delete().in("drop_id", dropIds);
    await service.from("pending_orders").delete().in("drop_id", dropIds);
    await service.from("drops").delete().eq("partner_id", partner.id);
  }

  // 2. Audience
  await service.from("subscribers").delete().eq("partner_id", partner.id);
  await service.from("partner_contacts").delete().eq("partner_id", partner.id);

  // 3. Items (hard delete, not archive — seed needs a truly-empty library)
  await service.from("items").delete().eq("partner_id", partner.id);

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
