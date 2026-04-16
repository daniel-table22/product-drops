"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, AlignLeft, CalendarRange, Package, MessageSquare, Mail, Phone,
} from "lucide-react";
import type { Tables, Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropStateBadge, OrderStateBadge } from "@/components/state-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { updateOrderState, publishDrop, addDropItem, removeDropItem, updateDropItem, sendBlast, rewriteWithAI, seedOrders } from "./actions";
import { updateDrop } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { Separator } from "@/components/ui/separator";

type Drop = Tables<"drops">;
type DropItem = Tables<"drop_items"> & { item: Tables<"items"> };
type Order = Tables<"orders"> & { order_items: Tables<"order_items">[] };
type OrderState = Database["public"]["Enums"]["order_state"];

function toDateTimeLocal(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

function fmtWindow(start: string, end: string): string {
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    });
  return `${fmt(start)} → ${fmt(end)}`;
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white flex items-center h-[52px] px-2 gap-3">
      <div className="w-8 flex items-center justify-center text-neutral-9 shrink-0">
        {icon}
      </div>
      <span className="w-36 shrink-0 text-size-2 text-neutral-10">{label}</span>
      <span className="flex-1 text-size-2 text-neutral-12 font-medium">{value}</span>
    </div>
  );
}

function ContactChip({ icon, value, type }: { icon: React.ReactNode; value: string; type: "email" | "phone" }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button className="w-6 h-6 flex items-center justify-center rounded text-neutral-9 hover:text-neutral-12 hover:bg-neutral-3 transition-colors">
        {icon}
      </button>
      {show && (
        <div className="absolute bottom-full right-0 mb-2 z-20 bg-white border border-neutral-6 rounded-lg shadow-lg px-3 py-2 flex items-center gap-3 whitespace-nowrap">
          <span className="text-size-1 text-neutral-12 font-medium">{value}</span>
          {type === "email" && (
            <a href={`mailto:${value}`} className="text-size-1 text-accent-11 hover:underline">Email</a>
          )}
          <button onClick={copy} className="text-size-1 text-neutral-10 hover:text-neutral-12 transition-colors">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

function defaultBlastMessage(drop: Drop, dropItems: DropItem[], partnerSlug: string): string {
  const dropUrl = `productdrops.com/s/${partnerSlug}/d/${drop.slug}`;
  const closeDate = new Date(drop.order_window_ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const itemNames = dropItems.slice(0, 2).map((di) => di.item.name);
  let msg = `${drop.name} is live!`;
  if (itemNames.length > 0) {
    msg += ` ${itemNames.join(", ")}${dropItems.length > 2 ? " + more" : ""}.`;
  }
  msg += ` Order by ${closeDate} → ${dropUrl}`;
  return msg;
}

function fmtBlastDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface Props {
  drop: Drop;
  dropItems: DropItem[];
  orders: Order[];
  libraryItems: Tables<"items">[];
  isStripeReady: boolean;
  partnerSlug: string;
  subscriberCount: number;
  businessName: string;
  userId: string;
}

export function DropDetailClient({ drop, dropItems, orders, libraryItems, isStripeReady, partnerSlug, subscriberCount, businessName, userId }: Props) {
  const router = useRouter();
  const updateDropWithId = updateDrop.bind(null, drop.id);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemPending, setAddItemPending] = useState(false);
  const [publishPending, startPublishTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [orderStatePending, setOrderStatePending] = useState<string | null>(null);
  const [announceValue, setAnnounceValue] = useState<string>(
    drop.announce_days_before != null ? String(drop.announce_days_before) : "5"
  );
  const [reminderValue, setReminderValue] = useState<string>(
    drop.reminder_days_before != null ? String(drop.reminder_days_before) : "dont"
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [seedPartialPending, setSeedPartialPending] = useState(false);
  const [seedFullPending, setSeedFullPending] = useState(false);
  const [seedResult, setSeedResult] = useState<{ created: number } | null>(null);
  const [blastMessage, setBlastMessage] = useState(() => defaultBlastMessage(drop, dropItems, partnerSlug));
  const [blastResult, setBlastResult] = useState<{ sent: number } | null>(null);
  const [blastPending, setBlastPending] = useState(false);
  const [blastAIPending, setBlastAIPending] = useState(false);

  // Overview read-only / edit toggle with fade-through
  const [isEditing, setIsEditing] = useState(false);
  const [viewOpacity, setViewOpacity] = useState(1);

  function enterEdit() {
    setViewOpacity(0);
    setTimeout(() => { setIsEditing(true); setViewOpacity(1); }, 150);
  }
  function exitEdit() {
    setViewOpacity(0);
    setTimeout(() => { setIsEditing(false); setViewOpacity(1); }, 150);
  }

  // Per-item edits: { [dropItemId]: { priceCents, totalQty } }
  const [itemEdits, setItemEdits] = useState<Record<string, { priceCents: number; totalQty: number }>>(() =>
    Object.fromEntries(dropItems.map((di) => [di.id, { priceCents: di.price_cents, totalQty: di.total_qty }]))
  );

  // Sync when items are added/removed (server re-renders push new dropItems prop)
  useEffect(() => {
    setItemEdits((prev) => {
      const next = { ...prev };
      for (const di of dropItems) {
        if (!next[di.id]) next[di.id] = { priceCents: di.price_cents, totalQty: di.total_qty };
      }
      for (const id of Object.keys(next)) {
        if (!dropItems.find((di) => di.id === id)) delete next[id];
      }
      return next;
    });
  }, [dropItems]);

  const defaultSocial = dropItems.length > 0
    ? `New drop: ${drop.name} ✨\n\n${dropItems.map((di) => `${di.item.name} — $${(di.price_cents / 100).toFixed(2)}`).join("\n")}\n\nLink in bio to order 🔗`
    : `New drop: ${drop.name} ✨\n\nLink in bio to order 🔗`;
  const [socialMessage, setSocialMessage] = useState(defaultSocial);
  const [socialAIPending, setSocialAIPending] = useState(false);
  // Per-item price/qty state for the add-items dialog
  const [itemPrices, setItemPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries(libraryItems.map((i) => [i.id, (i.default_price_cents / 100).toFixed(2)]))
  );
  const [itemQtys, setItemQtys] = useState<Record<string, string>>(() =>
    Object.fromEntries(libraryItems.map((i) => [i.id, "0"]))
  );

  useEffect(() => {
    if (!isDirty || !isEditing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isEditing]);

  const canPublish = isStripeReady && drop.state === "scheduled";

  // Pack list: aggregate order_items by item_name
  const packMap = new Map<string, number>();
  for (const order of orders) {
    if (order.state === "no_show") continue;
    for (const oi of order.order_items) {
      packMap.set(oi.item_name, (packMap.get(oi.item_name) ?? 0) + oi.qty);
    }
  }

  async function handlePublish() {
    await publishDrop(drop.id);
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    const toAdd = libraryItems.filter((i) => parseInt(itemQtys[i.id] ?? "0", 10) > 0);
    for (const item of toAdd) {
      const priceCents = Math.round(parseFloat(itemPrices[item.id] ?? "0") * 100);
      const qty = parseInt(itemQtys[item.id], 10);
      await addDropItem(drop.id, item.id, priceCents, qty);
    }
    setAddItemOpen(false);
    setItemQtys(Object.fromEntries(libraryItems.map((i) => [i.id, "0"])));
  }

  async function handleRemoveItem(dropItemId: string) {
    await removeDropItem(dropItemId, drop.id);
  }

  async function handleOrderState(orderId: string, newState: OrderState) {
    setOrderStatePending(orderId);
    await updateOrderState(orderId, drop.id, newState);
    setOrderStatePending(null);
    router.refresh();
  }


  return (
    <div className="px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm">
            <a href="/dashboard/drops">← Drops</a>
          </Button>
          <h1 className="text-size-7 font-semibold text-neutral-12 tracking-tight">{drop.name}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-7">
          <DropStateBadge state={drop.state} />
          <Button asChild variant="ghost" size="sm">
            <a
              href={`/s/${partnerSlug}/d/${drop.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit ↗
            </a>
          </Button>
          {canPublish && (
            <form action={handlePublish}>
              <Button type="submit" size="sm">Publish</Button>
            </form>
          )}
          {!isStripeReady && drop.state === "scheduled" && (
            <Button asChild variant="outline" size="sm">
              <a href="/dashboard/stripe-connect">Connect Stripe to publish</a>
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (isEditing && isDirty && !window.confirm("You have unsaved changes. Leave without saving?")) return;
          setIsDirty(false);
          setActiveTab(v);
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="prep-list">Prep list</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="pt-2">
          <div
            style={{ opacity: viewOpacity, transition: "opacity 0.15s ease" }}
          >
            {/* ── Read-only view ── */}
            {!isEditing && (
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-size-3 font-medium text-neutral-12">Details</h2>
                  <Button size="sm" variant="outline" onClick={enterEdit}>Edit</Button>
                </div>

                {/* Details card */}
                <div className="bg-neutral-2 rounded-4 p-3">
                  <div className="flex flex-col gap-px rounded-3 overflow-hidden">
                    {/* Title */}
                    <DetailRow icon={<FileText size={15} />} label="Title" value={drop.name} />
                    {/* Description */}
                    {drop.description && (
                      <DetailRow icon={<AlignLeft size={15} />} label="Description" value={drop.description} />
                    )}
                    {/* Order window */}
                    <DetailRow
                      icon={<CalendarRange size={15} />}
                      label="Order window"
                      value={fmtWindow(drop.order_window_starts_at, drop.order_window_ends_at)}
                    />
                    {/* Pickup window */}
                    <DetailRow
                      icon={<Package size={15} />}
                      label="Pickup window"
                      value={fmtWindow(drop.pickup_window_starts_at, drop.pickup_window_ends_at)}
                    />
                    {/* Announcement SMS */}
                    <DetailRow
                      icon={<MessageSquare size={15} />}
                      label="Announcement SMS"
                      value={
                        drop.announce_days_before != null
                          ? `${drop.announce_days_before} day${drop.announce_days_before !== 1 ? "s" : ""} before opening`
                          : "Off"
                      }
                    />
                    {/* Reminder SMS */}
                    <DetailRow
                      icon={<MessageSquare size={15} />}
                      label="Reminder SMS"
                      value={
                        drop.reminder_days_before != null
                          ? `${drop.reminder_days_before} day${drop.reminder_days_before !== 1 ? "s" : ""} before closing`
                          : "Off"
                      }
                    />
                  </div>
                </div>

                {/* Items card */}
                {dropItems.length > 0 && (
                  <div className="bg-neutral-2 rounded-4 p-3">
                    <div className="flex flex-col gap-px rounded-3 overflow-hidden">
                      {dropItems.map((di) => (
                        <div key={di.id} className="bg-white flex items-center px-2 h-[52px]">
                          <div className="w-8 shrink-0 mr-3">
                            {di.item.photo_url ? (
                              <img src={di.item.photo_url} alt={di.item.name} className="w-8 h-8 rounded-2 object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-2 bg-neutral-3" />
                            )}
                          </div>
                          <span className="flex-1 text-size-2 font-medium text-neutral-12 truncate">{di.item.name}</span>
                          <span className="text-size-2 text-neutral-10 mr-4">${(di.price_cents / 100).toFixed(2)}</span>
                          <span className="text-size-2 text-neutral-10 text-right tabular-nums">
                            {di.total_qty - di.available_qty} / {di.total_qty} ordered
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dropItems.length === 0 && (
                  <p className="text-size-2 text-neutral-10">No items added yet. Edit to add items.</p>
                )}
              </div>
            )}

            {/* ── Edit form ── */}
            {isEditing && (
              <div className="space-y-8">
                <form ref={formRef} action={updateDropWithId} onSubmit={() => setIsDirty(false)} onChange={() => setIsDirty(true)} className="space-y-5 max-w-xl">
                  <input type="hidden" name="announce_days_before" value={announceValue === "dont" ? "" : announceValue} />
                  <input type="hidden" name="reminder_days_before" value={reminderValue === "dont" ? "" : reminderValue} />
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Drop name</Label>
                    <Input id="name" name="name" defaultValue={drop.name} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Input id="description" name="description" defaultValue={drop.description ?? ""} />
                  </div>
                  <fieldset className="space-y-3">
                    <legend className="text-size-2 font-medium text-neutral-12">Order window</legend>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="order_window_starts_at">Opens</Label>
                        <Input id="order_window_starts_at" name="order_window_starts_at" type="datetime-local" defaultValue={toDateTimeLocal(drop.order_window_starts_at)} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="order_window_ends_at">Closes</Label>
                        <Input id="order_window_ends_at" name="order_window_ends_at" type="datetime-local" defaultValue={toDateTimeLocal(drop.order_window_ends_at)} required />
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className="space-y-3">
                    <legend className="text-size-2 font-medium text-neutral-12">Pickup window</legend>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="pickup_window_starts_at">Opens</Label>
                        <Input id="pickup_window_starts_at" name="pickup_window_starts_at" type="datetime-local" defaultValue={toDateTimeLocal(drop.pickup_window_starts_at)} required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pickup_window_ends_at">Closes</Label>
                        <Input id="pickup_window_ends_at" name="pickup_window_ends_at" type="datetime-local" defaultValue={toDateTimeLocal(drop.pickup_window_ends_at)} required />
                      </div>
                    </div>
                  </fieldset>
                  <fieldset className="space-y-3">
                    <legend className="text-size-2 font-medium text-neutral-12">SMS blast schedule</legend>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-size-2 text-neutral-11 w-28 shrink-0">Announcement</span>
                        <select
                          value={announceValue}
                          onChange={(e) => setAnnounceValue(e.target.value)}
                          className="h-9 rounded-md border border-neutral-6 bg-surface px-3 text-size-2 text-neutral-12 focus:outline-none focus:ring-2 focus:ring-accent-8"
                        >
                          <option value="dont">Don't send</option>
                          {[1,2,3,4,5,7,10,14].map((d) => (
                            <option key={d} value={String(d)}>{d} day{d !== 1 ? "s" : ""} before opening</option>
                          ))}
                        </select>
                        {announceValue !== "dont" && (
                          <span className="text-size-1 text-neutral-10">
                            → {fmtBlastDate(new Date(new Date(drop.order_window_starts_at).getTime() - parseInt(announceValue) * 86_400_000))}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-size-2 text-neutral-11 w-28 shrink-0">Reminder</span>
                        <select
                          value={reminderValue}
                          onChange={(e) => setReminderValue(e.target.value)}
                          className="h-9 rounded-md border border-neutral-6 bg-surface px-3 text-size-2 text-neutral-12 focus:outline-none focus:ring-2 focus:ring-accent-8"
                        >
                          <option value="dont">Don't send</option>
                          {[1,2,3].map((d) => {
                            const reminderAt = new Date(new Date(drop.order_window_ends_at).getTime() - d * 86_400_000);
                            const announceAt = announceValue !== "dont"
                              ? new Date(new Date(drop.order_window_starts_at).getTime() - parseInt(announceValue) * 86_400_000)
                              : null;
                            const valid = !announceAt || reminderAt > announceAt;
                            return (
                              <option key={d} value={String(d)} disabled={!valid}>
                                {d} day{d !== 1 ? "s" : ""} before closing
                              </option>
                            );
                          })}
                        </select>
                        {reminderValue !== "dont" && (
                          <span className="text-size-1 text-neutral-10">
                            → {fmtBlastDate(new Date(new Date(drop.order_window_ends_at).getTime() - parseInt(reminderValue) * 86_400_000))}
                          </span>
                        )}
                      </div>
                    </div>
                  </fieldset>
                </form>

                <div className="space-y-3">
                  <div className="flex items-center justify-between max-w-xl">
                    <h2 className="text-size-3 font-medium text-neutral-12">Items</h2>
                    {libraryItems.length > 0 && drop.state === "scheduled" && (
                      <Button size="sm" variant="outline" onClick={() => setAddItemOpen(true)}>
                        Add item
                      </Button>
                    )}
                  </div>

                  {dropItems.length === 0 ? (
                    <p className="text-size-2 text-neutral-10">No items added yet.</p>
                  ) : (
                    <div className="border border-neutral-6 rounded-4 overflow-hidden max-w-xl">
                      <table className="w-full text-size-2">
                        <thead className="bg-neutral-2 border-b border-neutral-6">
                          <tr>
                            <th className="px-4 py-3 w-10" />
                            <th className="px-4 py-3 text-left font-medium text-neutral-11">Item</th>
                            <th className="px-4 py-3 text-right font-medium text-neutral-11 w-28">Price ($)</th>
                            <th className="px-4 py-3 text-right font-medium text-neutral-11 w-24">Qty</th>
                            <th className="px-4 py-3 text-right font-medium text-neutral-11 w-24">Available</th>
                            <th className="px-4 py-3 w-20" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-6">
                          {dropItems.map((di) => {
                            const purchased = di.total_qty - di.available_qty;
                            const edit = itemEdits[di.id] ?? { priceCents: di.price_cents, totalQty: di.total_qty };
                            const derivedAvailable = edit.totalQty - purchased;
                            return (
                              <tr key={di.id} className="bg-surface">
                                <td className="px-4 py-3">
                                  {di.item.photo_url ? (
                                    <img src={di.item.photo_url} alt={di.item.name} className="w-8 h-8 rounded-2 object-cover" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-2 bg-neutral-3" />
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-neutral-12">{di.item.name}</td>
                                <td className="px-4 py-3 text-right">
                                  <Input
                                    type="number" min="0" step="0.01"
                                    value={(edit.priceCents / 100).toFixed(2)}
                                    onChange={(e) => setItemEdits((prev) => ({
                                      ...prev,
                                      [di.id]: { ...edit, priceCents: Math.round(parseFloat(e.target.value || "0") * 100) },
                                    }))}
                                    className="h-7 text-right text-size-2 w-full"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <Input
                                    type="number" step="1"
                                    min={purchased}
                                    value={edit.totalQty}
                                    onChange={(e) => setItemEdits((prev) => ({
                                      ...prev,
                                      [di.id]: { ...edit, totalQty: Math.max(purchased, parseInt(e.target.value || "0", 10) || 0) },
                                    }))}
                                    className="h-7 text-right text-size-2 w-full"
                                  />
                                </td>
                                <td className="px-4 py-3 text-right text-neutral-11">{derivedAvailable}</td>
                                <td className="px-4 py-3 text-right">
                                  {purchased === 0 && (
                                    <form action={() => handleRemoveItem(di.id)}>
                                      <Button size="sm" variant="ghost" type="submit"
                                        className="text-neutral-10 hover:text-error-11">
                                        Remove
                                      </Button>
                                    </form>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 max-w-xl pt-2">
                  <Button variant="outline" onClick={exitEdit}>Cancel</Button>
                  <Button onClick={async () => {
                    // Flush any item edits first, then submit the drop form (which redirects)
                    for (const di of dropItems) {
                      const edit = itemEdits[di.id];
                      if (edit && (edit.priceCents !== di.price_cents || edit.totalQty !== di.total_qty)) {
                        await updateDropItem(di.id, drop.id, edit.priceCents, edit.totalQty);
                      }
                    }
                    formRef.current?.requestSubmit();
                  }}>Save</Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Orders ── */}
        <TabsContent value="orders" className="pt-2 space-y-4">
          {/* Seed buttons — only shown before/during orders */}
          {(drop.state === "orders_open" || drop.state === "scheduled") && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={seedPartialPending || seedFullPending}
                onClick={async () => {
                  setSeedPartialPending(true); setSeedResult(null);
                  const r = await seedOrders(drop.id, "partial");
                  if ("created" in r && r.created != null) setSeedResult({ created: r.created });
                  setSeedPartialPending(false);
                  router.refresh();
                }}>
                {seedPartialPending ? "Adding…" : "✦ Autofill partial"}
              </Button>
              <Button size="sm" variant="outline" disabled={seedPartialPending || seedFullPending}
                onClick={async () => {
                  setSeedFullPending(true); setSeedResult(null);
                  const r = await seedOrders(drop.id, "full");
                  if ("created" in r && r.created != null) setSeedResult({ created: r.created });
                  setSeedFullPending(false);
                  router.refresh();
                }}>
                {seedFullPending ? "Adding…" : "✦ Autofill all"}
              </Button>
              {seedResult && (
                <p className="text-size-1 text-neutral-10">{seedResult.created} order{seedResult.created !== 1 ? "s" : ""} added</p>
              )}
            </div>
          )}

          {orders.length === 0 ? (
            <p className="text-size-2 text-neutral-10">No orders yet.</p>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {orders.filter((o) => o.state !== "no_show").map((order) => {
                const pickupOpen = new Date() >= new Date(drop.pickup_window_starts_at);
                const isPending = orderStatePending === order.id;
                return (
                  <div key={order.id} className="border border-neutral-6 rounded-4 bg-surface overflow-hidden">
                    {/* Order header */}
                    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-neutral-6 bg-neutral-2">
                      <p className="font-medium text-neutral-12 text-size-2">{order.customer_name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {order.customer_email && (
                          <ContactChip icon={<Mail size={13} />} value={order.customer_email} type="email" />
                        )}
                        {order.customer_phone && (
                          <ContactChip icon={<Phone size={13} />} value={order.customer_phone} type="phone" />
                        )}
                        <OrderStateBadge state={order.state} />
                      </div>
                    </div>
                    {/* Line items */}
                    <ul className="divide-y divide-neutral-6">
                      {order.order_items.map((oi) => (
                        <li key={oi.id} className="flex items-center justify-between px-4 py-2.5 text-size-2">
                          <span className="text-neutral-11">{oi.qty}× {oi.item_name}</span>
                          <span className="text-neutral-10">${(oi.price_cents * oi.qty / 100).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    {/* Status checkboxes + total */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-6 bg-neutral-1">
                      <div className="flex items-center gap-6">
                        <label className={[
                          "flex items-center gap-2 select-none",
                          order.state === "paid" && !isPending ? "cursor-pointer" : "cursor-default opacity-60",
                        ].join(" ")}>
                          <input
                            type="checkbox"
                            checked={order.state === "ready" || order.state === "picked_up"}
                            disabled={order.state !== "paid" || isPending}
                            onChange={() => handleOrderState(order.id, "ready")}
                            className="w-4 h-4 rounded accent-neutral-12 cursor-pointer disabled:cursor-default"
                          />
                          <span className="text-size-2 text-neutral-11">Ready</span>
                        </label>
                        <label className={[
                          "flex items-center gap-2 select-none",
                          order.state === "ready" && pickupOpen && !isPending ? "cursor-pointer" : "cursor-default opacity-60",
                        ].join(" ")}>
                          <input
                            type="checkbox"
                            checked={order.state === "picked_up"}
                            disabled={order.state !== "ready" || !pickupOpen || isPending}
                            onChange={() => handleOrderState(order.id, "picked_up")}
                            title={order.state === "ready" && !pickupOpen ? `Pickup opens ${new Date(drop.pickup_window_starts_at).toLocaleDateString()}` : undefined}
                            className="w-4 h-4 rounded accent-neutral-12 cursor-pointer disabled:cursor-default"
                          />
                          <span className="text-size-2 text-neutral-11">Picked up</span>
                        </label>
                      </div>
                      <span className="text-size-2 font-medium text-neutral-12">${(order.total_cents / 100).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Announcements ── */}
        <TabsContent value="announcements" className="space-y-8 pt-2">
          <div className="space-y-3 max-w-xl">
            <div>
              <h2 className="text-size-3 font-medium text-neutral-12">SMS blast</h2>
              <p className="text-size-1 text-neutral-10 mt-0.5">Sent to {subscriberCount} opted-in subscriber{subscriberCount !== 1 ? "s" : ""}</p>
            </div>
            <textarea
              value={blastMessage}
              onChange={(e) => setBlastMessage(e.target.value)}
              rows={3}
              maxLength={320}
              placeholder={`Hey! ${drop.name} is now open for orders →`}
              className="w-full rounded-3 border border-neutral-6 bg-transparent px-3 py-2 text-size-2 text-neutral-12 focus:outline-none focus:ring-2 focus:ring-accent-8 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-size-1 text-neutral-10">{blastMessage.length}/320</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={blastAIPending || !blastMessage.trim()}
                  onClick={async () => {
                    setBlastAIPending(true);
                    const result = await rewriteWithAI(blastMessage, { dropName: drop.name, businessName, type: "sms" });
                    if ("text" in result && result.text) setBlastMessage(result.text);
                    setBlastAIPending(false);
                  }}>
                  {blastAIPending ? "Rewriting…" : "✦ Rewrite with AI"}
                </Button>
                <Button size="sm" disabled={blastPending || !blastMessage.trim() || subscriberCount === 0}
                  onClick={async () => {
                    setBlastPending(true);
                    setBlastResult(null);
                    const result = await sendBlast(drop.id, blastMessage);
                    setBlastResult(result as { sent: number });
                    setBlastPending(false);
                  }}>
                  {blastPending ? "Sending…" : `Send to ${subscriberCount}`}
                </Button>
              </div>
            </div>
            {blastResult && <p className="text-size-2 text-accent-11 font-medium">Sent to {blastResult.sent} subscriber{blastResult.sent !== 1 ? "s" : ""}.</p>}
          </div>

          <Separator />

          <div className="space-y-3 max-w-xl">
            <div>
              <h2 className="text-size-3 font-medium text-neutral-12">Social media</h2>
              <p className="text-size-1 text-neutral-10 mt-0.5">Copy this caption to Instagram</p>
            </div>
            <textarea
              value={socialMessage}
              onChange={(e) => setSocialMessage(e.target.value)}
              rows={5}
              className="w-full rounded-3 border border-neutral-6 bg-transparent px-3 py-2 text-size-2 text-neutral-12 focus:outline-none focus:ring-2 focus:ring-accent-8 resize-none"
            />
            <div className="flex items-center justify-between">
              <Button size="sm" variant="outline" disabled={socialAIPending || !socialMessage.trim()}
                onClick={async () => {
                  setSocialAIPending(true);
                  const result = await rewriteWithAI(socialMessage, { dropName: drop.name, businessName, type: "social" });
                  if ("text" in result && result.text) setSocialMessage(result.text);
                  setSocialAIPending(false);
                }}>
                {socialAIPending ? "Rewriting…" : "✦ Rewrite with AI"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(socialMessage)}>
                Copy caption
              </Button>
            </div>
            {dropItems.filter((di) => di.item.photo_url).length > 0 && (
              <div className="flex gap-3 flex-wrap pt-1">
                {dropItems.filter((di) => di.item.photo_url).map((di) => (
                  <a key={di.id} href={di.item.photo_url!} download target="_blank" rel="noopener noreferrer" className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={di.item.photo_url!} alt={di.item.name} className="w-20 h-20 rounded-3 object-cover border border-neutral-6 group-hover:opacity-80 transition-opacity" />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-size-1 font-medium bg-black/30 rounded-3">Download</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Prep list ── */}
        <TabsContent value="prep-list" className="pt-2 space-y-4">
          <p className="text-size-2 text-neutral-10">
            Aggregated totals across all paid orders — what you need to make.
          </p>
          {packMap.size === 0 ? (
            <p className="text-size-2 text-neutral-10">No orders to aggregate yet.</p>
          ) : (
            <div className="border border-neutral-6 rounded-4 overflow-hidden max-w-sm print:border-0">
              <table className="w-full text-size-2">
                <thead className="bg-neutral-2 border-b border-neutral-6 print:bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-neutral-11">Item</th>
                    <th className="px-4 py-3 text-right font-medium text-neutral-11">Total qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-6">
                  {Array.from(packMap.entries()).map(([name, qty]) => (
                    <tr key={name} className="bg-surface">
                      <td className="px-4 py-3 font-medium text-neutral-12">{name}</td>
                      <td className="px-4 py-3 text-right text-neutral-12 text-size-4 font-semibold">{qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={() => window.print()} className="text-size-2 text-neutral-10 hover:text-neutral-12 underline print:hidden">
            Print
          </button>
        </TabsContent>
      </Tabs>

      {/* Add item dialog */}
      <Dialog open={addItemOpen} onOpenChange={(open) => {
        setAddItemOpen(open);
        if (!open) setItemQtys(Object.fromEntries(libraryItems.map((i) => [i.id, "0"])));
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add items to drop</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="mt-2 space-y-4">
            <div className="border border-neutral-6 rounded-3 overflow-hidden">
              <table className="w-full text-size-2">
                <thead className="bg-neutral-2 border-b border-neutral-6">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-neutral-11">Item</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-11 w-24">Price ($)</th>
                    <th className="px-3 py-2 text-right font-medium text-neutral-11 w-20">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-6">
                  {libraryItems.map((item) => {
                    const qty = parseInt(itemQtys[item.id] ?? "0", 10);
                    return (
                      <tr key={item.id} className={qty > 0 ? "bg-accent-2" : "bg-surface"}>
                        <td className="px-3 py-2 text-neutral-12">{item.name}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={itemPrices[item.id] ?? ""}
                            onChange={(e) => setItemPrices((p) => ({ ...p, [item.id]: e.target.value }))}
                            className="h-7 text-right text-size-2 w-full"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="1"
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
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={!libraryItems.some((i) => parseInt(itemQtys[i.id] ?? "0", 10) > 0)}
              >
                Add items
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
