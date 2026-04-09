import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";
import { Button } from "@/components/ui/button";

export default async function StripeConnectReturnPage() {
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

  if (!partner?.stripe_account_id) redirect("/dashboard");

  const account = await stripe.accounts.retrieve(partner.stripe_account_id);

  if (account.charges_enabled) {
    await supabase
      .from("partners")
      .update({ onboarding_state: "stripe_ready" })
      .eq("id", partner.id);

    redirect("/dashboard");
  }

  // Onboarding incomplete — requirements still pending
  await supabase
    .from("partners")
    .update({ onboarding_state: "stripe_action_required" })
    .eq("id", partner.id);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="text-size-6 font-semibold text-neutral-12">
            Almost there
          </h1>
          <p className="text-size-2 text-neutral-11">
            Stripe needs a bit more information before you can accept payments.
            Return to your dashboard and try connecting again.
          </p>
        </div>
        <Button asChild className="w-full">
          <a href="/dashboard">Back to dashboard</a>
        </Button>
      </div>
    </main>
  );
}
