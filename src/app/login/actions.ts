"use server";

import { createServiceClient } from "@/lib/supabase/service";

export async function checkPartnerExists(email: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("partners")
    .select("id")
    .eq("email", email)
    .single();
  return !!data;
}
