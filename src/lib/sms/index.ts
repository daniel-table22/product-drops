import { createServiceClient } from "@/lib/supabase/service";
import { twilioClient, TWILIO_MESSAGING_SERVICE_SID } from "@/lib/twilio/client";

export async function isSmsTestMode(): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("system_settings")
    .select("sms_test_mode")
    .single();
  return data?.sms_test_mode ?? true;
}

export async function sendSms(
  to: string,
  body: string,
  opts?: { testMode?: boolean }
): Promise<void> {
  const testMode = opts?.testMode !== undefined ? opts.testMode : await isSmsTestMode();

  if (testMode) {
    console.log("[SMS noop — test mode]", { to, body });
    return;
  }

  if (process.env.SMS_ENABLED === "true") {
    await twilioClient.messages.create({
      to,
      messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
      body,
    });
  } else {
    console.log("[SMS noop — SMS_ENABLED not set]", { to, body });
  }
}
