"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

type ContactInput = {
  name?: string;
  email?: string;
  phone?: string;
};

export async function importContacts(
  contacts: ContactInput[]
): Promise<{ imported: number; skipped: number; error?: string }> {
  if (contacts.length === 0) return { imported: 0, skipped: 0 };

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  // Normalize phones (optional) and require at least email or phone per row
  const normalized = contacts
    .map((c) => ({
      name: c.name?.trim() || null,
      email: c.email?.trim().toLowerCase() || null,
      phone: c.phone ? normalizePhone(c.phone) : null,
    }))
    .filter((c) => c.email || c.phone);

  const skippedInvalid = contacts.length - normalized.length;

  if (normalized.length === 0) {
    return { imported: 0, skipped: contacts.length, error: "Each row must have an email or a phone." };
  }

  // Dedupe against existing contacts (email match)
  const emails = normalized.map((c) => c.email).filter(Boolean) as string[];
  const { data: existing } = emails.length > 0
    ? await supabase
        .from("partner_contacts")
        .select("email")
        .eq("partner_id", partner.id)
        .in("email", emails)
    : { data: [] };

  const existingEmails = new Set((existing ?? []).map((r) => r.email));
  const newRows = normalized.filter((c) => !c.email || !existingEmails.has(c.email));
  const skippedDupes = normalized.length - newRows.length;

  if (newRows.length === 0) {
    return { imported: 0, skipped: skippedInvalid + skippedDupes };
  }

  const rows = newRows.map((c) => ({
    partner_id: partner.id,
    email: c.email,
    name: c.name,
    phone: c.phone,
  }));

  const { error } = await supabase.from("partner_contacts").insert(rows);

  if (error) return { imported: 0, skipped: contacts.length, error: error.message };

  revalidatePath("/dashboard/customers");
  return { imported: newRows.length, skipped: skippedInvalid + skippedDupes };
}

// ─── Test-data seed (admin only, gated in the UI by isAdmin+uiTestMode) ──────
// Seeds ~10 partner_contacts + ~8 subscribers, with 3 overlapping emails so
// the from_csv-match path will fire when orders are seeded against these rows.

const SEED_SUBSCRIBERS = [
  { name: "Sarah Chen",      email: "sarah.chen@fake-email213.net",    phone: "+14155550101" },
  { name: "Michael Torres",  email: "m.torres@fake-email213.net",      phone: "+14085550102" },
  { name: "Emma Williams",   email: "emma.w@fake-email213.net",        phone: "+14155550103" },
  { name: "James Patel",     email: "jpatel@fake-email213.net",        phone: "+16505550104" },
  { name: "Olivia Kim",      email: "olivia.kim@fake-email213.net",    phone: "+14155550105" },
  { name: "Noah Johnson",    email: "noah.j@fake-email213.net",        phone: "+16505550106" },
  { name: "Sophia Martinez", email: "sophiam@fake-email213.net",       phone: "+14085550107" },
  { name: "Liam Anderson",   email: "liam.anderson@fake-email213.net", phone: "+14155550108" },
];

const SEED_CONTACTS = [
  // 3 overlaps with subscribers (same emails) — exercises from_csv match
  { name: "Sarah Chen",      email: "sarah.chen@fake-email213.net", phone: "+14155550101" },
  { name: "Michael Torres",  email: "m.torres@fake-email213.net",   phone: "+14085550102" },
  { name: "Emma Williams",   email: "emma.w@fake-email213.net",     phone: null },
  // 3 contacts with full info, no subscriber overlap
  { name: "Ava Thompson",    email: "ava.thompson@fake-email213.net", phone: "+14085550109" },
  { name: "Mason Garcia",    email: "mason.g@fake-email213.net",      phone: "+14155550110" },
  { name: "Alexander Brown", email: "alex.brown@fake-email213.net",   phone: "+14155550114" },
  // 4 contacts with email only (simulates CRM imports without phones)
  { name: "Isabella Lee",    email: "isabella.lee@fake-email213.net", phone: null },
  { name: "Ethan Davis",     email: "ethan.d@fake-email213.net",      phone: null },
  { name: "Mia Wilson",      email: "mia.wilson@fake-email213.net",   phone: null },
  { name: "Charlotte Taylor",email: "charlotte.t@fake-email213.net",  phone: null },
];

export async function seedAudience(): Promise<{
  subscribers: number;
  contacts: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!user.email?.endsWith("@table22.com")) {
    return { subscribers: 0, contacts: 0, error: "Not authorized." };
  }

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const [{ count: subCount }, { count: conCount }] = await Promise.all([
    supabase.from("subscribers").select("id", { count: "exact", head: true }).eq("partner_id", partner.id),
    supabase.from("partner_contacts").select("id", { count: "exact", head: true }).eq("partner_id", partner.id),
  ]);

  if ((subCount ?? 0) > 0 || (conCount ?? 0) > 0) {
    return {
      subscribers: 0,
      contacts: 0,
      skipped: true,
      reason: "Partner already has audience — delete existing first to re-seed.",
    };
  }

  const subRows = SEED_SUBSCRIBERS.map((s) => ({
    partner_id: partner.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    opted_in: true,
  }));
  const conRows = SEED_CONTACTS.map((c) => ({
    partner_id: partner.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
  }));

  const [subRes, conRes] = await Promise.all([
    supabase.from("subscribers").insert(subRows),
    supabase.from("partner_contacts").insert(conRows),
  ]);

  if (subRes.error || conRes.error) {
    return {
      subscribers: 0,
      contacts: 0,
      error: subRes.error?.message ?? conRes.error?.message ?? "Seed failed.",
    };
  }

  revalidatePath("/dashboard/customers");
  return { subscribers: subRows.length, contacts: conRows.length };
}
