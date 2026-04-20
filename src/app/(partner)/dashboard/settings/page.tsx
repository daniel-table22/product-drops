import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Separator } from "@/components/ui/separator";
import { toggleSmsTestMode } from "./actions";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const stripeReady = partner.onboarding_state === "stripe_ready";

  const serviceClient = createServiceClient();
  const { data: settings } = await serviceClient
    .from("system_settings")
    .select("sms_test_mode")
    .single();
  const smsTestMode = settings?.sms_test_mode ?? true;

  return (
    <div className="px-8 py-10 max-w-2xl space-y-10">
      <PageHeader title="Settings" size="large" />

      <section className="space-y-4">
        <h2 className="text-size-4 font-medium text-neutral-12">Account</h2>
        <Separator />
        <div className="space-y-1">
          <p className="text-size-1 font-medium text-neutral-11 uppercase tracking-wider">Email</p>
          <p className="text-size-2 text-neutral-12">{user.email}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-size-4 font-medium text-neutral-12">Payments</h2>
        <Separator />
        {stripeReady ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-accent-3 px-2 py-0.5 text-size-1 font-medium text-accent-11">
              Payments active
            </span>
            <p className="text-size-2 text-neutral-11">Your Stripe account is connected.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-size-2 font-medium text-neutral-12">Stripe not connected</p>
              <p className="mt-1 text-size-2 text-neutral-10">
                Connect Stripe to publish drops and collect payments.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a href="/dashboard/stripe-connect">Connect Stripe</a>
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-size-4 font-medium text-neutral-12">SMS</h2>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-size-2 font-medium text-neutral-12">SMS mode</p>
              {smsTestMode ? (
                <span className="inline-flex items-center rounded-full bg-warning-3 px-2 py-0.5 text-size-1 font-medium text-warning-11">
                  Test mode
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-accent-3 px-2 py-0.5 text-size-1 font-medium text-accent-11">
                  Live
                </span>
              )}
            </div>
            <p className="text-size-2 text-neutral-10">
              {smsTestMode
                ? "SMS sends are suppressed — messages are logged to the console only."
                : "SMS sends are live. Subscribers will receive real text messages."}
            </p>
          </div>
          <form action={toggleSmsTestMode.bind(null, !smsTestMode)}>
            <Button type="submit" size="sm" variant="outline">
              {smsTestMode ? "Enable live SMS" : "Switch to test mode"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
