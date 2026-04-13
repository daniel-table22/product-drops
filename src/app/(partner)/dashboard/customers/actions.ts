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
  phone: string;
  opted_in: boolean;
  name?: string;
  email?: string;
  created_at?: string;
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

  // Normalize phones and drop invalid ones
  const normalized = contacts
    .map((c) => ({ ...c, phone: normalizePhone(c.phone) }))
    .filter((c): c is ContactInput & { phone: string } => c.phone !== null);

  const skippedInvalid = contacts.length - normalized.length;

  if (normalized.length === 0) {
    return { imported: 0, skipped: contacts.length, error: "No valid phone numbers found." };
  }

  // Find which phones already exist so we don't overwrite organic subscribers
  const phones = normalized.map((c) => c.phone);
  const { data: existing } = await supabase
    .from("subscribers")
    .select("phone")
    .eq("partner_id", partner.id)
    .in("phone", phones);

  const existingSet = new Set((existing ?? []).map((s) => s.phone));
  const newContacts = normalized.filter((c) => !existingSet.has(c.phone));
  const skippedDupes = normalized.length - newContacts.length;

  if (newContacts.length === 0) {
    return { imported: 0, skipped: skippedInvalid + skippedDupes };
  }

  const rows = newContacts.map((c) => ({
    partner_id: partner.id,
    phone: c.phone,
    opted_in: c.opted_in,
    source: "crm_csv",
    ...(c.name ? { name: c.name } : {}),
    ...(c.email ? { email: c.email } : {}),
    ...(c.created_at ? { created_at: new Date(c.created_at).toISOString() } : {}),
  }));

  const { error } = await supabase.from("subscribers").insert(rows);

  if (error) return { imported: 0, skipped: contacts.length, error: error.message };

  revalidatePath("/dashboard/customers");
  return { imported: newContacts.length, skipped: skippedInvalid + skippedDupes };
}
