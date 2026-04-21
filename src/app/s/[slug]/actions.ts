"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { sendSms } from "@/lib/sms";

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

export async function subscribeToDrops(
  formData: FormData
): Promise<{ error?: string; dropSlug?: string }> {
  const partnerSlug = formData.get("partner_slug") as string;
  const rawPhone = (formData.get("phone") as string).trim();

  if (!rawPhone) return { error: "Please enter a phone number." };

  const phone = normalizePhone(rawPhone);
  if (!phone) return { error: "Please enter a valid phone number." };

  const supabase = createServiceClient();
  const serviceClient = createServiceClient();

  const { data: partner } = await supabase
    .from("partners")
    .select("id, business_name, slug")
    .eq("slug", partnerSlug)
    .single();

  if (!partner) return { error: "Store not found." };

  // Upsert subscriber (not yet opted in)
  const { error: upsertError } = await serviceClient
    .from("subscribers")
    .upsert({ partner_id: partner.id, phone, opted_in: false }, { onConflict: "partner_id,phone" });

  if (upsertError) return { error: "Could not save your number. Please try again." };

  // Send double opt-in SMS
  try {
    await sendSms(phone, `Reply YES to get drop alerts from ${partner.business_name}. Reply STOP to unsubscribe.`);
  } catch {
    return { error: "Could not send confirmation SMS. Check your number and try again." };
  }

  // Find the most relevant active drop to redirect to
  const { data: drops } = await supabase
    .from("drops")
    .select("slug, state")
    .eq("partner_id", partner.id)
    .in("state", ["orders_open", "scheduled"])
    .order("order_window_starts_at", { ascending: true })
    .limit(1);

  return { dropSlug: drops?.[0]?.slug };
}
