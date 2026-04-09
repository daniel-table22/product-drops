import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { twilioClient, TWILIO_PHONE } from "@/lib/twilio/client";

export async function POST(req: NextRequest) {
  const body = await req.formData();
  const from = body.get("From") as string;
  const text = ((body.get("Body") as string) ?? "").trim().toUpperCase();

  if (!from) return new NextResponse("ok", { status: 200 });

  const supabase = createServiceClient();

  if (text === "YES") {
    await supabase
      .from("subscribers")
      .update({ opted_in: true })
      .eq("phone", from);
  }

  if (text === "STOP" || text === "UNSUBSCRIBE") {
    await supabase.from("subscribers").delete().eq("phone", from);
  }

  if (text === "HELP") {
    await twilioClient.messages.create({
      to: from,
      from: TWILIO_PHONE,
      body: "Reply YES to subscribe to drop alerts, or STOP to unsubscribe.",
    });
  }

  // Return empty TwiML response
  return new NextResponse("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
