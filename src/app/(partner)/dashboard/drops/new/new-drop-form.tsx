"use client";

import { useActionState, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { createDrop } from "../actions";

type LibraryItem = {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  default_price_cents: number;
};

const ADJECTIVES = [
  "Special", "Magical", "Exclusive", "Glorious", "Secret",
  "Legendary", "Limited", "Golden", "Sacred", "Beloved",
  "Rare", "Precious",
];
const NOUNS = [
  "Bake", "Treats", "Batch", "Collection", "Selection",
  "Drop", "Bundle", "Haul", "Basket", "Spread", "Stash", "Box",
];
const DESCRIPTIONS = [
  "Handcrafted in small batches — fresh, local, and gone by noon.",
  "Our most requested recipes, made with love and available for one day only.",
  "Limited quantities of the good stuff. Order early or miss out.",
  "Seasonal ingredients, familiar favorites, baked fresh this morning.",
  "A curated selection of our best work this week. You asked, we baked.",
  "Small-batch and hand-packed. This one's extra special.",
  "Everything on this list is made to order and ready for pickup.",
  "A tasting-menu-worth of treats in one convenient drop.",
  "For the regulars who know: this batch is something else entirely.",
  "Buttery, flaky, and gone by the end of the day. Don't wait.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmtBlastDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 60 * 60 * 1000);
}

export function NewDropForm({ libraryItems }: { libraryItems: LibraryItem[] }) {
  const [state, formAction, pending] = useActionState(createDrop, null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orderStart, setOrderStart] = useState("");
  const [orderEnd, setOrderEnd] = useState("");
  const [pickupStart, setPickupStart] = useState("");
  const [pickupEnd, setPickupEnd] = useState("");
  const [announceDays, setAnnounceDays] = useState("5");
  const [reminderDays, setReminderDays] = useState("dont");
  const [autofilling, setAutofilling] = useState(false);

  const [itemPrices, setItemPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(libraryItems.map((i) => [i.id, (i.default_price_cents / 100).toFixed(2)]))
  );
  const [itemQtys, setItemQtys] = useState<Record<string, string>>(() =>
    Object.fromEntries(libraryItems.map((i) => [i.id, "0"]))
  );

  const selectedItems = libraryItems.filter((i) => parseInt(itemQtys[i.id] ?? "0", 10) > 0);
  const itemsJson = JSON.stringify(
    selectedItems.map((i) => ({
      id: i.id,
      priceCents: Math.round(parseFloat(itemPrices[i.id] ?? "0") * 100),
      qty: parseInt(itemQtys[i.id], 10),
    }))
  );

  function handleAutofill() {
    setAutofilling(true);
    setName(`${pick(ADJECTIVES)} ${pick(NOUNS)}`);
    setDescription(pick(DESCRIPTIONS));

    const now = new Date();
    setOrderStart(toDateTimeLocal(addHours(now, -1)));
    setOrderEnd(toDateTimeLocal(addHours(now, 23)));
    setPickupStart(toDateTimeLocal(addHours(now, 72)));
    setPickupEnd(toDateTimeLocal(addHours(now, 80)));

    // Pick 3 random items with qty 10-30
    const shuffled = [...libraryItems].sort(() => Math.random() - 0.5).slice(0, 3);
    setItemQtys((prev) => {
      const next = { ...prev };
      libraryItems.forEach((i) => { next[i.id] = "0"; });
      shuffled.forEach((i) => { next[i.id] = String(Math.floor(Math.random() * 21) + 10); });
      return next;
    });
    setTimeout(() => setAutofilling(false), 600);
  }

  return (
    <div className="px-8 py-10 max-w-2xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <a href="/dashboard/drops">← Back</a>
          </Button>
          <PageHeader title="New drop" size="large" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAutofill} disabled={autofilling}>
          {autofilling ? "Filling…" : "✦ Autofill"}
        </Button>
      </div>

      <form action={formAction} className="space-y-6">
        <input type="hidden" name="items" value={itemsJson} />

        {state?.error && (
          <p className="text-size-2 text-error-11 bg-error-3 border border-error-6 rounded-3 px-4 py-3">
            {state.error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name">Drop name</Label>
          <Input
            id="name" name="name" placeholder="Saturday Bake" required
            value={name} onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description" name="description" placeholder="Our weekly sourdough drop…"
            value={description} onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-size-2 font-medium text-neutral-12">Order window</legend>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="order_window_starts_at">Opens</Label>
              <Input id="order_window_starts_at" name="order_window_starts_at" type="datetime-local" required
                value={orderStart} onChange={(e) => setOrderStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order_window_ends_at">Closes</Label>
              <Input id="order_window_ends_at" name="order_window_ends_at" type="datetime-local" required
                value={orderEnd} onChange={(e) => setOrderEnd(e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-size-2 font-medium text-neutral-12">Pickup window</legend>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pickup_window_starts_at">Opens</Label>
              <Input id="pickup_window_starts_at" name="pickup_window_starts_at" type="datetime-local" required
                value={pickupStart} onChange={(e) => setPickupStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pickup_window_ends_at">Closes</Label>
              <Input id="pickup_window_ends_at" name="pickup_window_ends_at" type="datetime-local" required
                value={pickupEnd} onChange={(e) => setPickupEnd(e.target.value)} />
            </div>
          </div>
        </fieldset>

        <input type="hidden" name="announce_days_before" value={announceDays === "dont" ? "" : announceDays} />
        <input type="hidden" name="reminder_days_before" value={reminderDays === "dont" ? "" : reminderDays} />

        <fieldset className="space-y-3">
          <legend className="text-size-2 font-medium text-neutral-12">SMS blast schedule</legend>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-size-2 text-neutral-11 w-28 shrink-0">Announcement</span>
              <select
                value={announceDays}
                onChange={(e) => setAnnounceDays(e.target.value)}
                className="h-9 rounded-md border border-neutral-6 bg-surface px-3 text-size-2 text-neutral-12 focus:outline-none focus:ring-2 focus:ring-accent-8"
              >
                <option value="dont">Don't send</option>
                {[1,2,3,4,5,7,10,14].map((d) => (
                  <option key={d} value={String(d)}>{d} day{d !== 1 ? "s" : ""} before opening</option>
                ))}
              </select>
              {announceDays !== "dont" && orderStart && (
                <span className="text-size-1 text-neutral-10">
                  → {fmtBlastDate(new Date(new Date(orderStart).getTime() - parseInt(announceDays) * 86_400_000))}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-size-2 text-neutral-11 w-28 shrink-0">Reminder</span>
              <select
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                className="h-9 rounded-md border border-neutral-6 bg-surface px-3 text-size-2 text-neutral-12 focus:outline-none focus:ring-2 focus:ring-accent-8"
              >
                <option value="dont">Don't send</option>
                {[1,2,3].map((d) => {
                  const reminderAt = orderEnd ? new Date(new Date(orderEnd).getTime() - d * 86_400_000) : null;
                  const announceAt = announceDays !== "dont" && orderStart
                    ? new Date(new Date(orderStart).getTime() - parseInt(announceDays) * 86_400_000)
                    : null;
                  const valid = !reminderAt || !announceAt || reminderAt > announceAt;
                  return (
                    <option key={d} value={String(d)} disabled={!valid}>
                      {d} day{d !== 1 ? "s" : ""} before closing
                    </option>
                  );
                })}
              </select>
              {reminderDays !== "dont" && orderEnd && (
                <span className="text-size-1 text-neutral-10">
                  → {fmtBlastDate(new Date(new Date(orderEnd).getTime() - parseInt(reminderDays) * 86_400_000))}
                </span>
              )}
            </div>
          </div>
        </fieldset>

        {/* Inline items */}
        {libraryItems.length > 0 && (
          <div className="space-y-2">
            <Label>Items</Label>
            <div className="border border-neutral-6 rounded-3 overflow-hidden">
              <table className="w-full text-size-2">
                <thead className="bg-neutral-2 border-b border-neutral-6">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-neutral-11" colSpan={2}>Product</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-11 w-24">Price ($)</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-11 w-20">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-6">
                  {libraryItems.map((item) => {
                    const qty = parseInt(itemQtys[item.id] ?? "0", 10);
                    return (
                      <tr key={item.id} className={qty > 0 ? "bg-accent-2" : "bg-surface"}>
                        <td className="px-3 py-2 w-10">
                          {item.photo_url ? (
                            <img src={item.photo_url} alt={item.name}
                              className="w-8 h-8 rounded-2 object-cover bg-neutral-3" />
                          ) : (
                            <div className="w-8 h-8 rounded-2 bg-neutral-3" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-neutral-12">{item.name}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" min="0" step="0.01"
                            value={itemPrices[item.id] ?? ""}
                            onChange={(e) => setItemPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                            className="h-7 text-right text-size-2 w-full"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" min="0" step="1"
                            value={itemQtys[item.id] ?? "0"}
                            onChange={(e) => setItemQtys((q) => ({ ...q, [item.id]: e.target.value }))}
                            className="h-7 text-right text-size-2 w-full"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {selectedItems.length > 0 && (
              <p className="text-size-1 text-neutral-10">
                {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild size="lg" className="rounded-none bg-neutral-3 text-black hover:bg-neutral-4 active:bg-neutral-5">
            <a href="/dashboard/drops">Cancel</a>
          </Button>
          <SubmitButton
            size="lg"
            pendingText="Saving…"
            className="rounded-none bg-accent-5 text-black hover:bg-accent-6 active:bg-accent-7"
          >
            Save draft
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
