"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

export function DropRow({ href, children, className }: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      className={cn("cursor-pointer", className)}
    >
      {children}
    </tr>
  );
}

export function DropActionsCell({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn("px-4 py-3", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </td>
  );
}
