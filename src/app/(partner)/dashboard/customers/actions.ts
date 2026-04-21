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
