import { twilioClient, TWILIO_PHONE } from "@/lib/twilio/client";

export async function sendSms(to: string, body: string): Promise<void> {
  if (process.env.SMS_ENABLED === "true") {
    await twilioClient.messages.create({ to, from: TWILIO_PHONE, body });
  } else {
    console.log("[SMS noop]", { to, body });
  }
}
