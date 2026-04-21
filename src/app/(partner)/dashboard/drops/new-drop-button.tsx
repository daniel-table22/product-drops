"use client";

import Link from "next/link";

export function NewDropButton() {
  return (
    <Link
      href="/dashboard/drops/new"
      className="inline-flex items-center h-7 px-3 rounded-3 bg-accent-9 text-white text-size-1 font-medium hover:bg-accent-10 active:bg-accent-11 transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-8"
    >
      New drop
    </Link>
  );
}
