import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "Login" };

const ERROR_MESSAGES: Record<string, string> = {
  expired: "Your sign-in link has expired — request a new one below.",
  invalid: "That sign-in link isn't valid — request a new one below.",
  "no-code": "That sign-in link isn't valid — request a new one below.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { next, error } = await searchParams;
  const errorMessage =
    ERROR_MESSAGES[error ?? ""] ??
    (error
      ? "Something went wrong signing you in. Email daniel.nacamuli@table22.com if this keeps happening."
      : null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-gray-500">
            Enter your email and we&apos;ll send you a magic link.
          </p>
        </div>
        {errorMessage && (
          <p className="rounded-3 bg-error-2 border border-error-6 px-3 py-2 text-size-2 text-error-11">
            {errorMessage}
          </p>
        )}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
