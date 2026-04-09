import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  // Fetch all drops for this partner to get their IDs
  const { data: drops } = await supabase
    .from("drops")
    .select("id")
    .eq("partner_id", partner.id);

  const dropIds = drops?.map((d) => d.id) ?? [];

  // Fetch all orders across those drops
  const { data: orders } = dropIds.length
    ? await supabase
        .from("orders")
        .select("customer_name, customer_email, customer_phone, total_cents")
        .in("drop_id", dropIds)
    : { data: [] };

  // Aggregate by email
  const customerMap = new Map<
    string,
    { name: string; email: string; phone: string | null; orderCount: number; totalCents: number }
  >();

  for (const o of orders ?? []) {
    const existing = customerMap.get(o.customer_email);
    if (existing) {
      existing.orderCount += 1;
      existing.totalCents += o.total_cents;
    } else {
      customerMap.set(o.customer_email, {
        name: o.customer_name,
        email: o.customer_email,
        phone: o.customer_phone,
        orderCount: 1,
        totalCents: o.total_cents,
      });
    }
  }

  const customers = Array.from(customerMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="px-8 py-10 space-y-6">
      <div>
        <PageHeader title="Customers" />
        <p className="mt-1 text-size-2 text-neutral-10">{customers.length} unique customers from orders</p>
      </div>

      {customers.length === 0 ? (
        <p className="text-size-2 text-neutral-10">No customers yet — they'll appear here once orders come in.</p>
      ) : (
        <div className="border border-neutral-6 rounded-4 overflow-hidden">
          <table className="w-full text-size-2">
            <thead className="bg-neutral-2 border-b border-neutral-6">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Name</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Email</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Phone</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-11">Orders</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-11">Total spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-6">
              {customers.map((c) => (
                <tr key={c.email} className="bg-surface hover:bg-neutral-2 transition-colors">
                  <td className="px-4 py-3 text-neutral-12 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-neutral-11">{c.email}</td>
                  <td className="px-4 py-3 text-neutral-11">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-neutral-12">{c.orderCount}</td>
                  <td className="px-4 py-3 text-right text-neutral-12">
                    ${(c.totalCents / 100).toFixed(2)}
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
