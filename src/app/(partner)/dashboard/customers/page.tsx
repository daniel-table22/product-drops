import { redirect } from "next/navigation";
import Link from "next/link";
import { Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ImportCsvButton } from "./import-button";

type Filter = "all" | "subscribed" | "not_subscribed";

type Row = {
  key: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  from_csv: boolean;
  subscribed: boolean;       // true = in subscribers table with opted_in=true
  is_contact_only: boolean;  // true = only in partner_contacts, not a subscriber
  created_at: string;
  dropCount: number;
};

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

  const [
    { data: subscribers },
    { data: contacts },
    { data: partnerDrops },
  ] = await Promise.all([
    supabase
      .from("subscribers")
      .select("id, phone, opted_in, from_csv, source, name, email, created_at")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_contacts")
      .select("id, phone, email, name, imported_at")
      .eq("partner_id", partner.id)
      .order("imported_at", { ascending: false }),
    supabase
      .from("drops")
      .select("id")
      .eq("partner_id", partner.id),
  ]);

  const subs = subscribers ?? [];
  const subscriberEmails = new Set(
    subs.map((s) => s.email?.toLowerCase()).filter(Boolean) as string[]
  );

  // Dedupe contacts: skip ones whose email is already on a subscriber
  const contactsOnly = (contacts ?? []).filter(
    (c) => !c.email || !subscriberEmails.has(c.email.toLowerCase())
  );

  // Count drops ordered per phone
  const dropIds = (partnerDrops ?? []).map((d) => d.id);
  const phones = subs.map((s) => s.phone);
  const dropCountByPhone: Record<string, number> = {};

  if (dropIds.length > 0 && phones.length > 0) {
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_phone, drop_id")
      .in("drop_id", dropIds)
      .in("customer_phone", phones)
      .neq("state", "no_show");

    const dropsPerPhone: Record<string, Set<string>> = {};
    for (const o of orders ?? []) {
      if (!o.customer_phone) continue;
      if (!dropsPerPhone[o.customer_phone]) dropsPerPhone[o.customer_phone] = new Set();
      dropsPerPhone[o.customer_phone].add(o.drop_id);
    }
    for (const [phone, drops] of Object.entries(dropsPerPhone)) {
      dropCountByPhone[phone] = drops.size;
    }
  }

  const subscriberRows: Row[] = subs.map((s) => ({
    key: `sub-${s.id}`,
    phone: s.phone,
    email: s.email,
    name: s.name,
    // Treat legacy source='crm_csv' as from_csv for display
    from_csv: s.from_csv || s.source === "crm_csv",
    subscribed: s.opted_in,
    is_contact_only: false,
    created_at: s.created_at,
    dropCount: dropCountByPhone[s.phone] ?? 0,
  }));

  const contactRows: Row[] = contactsOnly.map((c) => ({
    key: `contact-${c.id}`,
    phone: c.phone,
    email: c.email,
    name: c.name,
    from_csv: true,
    subscribed: false,
    is_contact_only: true,
    created_at: c.imported_at,
    dropCount: 0,
  }));

  const allRows = [...subscriberRows, ...contactRows].sort(
    (a, b) => b.created_at.localeCompare(a.created_at)
  );

  const subscribedCount = subscriberRows.filter((r) => r.subscribed).length;
  const notSubscribedCount = subscriberRows.filter((r) => !r.subscribed).length + contactRows.length;
  const totalCount = allRows.length;

  const filtered = filter === "subscribed"
    ? allRows.filter((r) => r.subscribed)
    : filter === "not_subscribed"
    ? allRows.filter((r) => !r.subscribed)
    : allRows;

  const tabs: { label: string; value: Filter; count: number }[] = [
    { label: "All", value: "all", count: totalCount },
    { label: "Subscribed", value: "subscribed", count: subscribedCount },
    { label: "Not subscribed", value: "not_subscribed", count: notSubscribedCount },
  ];

  return (
    <div className="px-8 py-10 space-y-6">
      <div>
        <PageHeader title="Audience" size="large" actions={<ImportCsvButton />} />
        <p className="mt-1 text-size-2 text-neutral-10">
          Contacts from your CRM and people who signed up on your storefront
        </p>
      </div>

      {/* How-it-works callout */}
      <div className="rounded-4 border border-neutral-6 bg-neutral-2 p-4 max-w-3xl">
        <div className="flex gap-3">
          <Info size={16} className="shrink-0 mt-0.5 text-neutral-10" />
          <div className="space-y-2 text-size-2 text-neutral-11">
            <p className="font-medium text-neutral-12">Two types of people live here:</p>
            <ul className="space-y-1">
              <li><span className="font-medium text-neutral-12">Subscribers</span> — they opted in on your storefront and will get SMS when you publish drops.</li>
              <li><span className="font-medium text-neutral-12">Contacts</span> — you imported them from a CSV (e.g. your Table22 subscriber list). They haven't opted in yet — they only become subscribers if they sign up on your storefront.</li>
            </ul>
            <p className="text-neutral-10">When someone places an order, we match their email back to your CSV — so you can see which of your subscribers originally came from your customer list.</p>
          </div>
        </div>
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
            <span className="ml-1.5 text-size-1 text-neutral-10">{tab.count}</span>
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-size-2 text-neutral-10">
          {filter === "all"
            ? "No contacts yet — import from your CRM or wait for people to sign up on your storefront."
            : filter === "subscribed"
            ? "No subscribed contacts yet."
            : "No unsubscribed contacts."}
        </p>
      ) : (
        <div className="border border-neutral-6 rounded-4 overflow-hidden">
          <table className="w-full text-size-2">
            <thead className="bg-neutral-2 border-b border-neutral-6">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Email</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Name</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Source</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Status</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-11">Drops</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-6">
              {filtered.map((r) => (
                <tr key={r.key} className="bg-surface hover:bg-neutral-2 transition-colors">
                  <td className="px-4 py-3 text-neutral-12 font-medium font-mono">
                    {r.phone ?? <span className="text-neutral-7">—</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-10">
                    {r.email ?? <span className="text-neutral-7">—</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-12">
                    {r.name ?? <span className="text-neutral-7">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.from_csv ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-size-1 font-medium bg-accent-3 text-accent-11">
                        From CSV
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-size-1 font-medium bg-[rgba(0,164,51,0.1)] text-[rgba(0,113,63,0.87)]">
                        Organic
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.subscribed ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-size-1 font-medium bg-[rgba(0,164,51,0.1)] text-[rgba(0,113,63,0.87)]">
                        Subscribed
                      </span>
                    ) : r.is_contact_only ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-size-1 font-medium bg-neutral-3 text-neutral-10">
                        Contact only
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-size-1 font-medium bg-neutral-3 text-neutral-10">
                        Not subscribed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-neutral-12">
                    {r.dropCount > 0 ? r.dropCount : <span className="text-neutral-7">—</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-10">
                    {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
