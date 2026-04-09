import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function StripeConnectPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id, stripe_account_id, onboarding_state")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  // Already connected
  if (partner.onboarding_state === "stripe_ready") redirect("/dashboard");

  // Create Express account if this partner doesn't have one yet
  let accountId = partner.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({ type: "express" });
    accountId = account.id;
    await supabase
      .from("partners")
      .update({ stripe_account_id: accountId })
      .eq("id", partner.id);
  }

  // Generate a fresh account_link and redirect straight to Stripe
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/dashboard/stripe-connect/refresh`,
    return_url: `${APP_URL}/dashboard/stripe-connect/return`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}
