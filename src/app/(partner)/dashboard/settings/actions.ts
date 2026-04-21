"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export async function toggleSmsTestMode(testMode: boolean) {
  const supabase = createServiceClient();
  await supabase
    .from("system_settings")
    .update({ sms_test_mode: testMode })
    .eq("id", true);
  revalidatePath("/dashboard/settings");
}

export async function toggleUiTestMode(testMode: boolean) {
  const supabase = createServiceClient();
  await supabase
    .from("system_settings")
    .update({ ui_test_mode: testMode })
    .eq("id", true);
  revalidatePath("/dashboard", "layout");
}
