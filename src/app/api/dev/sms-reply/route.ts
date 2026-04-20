import { NextRequest, NextResponse } from "next/server";
import { processInboundSms } from "@/app/api/webhooks/twilio/route";

// Simulates an inbound SMS reply — dev only, not available in production.
// Usage: POST /api/dev/sms-reply  { "from": "+14155550101", "body": "YES" }
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const { from, body } = await req.json();

  if (!from || !body) {
    return NextResponse.json({ error: "from and body are required" }, { status: 400 });
  }

  await processInboundSms(from, body);

  return NextResponse.json({ ok: true, from, body });
}
