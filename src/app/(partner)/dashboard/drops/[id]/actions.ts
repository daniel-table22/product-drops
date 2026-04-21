"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSms, isSmsTestMode } from "@/lib/sms";
import { anthropic } from "@/lib/anthropic/client";
import type { Database } from "@/types/database";

type OrderState = Database["public"]["Enums"]["order_state"];

export async function updateOrderState(orderId: string, dropId: string, newState: OrderState) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const extra: Record<string, string> = {};
  if (newState === "ready") extra.ready_at = new Date().toISOString();
  if (newState === "picked_up") extra.picked_up_at = new Date().toISOString();

  await supabase
    .from("orders")
    .update({ state: newState, ...extra })
    .eq("id", orderId);

  if (newState === "ready") {
    const serviceClient = createServiceClient();
    const { data: orderRow } = await serviceClient
      .from("orders")
      .select("customer_phone, drops!inner(partners!inner(business_name))")
      .eq("id", orderId)
      .single();

    const phone = orderRow?.customer_phone;
    const businessName = (
      orderRow?.drops as { partners: { business_name: string } } | null
    )?.partners?.business_name;

    if (phone && businessName) {
      await sendSms(phone, `Your order from ${businessName} is ready for pickup!`).catch(() => {});
    }
  }

  revalidatePath(`/dashboard/drops/${dropId}`);
}

export async function updateBlastSettings(
  dropId: string,
  announceDaysBefore: number | null,
  reminderDaysBefore: number | null,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("drops")
    .update({ announce_days_before: announceDaysBefore, reminder_days_before: reminderDaysBefore })
    .eq("id", dropId);

  revalidatePath(`/dashboard/drops/${dropId}`);
}

export async function publishDrop(dropId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug, business_name, onboarding_state")
    .eq("user_id", user.id)
    .single();

  if (!partner || partner.onboarding_state !== "stripe_ready") {
    return { error: "Connect Stripe before publishing." };
  }

  const { data: drop } = await supabase
    .from("drops")
    .select("name, slug")
    .eq("id", dropId)
    .single();

  await supabase
    .from("drops")
    .update({ state: "orders_open", published_at: new Date().toISOString() })
    .eq("id", dropId);

  // Blast opted-in subscribers
  if (drop) {
    const { data: subscribers } = await supabase
      .from("subscribers")
      .select("phone")
      .eq("partner_id", partner.id)
      .eq("opted_in", true);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const dropUrl = `${appUrl}/s/${partner.slug}/d/${drop.slug}`;

    const testMode = await isSmsTestMode();
    const results = await Promise.allSettled(
      (subscribers ?? []).map((s) =>
        sendSms(
          s.phone,
          `${partner.business_name} drop is open: ${drop.name}. Order now → ${dropUrl}`,
          { testMode }
        )
      )
    );
    const sent = results.filter((r) => r.status === "fulfilled").length;
    await supabase.from("drops").update({ blast_count: sent }).eq("id", dropId);
  }

  revalidatePath(`/dashboard/drops/${dropId}`);
  revalidatePath("/dashboard/drops");
  revalidatePath("/dashboard");
}

export async function sendBlast(dropId: string, message: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id, slug, business_name")
    .eq("user_id", user.id)
    .single();

  if (!partner) return { error: "Partner not found." };

  const { data: subscribers } = await supabase
    .from("subscribers")
    .select("phone")
    .eq("partner_id", partner.id)
    .eq("opted_in", true);

  if (!subscribers?.length) return { sent: 0 };

  const testMode = await isSmsTestMode();
  const results = await Promise.allSettled(
    subscribers.map((s) =>
      sendSms(s.phone, message, { testMode })
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  await supabase.from("drops").update({ blast_count: sent }).eq("id", dropId);
  revalidatePath(`/dashboard/drops/${dropId}`);
  return { sent };
}

export async function rewriteWithAI(
  text: string,
  context: { dropName: string; businessName: string; type: "sms" | "social" }
) {
  const systemPrompts = {
    sms: "You are a copywriter helping small food businesses send SMS blasts to their subscribers. Write concise, warm, direct messages under 160 characters. No hashtags. End with a call to action.",
    social: "You are a copywriter helping small food businesses craft Instagram captions. Write warm, evocative, community-focused captions. Use 2–4 relevant emojis and 3–5 hashtags at the end.",
  };

  const userPrompt = `Business: ${context.businessName}\nDrop: ${context.dropName}\n\nRewrite or improve this message:\n\n"${text}"`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: systemPrompts[context.type],
    messages: [{ role: "user", content: userPrompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") return { error: "Unexpected response" };
  return { text: content.text.trim() };
}

export async function seedOrders(
  dropId: string,
  mode: "full" | "partial"
): Promise<{ created?: number; error?: string }> {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { seedOrdersForDrop } = await import("@/lib/seed-orders");
  const result = await seedOrdersForDrop(dropId, {
    targetFillRate: mode === "full" ? 1.0 : 0.5,
  });

  revalidatePath(`/dashboard/drops/${dropId}`);
  return result;
}

export async function markOrderRefunded(orderId: string, dropId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("orders")
    .update({ refunded_at: new Date().toISOString() })
    .eq("id", orderId);

  revalidatePath(`/dashboard/drops/${dropId}`);
}

export async function updateOrderNotes(orderId: string, dropId: string, notes: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("orders")
    .update({ notes: notes || null })
    .eq("id", orderId);

  revalidatePath(`/dashboard/drops/${dropId}`);
}

export async function addDropItem(
  dropId: string,
  itemId: string,
  priceCents: number,
  totalQty: number
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("drop_items").insert({
    drop_id: dropId,
    item_id: itemId,
    price_cents: priceCents,
    total_qty: totalQty,
    available_qty: totalQty,
  });

  revalidatePath(`/dashboard/drops/${dropId}`);
}

export async function removeDropItem(dropItemId: string, dropId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("drop_items").delete().eq("id", dropItemId);

  revalidatePath(`/dashboard/drops/${dropId}`);
}

export async function updateDropItem(
  dropItemId: string,
  dropId: string,
  priceCents: number,
  newTotalQty: number
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch current to compute purchased qty
  const { data: di } = await supabase
    .from("drop_items")
    .select("total_qty, available_qty")
    .eq("id", dropItemId)
    .single();

  if (!di) return { error: "Item not found." };

  const purchased = di.total_qty - di.available_qty;
  if (newTotalQty < purchased) {
    return { error: `Qty can't go below ${purchased} (already purchased).` };
  }

  await supabase
    .from("drop_items")
    .update({
      price_cents: priceCents,
      total_qty: newTotalQty,
      available_qty: newTotalQty - purchased,
    })
    .eq("id", dropItemId);

  revalidatePath(`/dashboard/drops/${dropId}`);
  return {};
}
