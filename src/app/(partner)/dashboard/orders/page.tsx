import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderStateBadge } from "@/components/state-badge";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ drop?: string }>;
}) {
  const supabase = await createClient();
  const { drop: dropFilter } = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const { data: drops } = await supabase
    .from("drops")
    .select("id, name")
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false });

  const dropIds = drops?.map((d) => d.id) ?? [];

  const targetDropIds = dropFilter
    ? dropIds.filter((id) => id === dropFilter)
    : dropIds;

  const { data: orders } = targetDropIds.length
    ? await supabase
        .from("orders")
        .select("*, order_items(*)")
        .in("drop_id", targetDropIds)
        .order("paid_at", { ascending: false })
    : { data: [] };

  const dropNameMap = new Map(drops?.map((d) => [d.id, d.name]) ?? []);

  return (
    <div className="px-8 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-size-7 font-semibold text-neutral-12 tracking-tight">Orders</h1>
        <p className="text-size-2 text-neutral-10">{orders?.length ?? 0} orders</p>
      </div>

      {/* Drop filter */}
      {drops && drops.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/dashboard/orders"
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-size-1 font-medium transition-colors",
              !dropFilter ? "bg-neutral-12 text-neutral-1" : "bg-neutral-3 text-neutral-11 hover:bg-neutral-4",
            ].join(" ")}
          >
            All drops
          </a>
          {drops.map((d) => (
            <a
              key={d.id}
              href={`/dashboard/orders?drop=${d.id}`}
              className={[
                "inline-flex items-center rounded-full px-3 py-1 text-size-1 font-medium transition-colors",
                dropFilter === d.id
                  ? "bg-neutral-12 text-neutral-1"
                  : "bg-neutral-3 text-neutral-11 hover:bg-neutral-4",
              ].join(" ")}
            >
              {d.name}
            </a>
          ))}
        </div>
      )}

      {!orders || orders.length === 0 ? (
        <p className="text-size-2 text-neutral-10">No orders yet.</p>
      ) : (
        <div className="border border-neutral-6 rounded-4 overflow-hidden">
          <table className="w-full text-size-2">
            <thead className="bg-neutral-2 border-b border-neutral-6">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Drop</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Items</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-11">Total</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Status</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Paid at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-6">
              {orders.map((order) => (
                <tr key={order.id} className="bg-surface hover:bg-neutral-2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-12">{order.customer_name}</p>
                    <p className="text-neutral-10">{order.customer_email}</p>
                    {order.customer_phone && (
                      <p className="text-neutral-10">{order.customer_phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-11">
                    <a
                      href={`/dashboard/drops/${order.drop_id}`}
                      className="hover:text-neutral-12 hover:underline"
                    >
                      {dropNameMap.get(order.drop_id) ?? "—"}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-neutral-11">
                    {order.order_items
                      .map((oi) => `${oi.qty}× ${oi.item_name}`)
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-neutral-12">
                    ${(order.total_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStateBadge state={order.state} />
                  </td>
                  <td className="px-4 py-3 text-neutral-10">
                    {new Date(order.paid_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
