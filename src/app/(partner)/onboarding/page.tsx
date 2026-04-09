import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // If partner already completed profile, skip to dashboard
  const { data: partner } = await supabase
    .from("partners")
    .select("onboarding_state")
    .eq("user_id", user.id)
    .single();

  if (partner && partner.onboarding_state !== "signed_up") {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set up your store
          </h1>
          <p className="text-sm text-gray-500">
            This takes about 2 minutes. You can edit everything later.
          </p>
        </div>
        <OnboardingForm userId={user.id} email={user.email!} />
      </div>
    </main>
  );
}
