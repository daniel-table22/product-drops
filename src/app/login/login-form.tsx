"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkPartnerExists } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = "form" | "no_account" | "sent_signin" | "sent_setup";

export default function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("form");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendOtp(isSetup: boolean) {
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const redirectTo =
      `${window.location.origin}/auth/callback` +
      (next ? `?next=${encodeURIComponent(next)}` : "");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);

    if (error) {
      setError("Something went wrong — try again or email daniel.nacamuli@table22.com.");
    } else {
      setState(isSetup ? "sent_setup" : "sent_signin");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const exists = await checkPartnerExists(email);
    setLoading(false);

    if (!exists) {
      setState("no_account");
      return;
    }

    await sendOtp(false);
  }

  if (state === "sent_signin" || state === "sent_setup") {
    return (
      <div className="rounded-4 border border-accent-6 bg-accent-2 p-4 text-size-2 text-accent-11">
        {state === "sent_signin"
          ? <>Check your email — we sent a sign-in link to <strong>{email}</strong>.</>
          : <>Check your email — we sent a setup link to <strong>{email}</strong>. Click it to create your account.</>
        }
      </div>
    );
  }

  if (state === "no_account") {
    return (
      <div className="space-y-4">
        <div className="rounded-4 border border-neutral-6 bg-neutral-2 p-4 text-size-2 text-neutral-11">
          No account found for <strong>{email}</strong>.
        </div>
        {error && <p className="text-size-2 text-error-11">{error}</p>}
        <Button onClick={() => sendOtp(true)} disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send me a setup link"}
        </Button>
        <button
          type="button"
          onClick={() => { setState("form"); setError(null); }}
          className="w-full text-center text-size-2 text-neutral-9 hover:text-neutral-11"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      {error && <p className="text-size-2 text-error-11">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Checking…" : "Send magic link"}
      </Button>
    </form>
  );
}
