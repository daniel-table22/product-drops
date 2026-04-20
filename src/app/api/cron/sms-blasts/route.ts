import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSms, isSmsTestMode } from "@/lib/sms";

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const testMode = await isSmsTestMode();

  let announceSent = 0;
  let reminderSent = 0;

  // --- Announce blasts ---
  const { data: announceCandidates } = await supabase
    .from("drops")
    .select("id, name, slug, order_window_starts_at, announce_days_before, partners!inner(id, slug, business_name)")
    .not("announce_days_before", "is", null)
    .is("announced_at", null)
    .in("state", ["scheduled", "orders_open"]);

  for (const drop of announceCandidates ?? []) {
    if (!drop.order_window_starts_at) continue;
    if (daysUntil(drop.order_window_starts_at) !== drop.announce_days_before) continue;

    const partner = drop.partners as { id: string; slug: string; business_name: string };
    const dropUrl = `${appUrl}/s/${partner.slug}/d/${drop.slug}`;
    const date = formatDate(drop.order_window_starts_at);

    const { data: subscribers } = await supabase
      .from("subscribers")
      .select("phone")
      .eq("partner_id", partner.id)
      .eq("opted_in", true);

    const results = await Promise.allSettled(
      (subscribers ?? []).map((s) =>
        sendSms(
          s.phone,
          `${partner.business_name} drop opens ${date}: ${drop.name}. Order here → ${dropUrl}`,
          { testMode }
        )
      )
    );

    announceSent += results.filter((r) => r.status === "fulfilled").length;
    await supabase.from("drops").update({ announced_at: new Date().toISOString() }).eq("id", drop.id);
  }

  // --- Reminder blasts ---
  const { data: reminderCandidates } = await supabase
    .from("drops")
    .select("id, name, slug, order_window_ends_at, reminder_days_before, partners!inner(id, slug, business_name)")
    .not("reminder_days_before", "is", null)
    .is("reminded_at", null)
    .eq("state", "orders_open");

  for (const drop of reminderCandidates ?? []) {
    if (!drop.order_window_ends_at) continue;
    if (daysUntil(drop.order_window_ends_at) !== drop.reminder_days_before) continue;

    const partner = drop.partners as { id: string; slug: string; business_name: string };
    const dropUrl = `${appUrl}/s/${partner.slug}/d/${drop.slug}`;
    const date = formatDate(drop.order_window_ends_at);

    const { data: subscribers } = await supabase
      .from("subscribers")
      .select("phone")
      .eq("partner_id", partner.id)
      .eq("opted_in", true);

    const results = await Promise.allSettled(
      (subscribers ?? []).map((s) =>
        sendSms(
          s.phone,
          `Last chance to order ${drop.name} from ${partner.business_name} — closes ${date}. → ${dropUrl}`,
          { testMode }
        )
      )
    );

    reminderSent += results.filter((r) => r.status === "fulfilled").length;
    await supabase.from("drops").update({ reminded_at: new Date().toISOString() }).eq("id", drop.id);
  }

  return NextResponse.json({ announceSent, reminderSent });
}
