import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug")
    .eq("user_id", user.id)
    .single();

  const { data: activeDrops } = partner ? await supabase
    .from("drops")
    .select("id, name, slug")
    .eq("partner_id", partner.id)
    .in("state", ["orders_open", "pickup_open"])
    .order("order_window_starts_at", { ascending: false })
    .limit(5) : { data: [] };

  return (
    <div className="flex min-h-screen">
      <Sidenav
        partnerSlug={partner?.slug ?? ""}
        activeDrops={(activeDrops ?? []).map((d) => ({ id: d.id, name: d.name, slug: d.slug }))}
      />
      <main className="flex-1 bg-white">{children}</main>
    </div>
  );
}
