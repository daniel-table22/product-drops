import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Sidenav } from "@/components/sidenav";

export const metadata: Metadata = { title: "Admin" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = user.email?.endsWith("@table22.com") ?? false;

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug, logo_url")
    .eq("user_id", user.id)
    .single();

  const [{ data: activeDrops }, { data: settings }] = await Promise.all([
    partner ? supabase
      .from("drops")
      .select("id, name, slug")
      .eq("partner_id", partner.id)
      .in("state", ["orders_open", "pickup_open"])
      .order("order_window_starts_at", { ascending: false })
      .limit(5) : Promise.resolve({ data: [] }),
    isAdmin
      ? createServiceClient().from("system_settings").select("ui_test_mode").single()
      : Promise.resolve({ data: null }),
  ]);

  const uiTestMode = (settings as { ui_test_mode?: boolean } | null)?.ui_test_mode ?? false;

  return (
    <div className="flex min-h-screen">
      <Sidenav
        partnerSlug={partner?.slug ?? ""}
        logoUrl={partner?.logo_url ?? null}
        activeDrops={(activeDrops ?? []).map((d) => ({ id: d.id, name: d.name, slug: d.slug }))}
        isAdmin={isAdmin}
        uiTestMode={uiTestMode}
      />
      <main className="flex-1 bg-white">{children}</main>
    </div>
  );
}
