import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { error } = await supabase.auth.getSession();
  const connected = !error;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-4xl font-bold">Product Drops</h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          The simplest way to sell time-limited, inventory-constrained drops.
          Bakers, pop-ups, ghost kitchens, and specialty producers — release a
          batch, text your list, take orders, hand over food.
        </p>
        <p className="text-sm text-gray-500">
          Pickup only. Stripe-powered. SMS-native.
        </p>
      </div>
      <div className="flex gap-3">
        <a
          href="/login"
          className="rounded-full border px-6 py-2 text-sm font-medium hover:bg-neutral-3 transition-colors"
        >
          Log in →
        </a>
        <a
          href="/onboarding"
          className="rounded-full bg-neutral-12 px-6 py-2 text-sm font-medium text-white hover:opacity-80 transition-opacity"
        >
          Get started →
        </a>
      </div>
    </main>
  );
}
