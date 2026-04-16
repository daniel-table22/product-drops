export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { DropStateBadge } from "@/components/state-badge";
import { DeleteDropButton } from "./delete-drop-button";
import { NewDropButton } from "./new-drop-button";
import { DropRow, DropActionsCell } from "./drop-row";
import { SectionIntro } from "@/components/section-intro";

export default async function DropsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const { data: drops } = await supabase
    .from("drops")
    .select("*")
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false });

  const { count: subscriberCount } = await supabase
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partner.id)
    .eq("opted_in", true);

  // Order counts per drop
  const dropIds = (drops ?? []).map((d) => d.id);
  const { data: orderCounts } = dropIds.length > 0
    ? await supabase
        .from("orders")
        .select("drop_id")
        .in("drop_id", dropIds)
        .neq("state", "no_show")
    : { data: [] };

  const orderCountByDrop = (orderCounts ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.drop_id] = (acc[o.drop_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="px-8 py-10 space-y-6">
      <PageHeader title="Drops" size="large" actions={<NewDropButton />} />

      <SectionIntro
        storageKey="intro_dismissed_drops"
        illustration="/illustrations/drops-intro.png"
        title="Schedule drops, sell out fast"
        description="Create time-limited drops with your menu, set an order window, and let customers buy before pickup day."
        buttonLabel="Show me"
      >
        {!drops || drops.length === 0 ? (
          <p className="text-size-2 text-neutral-10">No drops yet. Create your first drop to get started.</p>
        ) : (
          <div className="border border-neutral-6 rounded-4 overflow-hidden">
            <table className="w-full text-size-2">
              <thead className="bg-neutral-2 border-b border-neutral-6">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-neutral-11">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-11 w-36">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-11">Order window</th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-11">Pickup window</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-11">Orders / audience</th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-11"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-6">
                {drops.map((drop) => (
                  <DropRow key={drop.id} href={`/dashboard/drops/${drop.id}`} className="bg-surface hover:bg-neutral-2 transition-colors">
                    <td className="px-4 py-3 font-medium text-neutral-12">
                      {drop.name}
                    </td>
                    <td className="px-4 py-3 w-36">
                      <DropStateBadge state={drop.state} />
                    </td>
                    <td className="px-4 py-3 text-neutral-10">
                      {new Date(drop.order_window_starts_at).toLocaleDateString()} →{" "}
                      {new Date(drop.order_window_ends_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-neutral-10">
                      {new Date(drop.pickup_window_starts_at).toLocaleDateString()} →{" "}
                      {new Date(drop.pickup_window_ends_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-12 font-mono text-size-2">
                      {orderCountByDrop[drop.id] ?? 0} / {subscriberCount ?? 0}
                    </td>
                    <DropActionsCell>
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/s/${partner.slug}/d/${drop.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center h-7 px-3 rounded-3 text-size-1 font-medium text-neutral-11 hover:bg-neutral-3 hover:text-neutral-12 transition-colors"
                        >
                          Visit ↗
                        </a>
                        <DeleteDropButton id={drop.id} name={drop.name} state={drop.state} />
                      </div>
                    </DropActionsCell>
                  </DropRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionIntro>
    </div>
  );
}
