"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { createPresetDrop } from "./actions";
import type { DropPreset } from "./actions";

type Option = { label: string; hint: string; value: DropPreset | "blank"; dot: string };

const OPTIONS: Option[] = [
  { label: "Blank",         hint: "Empty form",           value: "blank",         dot: "bg-neutral-7"  },
  { label: "Pre-filled",    hint: "Orders open",          value: "preload",       dot: "bg-accent-9"   },
  { label: "Orders closed", hint: "Between windows",      value: "orders_closed", dot: "bg-warning-9"  },
  { label: "Pickup open",   hint: "Pickup active",        value: "pickup_open",   dot: "bg-accent-9"   },
  { label: "Pickup closed", hint: "All windows past",     value: "pickup_closed", dot: "bg-neutral-7"  },
];

export function NewDropButton() {
  const [loading, setLoading] = useState(false);

  async function handleSelect(value: DropPreset | "blank") {
    if (value === "blank") {
      window.location.href = "/dashboard/drops/new";
      return;
    }
    setLoading(true);
    await createPresetDrop(value);
    setLoading(false);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-3 bg-accent-9 text-white text-size-1 font-medium hover:bg-accent-10 active:bg-accent-11 disabled:opacity-40 disabled:pointer-events-none transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-8"
        >
          {loading ? "Creating…" : "New drop"}
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[200px] rounded-3 border border-neutral-6 bg-surface shadow-lg py-1 animate-in fade-in-0 zoom-in-95"
        >
          {OPTIONS.map((opt) => (
            <DropdownMenu.Item
              key={opt.value}
              onSelect={() => handleSelect(opt.value)}
              className="flex items-center justify-between px-3 py-2 cursor-pointer text-size-2 text-neutral-12 hover:bg-neutral-2 focus:bg-neutral-2 outline-none"
            >
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />
                {opt.label}
              </span>
              <span className="text-size-1 text-neutral-9 ml-6">{opt.hint}</span>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
