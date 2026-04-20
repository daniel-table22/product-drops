import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSms } from "@/lib/sms";

export async function processInboundSms(from: string, text: string) {
  const supabase = createServiceClient();
  const normalized = text.trim().toUpperCase();

  if (normalized === "YES") {
    await supabase.from("subscribers").update({ opted_in: true }).eq("phone", from);
  }

  if (normalized === "STOP" || normalized === "UNSUBSCRIBE") {
    await supabase.from("subscribers").delete().eq("phone", from);
  }

  if (normalized === "HELP") {
    await sendSms(from, "Reply YES to subscribe to drop alerts, or STOP to unsubscribe.");
  }
}

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const from = body.get("From") as string;
  const text = (body.get("Body") as string) ?? "";

  if (!from) return new NextResponse("ok", { status: 200 });

  await processInboundSms(from, text);

  return new NextResponse("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
