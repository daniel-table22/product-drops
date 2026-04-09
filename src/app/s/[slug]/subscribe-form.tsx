"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { subscribeToDrops } from "./actions";

export function SubscribeForm({
  partnerSlug,
  partnerName,
}: {
  partnerSlug: string;
  partnerName: string;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("partner_slug", partnerSlug);
    formData.set("phone", phone);

    startTransition(async () => {
      const result = await subscribeToDrops(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.dropSlug) {
        router.push(
          `/s/${partnerSlug}/d/${result.dropSlug}?phone=${encodeURIComponent(phone)}`
        );
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-xl border px-4 py-3 text-center space-y-1" style={{ borderColor: "var(--color-accent)", backgroundColor: "color-mix(in srgb, var(--color-accent) 8%, white)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--color-accent)" }}>Check your messages</p>
        <p className="text-sm" style={{ color: "color-mix(in srgb, var(--color-accent) 70%, transparent)" }}>
          We sent a confirmation to {phone}. Reply <strong>YES</strong> to subscribe.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-3 items-stretch">
        <div className="flex-1 flex items-center gap-2 bg-white border-2 rounded-xl px-3 py-3 shadow-sm" style={{ borderColor: "var(--color-accent)" }}>
          <span className="font-mono text-sm text-black/40 shrink-0">+1</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="415-528-8098"
            required
            className="flex-1 font-mono text-sm text-black bg-transparent outline-none placeholder:text-black/30 min-w-0"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="text-white text-sm font-medium rounded-xl px-4 py-3 shrink-0 transition-colors disabled:opacity-60 shadow-sm"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          {isPending ? "…" : "Notify me!"}
        </button>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
          className="mt-0.5 shrink-0 accent-[var(--color-accent)]"
        />
        <span className="text-xs leading-snug" style={{ color: "color-mix(in srgb, var(--color-accent) 70%, transparent)" }}>
          I agree to receive order confirmations and pickup reminders by SMS from {partnerName}. Reply STOP to opt out.
        </span>
      </label>
      {error && (
        <p className="text-xs text-red-600 text-center">{error}</p>
      )}
    </form>
  );
}
