import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-gray-500">
            Enter your email and we&apos;ll send you a magic link.
          </p>
        </div>
        <LoginForm next={next} />
        <p className="text-size-1 text-neutral-9 border border-dashed border-neutral-6 rounded-3 px-3 py-2">
          <strong>Dev note:</strong> Email delivery is WIP. Check your inbox — magic links are sending via Resend but SMTP config is still being tuned. Sessions persist so you won&apos;t need to log in often.
        </p>
      </div>
    </main>
  );
}
