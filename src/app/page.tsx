import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { error } = await supabase.auth.getSession();
  const connected = !error;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-24">
      <h1 className="text-4xl font-bold">Product Drops</h1>
      <p className="text-lg text-gray-500">hello world</p>
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
    </main>
  );
}
