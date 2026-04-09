import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";

type Filter = "all" | "subscribed" | "not_subscribed";

export default async function AudiencePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterRaw } = await searchParams;
  const filter: Filter =
    filterRaw === "subscribed" ? "subscribed"
    : filterRaw === "not_subscribed" ? "not_subscribed"
    : "all";

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  let query = supabase
    .from("subscribers")
    .select("id, phone, opted_in, created_at")
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false });

  if (filter === "subscribed") query = query.eq("opted_in", true);
  if (filter === "not_subscribed") query = query.eq("opted_in", false);

  const { data: subscribers } = await query;
  const all = subscribers ?? [];

  // Counts for tab badges
  const { count: subscribedCount } = await supabase
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partner.id)
    .eq("opted_in", true);

  const { count: totalCount } = await supabase
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partner.id);

  const tabs: { label: string; value: Filter; count?: number }[] = [
    { label: "All", value: "all", count: totalCount ?? 0 },
    { label: "Subscribed", value: "subscribed", count: subscribedCount ?? 0 },
    { label: "Not subscribed", value: "not_subscribed", count: (totalCount ?? 0) - (subscribedCount ?? 0) },
  ];

  return (
    <div className="px-8 py-10 space-y-6">
      <div>
        <PageHeader title="Audience" size="large" />
        <p className="mt-1 text-size-2 text-neutral-10">
          People who have opted in to hear from you
        </p>
      </div>

      {/* Toggle tabs */}
      <div className="flex gap-1 border-b border-neutral-6">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/dashboard/customers" : `/dashboard/customers?filter=${tab.value}`}
            className={[
              "px-3 py-2 text-size-2 font-medium border-b-2 -mb-px transition-colors",
              filter === tab.value
                ? "border-neutral-12 text-neutral-12"
                : "border-transparent text-neutral-10 hover:text-neutral-12",
            ].join(" ")}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 text-size-1 text-neutral-10">{tab.count}</span>
            )}
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <p className="text-size-2 text-neutral-10">
          {filter === "all"
            ? "No one in your audience yet — they'll appear when people sign up on your storefront."
            : filter === "subscribed"
            ? "No subscribed contacts yet."
            : "Everyone is subscribed."}
        </p>
      ) : (
        <div className="border border-neutral-6 rounded-4 overflow-hidden">
          <table className="w-full text-size-2">
            <thead className="bg-neutral-2 border-b border-neutral-6">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Status</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-6">
              {all.map((s) => (
                <tr key={s.id} className="bg-surface hover:bg-neutral-2 transition-colors">
                  <td className="px-4 py-3 text-neutral-12 font-medium font-mono">{s.phone}</td>
                  <td className="px-4 py-3">
                    {s.opted_in ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-size-1 font-medium bg-[rgba(0,164,51,0.1)] text-[rgba(0,113,63,0.87)]">
                        Subscribed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-size-1 font-medium bg-neutral-3 text-neutral-10">
                        Unsubscribed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-10">
                    {new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
