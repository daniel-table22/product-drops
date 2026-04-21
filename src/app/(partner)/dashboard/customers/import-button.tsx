"use client";

import { useRef, useState, useTransition } from "react";
import { importContacts } from "./actions";

type ParsedContact = {
  name?: string;
  email?: string;
  phone?: string;
};

function parseCsv(text: string): ParsedContact[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/"/g, ""));
  const nameIdx = headers.indexOf("name");
  const emailIdx = headers.indexOf("email");
  const phoneIdx = headers.indexOf("phone");

  if (emailIdx === -1 && phoneIdx === -1) return [];

  const rows: ParsedContact[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const email = emailIdx !== -1 ? cols[emailIdx] : undefined;
    const phone = phoneIdx !== -1 ? cols[phoneIdx] : undefined;
    if (!email && !phone) continue;

    rows.push({
      ...(nameIdx !== -1 && cols[nameIdx] ? { name: cols[nameIdx] } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    });
  }
  return rows;
}

export function ImportCsvButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const contacts = parseCsv(text);

      if (contacts.length === 0) {
        setError('CSV must have an "email" or "phone" column and at least one row.');
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      startTransition(async () => {
        const res = await importContacts(contacts);
        if (res.error) {
          setError(res.error);
        } else {
          setStatus({ imported: res.imported, skipped: res.skipped });
        }
        if (inputRef.current) inputRef.current.value = "";
      });
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex items-center gap-3">
      {status && (
        <p className="text-size-1 text-neutral-10">
          {status.imported} imported{status.skipped > 0 ? `, ${status.skipped} skipped` : ""}
        </p>
      )}
      {error && <p className="text-size-1 text-error-11">{error}</p>}
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      <button
        onClick={() => { setStatus(null); setError(null); inputRef.current?.click(); }}
        disabled={isPending}
        className="inline-flex items-center h-7 px-3 rounded-3 text-size-1 font-medium border border-neutral-6 text-neutral-11 hover:bg-neutral-2 hover:text-neutral-12 transition-colors disabled:opacity-40"
      >
        {isPending ? "Importing…" : "Import CSV"}
      </button>
    </div>
  );
}
