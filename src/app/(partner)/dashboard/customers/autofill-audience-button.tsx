"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { seedAudience } from "./actions";

export function AutofillAudienceButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleClick() {
    setMsg(null);
    startTransition(async () => {
      const res = await seedAudience();
      if (res.error) setMsg(res.error);
      else if (res.skipped) setMsg(res.reason ?? "Skipped.");
      else setMsg(`Added ${res.subscribers} subscribers + ${res.contacts} contacts.`);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-size-1 text-neutral-10">{msg}</span>}
      <button
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center h-7 px-3 rounded-3 text-size-1 font-medium border border-neutral-6 text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 transition-colors disabled:opacity-40"
      >
        {pending ? "Seeding…" : "🧪 Autofill audience"}
      </button>
    </div>
  );
}
