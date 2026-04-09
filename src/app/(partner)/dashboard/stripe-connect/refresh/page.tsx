import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Stripe sends the partner here when an account_link expires mid-flow.
// We generate a fresh link and redirect immediately.
export default async function StripeConnectRefreshPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id, stripe_account_id")
    .eq("user_id", user.id)
    .single();

  if (!partner?.stripe_account_id) redirect("/dashboard/stripe-connect");

  const accountLink = await stripe.accountLinks.create({
    account: partner.stripe_account_id,
    refresh_url: `${APP_URL}/dashboard/stripe-connect/refresh`,
    return_url: `${APP_URL}/dashboard/stripe-connect/return`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}
