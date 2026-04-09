import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id, business_name, onboarding_state, slug")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const stripeReady = partner.onboarding_state === "stripe_ready";

  // Active drops
  const { count: activeDrops } = await supabase
    .from("drops")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partner.id)
    .in("state", ["orders_open", "pickup_open"]);

  // All drop IDs
  const { data: drops } = await supabase
    .from("drops")
    .select("id")
    .eq("partner_id", partner.id);

  const dropIds = drops?.map((d) => d.id) ?? [];

  let totalOrders = 0;
  let totalRevenueCents = 0;

  if (dropIds.length > 0) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("drop_id", dropIds);

    const { data: revenueRows } = await supabase
      .from("orders")
      .select("total_cents")
      .in("drop_id", dropIds)
      .not("state", "in", '("no_show")');

    totalOrders = count ?? 0;
    totalRevenueCents = revenueRows?.reduce((sum, r) => sum + r.total_cents, 0) ?? 0;
  }

  return (
    <div className="px-8 py-10 space-y-8">
      <div>
        <PageHeader title="Dashboard" />
        <p className="mt-1 text-size-2 text-neutral-10">Overview</p>
      </div>

      {!stripeReady && (
        <div className="rounded-4 border border-warning-6 bg-warning-2 p-4 space-y-3 max-w-lg">
          <div>
            <p className="text-size-2 font-medium text-warning-12">Connect Stripe to publish drops</p>
            <p className="mt-1 text-size-2 text-warning-11">
              You can create drafts now, but publishing requires a connected Stripe account.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard/stripe-connect">Connect Stripe</a>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        <StatCard label="Active drops" value={String(activeDrops ?? 0)} />
        <StatCard label="Total orders" value={String(totalOrders)} />
        <StatCard label="Total revenue" value={`$${(totalRevenueCents / 100).toFixed(2)}`} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-4 border border-neutral-6 bg-surface p-5 space-y-1">
      <p className="text-size-1 font-medium text-neutral-10 uppercase tracking-wider">{label}</p>
      <p className="text-size-7 font-semibold text-neutral-12">{value}</p>
    </div>
  );
}
