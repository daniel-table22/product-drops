import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { DropStateBadge } from "@/components/state-badge";
import { DeleteDropButton } from "./delete-drop-button";

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

  return (
    <div className="px-8 py-10 space-y-6">
      <PageHeader title="Drops" actions={<Button asChild size="sm"><a href="/dashboard/drops/new">New drop</a></Button>} />

      {!drops || drops.length === 0 ? (
        <p className="text-size-2 text-neutral-10">No drops yet. Create your first drop to get started.</p>
      ) : (
        <div className="border border-neutral-6 rounded-4 overflow-hidden">
          <table className="w-full text-size-2">
            <thead className="bg-neutral-2 border-b border-neutral-6">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Name</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Status</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Order window</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Pickup window</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-11"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-6">
              {drops.map((drop) => (
                <tr key={drop.id} className="bg-surface hover:bg-neutral-2 transition-colors">
                  <td className="px-4 py-3">
                    <a
                      href={`/dashboard/drops/${drop.id}`}
                      className="font-medium text-neutral-12 hover:underline"
                    >
                      {drop.name}
                    </a>
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button asChild size="sm" variant="ghost">
                        <a href={`/dashboard/drops/${drop.id}`}>View</a>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <a href={`/dashboard/drops/${drop.id}/edit`}>Edit</a>
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <a
                          href={`/s/${partner.slug}/d/${drop.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Visit ↗
                        </a>
                      </Button>
                      <DeleteDropButton id={drop.id} name={drop.name} />
                    </div>
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
