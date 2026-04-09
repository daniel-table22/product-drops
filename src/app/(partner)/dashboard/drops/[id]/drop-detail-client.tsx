"use client";

import { useState } from "react";
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
import { updateOrderState, publishDrop, addDropItem, removeDropItem, sendBlast, rewriteWithAI } from "./actions";
import { updateDrop } from "../actions";
import { ImageUpload } from "@/components/image-upload";
import { Separator } from "@/components/ui/separator";

type Drop = Tables<"drops">;
type DropItem = Tables<"drop_items"> & { item: Tables<"items"> };
type Order = Tables<"orders"> & { order_items: Tables<"order_items">[] };
type OrderState = Database["public"]["Enums"]["order_state"];

function toDateTimeLocal(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
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
  const updateDropWithId = updateDrop.bind(null, drop.id);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [blastMessage, setBlastMessage] = useState("");
  const [blastResult, setBlastResult] = useState<{ sent: number } | null>(null);
  const [blastPending, setBlastPending] = useState(false);
  const [blastAIPending, setBlastAIPending] = useState(false);

  const defaultSocial = dropItems.length > 0
    ? `New drop: ${drop.name} ✨\n\n${dropItems.map((di) => `${di.item.name} — $${(di.price_cents / 100).toFixed(2)}`).join("\n")}\n\nLink in bio to order 🔗`
    : `New drop: ${drop.name} ✨\n\nLink in bio to order 🔗`;
  const [socialMessage, setSocialMessage] = useState(defaultSocial);
  const [socialAIPending, setSocialAIPending] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(libraryItems[0]?.id ?? "");
  const [itemPrice, setItemPrice] = useState("");
  const [itemQty, setItemQty] = useState("");

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
    const priceCents = Math.round(parseFloat(itemPrice) * 100);
    const qty = parseInt(itemQty, 10);
    await addDropItem(drop.id, selectedItemId, priceCents, qty);
    setAddItemOpen(false);
    setItemPrice("");
    setItemQty("");
  }

  async function handleRemoveItem(dropItemId: string) {
    await removeDropItem(dropItemId, drop.id);
  }

  async function handleOrderState(orderId: string, newState: OrderState) {
    await updateOrderState(orderId, drop.id, newState);
  }

  // Pre-select price when item changes
  function handleItemSelect(itemId: string) {
    setSelectedItemId(itemId);
    const item = libraryItems.find((i) => i.id === itemId);
    if (item) setItemPrice((item.default_price_cents / 100).toFixed(2));
  }

  return (
    <div className="px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <a href="/dashboard/drops">← Drops</a>
            </Button>
          </div>
          <h1 className="text-size-7 font-semibold text-neutral-12 tracking-tight">{drop.name}</h1>
          <div className="flex items-center gap-3">
            <DropStateBadge state={drop.state} />
            {drop.description && (
              <p className="text-size-2 text-neutral-10">{drop.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="pack-list">Pack list</TabsTrigger>
          <TabsTrigger value="prep-list">Prep list</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-8 pt-2">

          {/* Drop details form */}
          <form action={updateDropWithId} className="space-y-5 max-w-xl">
            <div className="space-y-1.5">
              <Label htmlFor="name">Drop name</Label>
              <Input id="name" name="name" defaultValue={drop.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" name="description" defaultValue={drop.description ?? ""} />
            </div>
            <ImageUpload
              name="image_url"
              label="Drop photo"
              defaultUrl={drop.image_url ?? null}
              userId={userId}
              storagePath="drop"
              previewShape="wide"
            />
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
            <div className="flex justify-end">
              <Button type="submit" size="sm">Save changes</Button>
            </div>
          </form>

          <Separator />

          {/* ── SMS blast composer ── */}
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
                <Button
                  size="sm" variant="outline"
                  disabled={blastAIPending || !blastMessage.trim()}
                  onClick={async () => {
                    setBlastAIPending(true);
                    const result = await rewriteWithAI(blastMessage, { dropName: drop.name, businessName, type: "sms" });
                    if ("text" in result) setBlastMessage(result.text);
                    setBlastAIPending(false);
                  }}
                >
                  {blastAIPending ? "Rewriting…" : "✦ Rewrite with AI"}
                </Button>
                <Button
                  size="sm"
                  disabled={blastPending || !blastMessage.trim() || subscriberCount === 0}
                  onClick={async () => {
                    setBlastPending(true);
                    setBlastResult(null);
                    const result = await sendBlast(drop.id, blastMessage);
                    setBlastResult(result as { sent: number });
                    setBlastPending(false);
                  }}
                >
                  {blastPending ? "Sending…" : `Send to ${subscriberCount}`}
                </Button>
              </div>
            </div>
            {blastResult && (
              <p className="text-size-2 text-accent-11 font-medium">Sent to {blastResult.sent} subscriber{blastResult.sent !== 1 ? "s" : ""}.</p>
            )}
          </div>

          {/* ── Social media composer ── */}
          <div className="space-y-3 max-w-xl">
            <div>
              <h2 className="text-size-3 font-medium text-neutral-12">Social media</h2>
              <p className="text-size-1 text-neutral-10 mt-0.5">Copy this caption to Instagram, copy photos from below</p>
            </div>
            <textarea
              value={socialMessage}
              onChange={(e) => setSocialMessage(e.target.value)}
              rows={5}
              className="w-full rounded-3 border border-neutral-6 bg-transparent px-3 py-2 text-size-2 text-neutral-12 focus:outline-none focus:ring-2 focus:ring-accent-8 resize-none"
            />
            <div className="flex items-center justify-between">
              <Button
                size="sm" variant="outline"
                disabled={socialAIPending || !socialMessage.trim()}
                onClick={async () => {
                  setSocialAIPending(true);
                  const result = await rewriteWithAI(socialMessage, { dropName: drop.name, businessName, type: "social" });
                  if ("text" in result) setSocialMessage(result.text);
                  setSocialAIPending(false);
                }}
              >
                {socialAIPending ? "Rewriting…" : "✦ Rewrite with AI"}
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={() => navigator.clipboard.writeText(socialMessage)}
              >
                Copy caption
              </Button>
            </div>
            {dropItems.filter((di) => di.item.photo_url).length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {dropItems.filter((di) => di.item.photo_url).map((di) => (
                  <a key={di.id} href={di.item.photo_url!} download target="_blank" rel="noopener noreferrer" className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={di.item.photo_url!}
                      alt={di.item.name}
                      className="w-20 h-20 rounded-3 object-cover border border-neutral-6 group-hover:opacity-80 transition-opacity"
                    />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-size-1 font-medium bg-black/30 rounded-3">
                      Download
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

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
                      <th className="px-4 py-3 text-left font-medium text-neutral-11">Item</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-11">Price</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-11">Qty</th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-11">Available</th>
                      {drop.state === "scheduled" && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-6">
                    {dropItems.map((di) => (
                      <tr key={di.id} className="bg-surface">
                        <td className="px-4 py-3 font-medium text-neutral-12">{di.item.name}</td>
                        <td className="px-4 py-3 text-right text-neutral-12">
                          ${(di.price_cents / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-11">{di.total_qty}</td>
                        <td className="px-4 py-3 text-right text-neutral-11">{di.available_qty}</td>
                        {drop.state === "scheduled" && (
                          <td className="px-4 py-3 text-right">
                            <form action={() => handleRemoveItem(di.id)}>
                              <Button size="sm" variant="ghost" type="submit"
                                className="text-neutral-10 hover:text-error-11">
                                Remove
                              </Button>
                            </form>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Orders ── */}
        <TabsContent value="orders" className="pt-2">
          {orders.length === 0 ? (
            <p className="text-size-2 text-neutral-10">No orders yet.</p>
          ) : (
            <div className="border border-neutral-6 rounded-4 overflow-hidden">
              <table className="w-full text-size-2">
                <thead className="bg-neutral-2 border-b border-neutral-6">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-neutral-11">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-11">Items</th>
                    <th className="px-4 py-3 text-right font-medium text-neutral-11">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-neutral-11">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-neutral-11">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-6">
                  {orders.map((order) => (
                    <tr key={order.id} className="bg-surface hover:bg-neutral-2 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-12">{order.customer_name}</p>
                        <p className="text-neutral-10">{order.customer_email}</p>
                        {order.customer_phone && (
                          <p className="text-neutral-10">{order.customer_phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-11">
                        {order.order_items.map((oi) => `${oi.qty}× ${oi.item_name}`).join(", ")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-12">
                        ${(order.total_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStateBadge state={order.state} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {order.state === "paid" && (
                            <form action={() => handleOrderState(order.id, "ready")}>
                              <Button size="sm" variant="outline" type="submit">Mark ready</Button>
                            </form>
                          )}
                          {order.state === "ready" && (
                            <form action={() => handleOrderState(order.id, "picked_up")}>
                              <Button size="sm" variant="outline" type="submit">Mark picked up</Button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Pack list ── */}
        <TabsContent value="pack-list" className="pt-2 space-y-4">
          <p className="text-size-2 text-neutral-10">
            Aggregated totals across all paid orders. Print this for kitchen prep.
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
                      <td className="px-4 py-3 text-right text-neutral-12 text-size-4 font-semibold">
                        {qty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="text-size-2 text-neutral-10 hover:text-neutral-12 underline print:hidden"
          >
            Print
          </button>
        </TabsContent>

        {/* ── Prep list ── */}
        <TabsContent value="prep-list" className="pt-2 space-y-4">
          <p className="text-size-2 text-neutral-10">
            Per-order breakdown. Print this to label each bag.
          </p>
          {orders.filter((o) => o.state !== "no_show").length === 0 ? (
            <p className="text-size-2 text-neutral-10">No orders to show yet.</p>
          ) : (
            <div className="space-y-3 max-w-sm">
              {orders
                .filter((o) => o.state !== "no_show")
                .map((order) => (
                  <div
                    key={order.id}
                    className="border border-neutral-6 rounded-4 p-4 bg-surface space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-neutral-12">{order.customer_name}</p>
                      <OrderStateBadge state={order.state} />
                    </div>
                    <p className="text-size-1 text-neutral-10">{order.customer_email}</p>
                    <ul className="mt-2 space-y-0.5">
                      {order.order_items.map((oi) => (
                        <li key={oi.id} className="text-size-2 text-neutral-12">
                          {oi.qty}× {oi.item_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="text-size-2 text-neutral-10 hover:text-neutral-12 underline print:hidden"
          >
            Print
          </button>
        </TabsContent>
      </Tabs>

      {/* Add item dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add item to drop</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="item-select">Product</Label>
              <select
                id="item-select"
                value={selectedItemId}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="w-full h-9 rounded-3 border border-neutral-7 bg-surface px-3 text-size-2 text-neutral-12 focus:outline-2 focus:outline-accent-8"
                required
              >
                {libraryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-price">Price for this drop ($)</Label>
              <Input
                id="item-price"
                type="number"
                min="0"
                step="0.01"
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-qty">Quantity available</Label>
              <Input
                id="item-qty"
                type="number"
                min="1"
                step="1"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button type="submit" size="sm">Add item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
