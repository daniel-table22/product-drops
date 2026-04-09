"use client";

import { useState } from "react";
import type { Tables } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createItem, updateItem, archiveItem } from "./actions";

type Item = Tables<"items">;

export function ProductsClient({ items, userId }: { items: Item[]; userId: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    setDialogOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    if (editing) {
      await updateItem(editing.id, formData);
    } else {
      await createItem(formData);
    }
    setDialogOpen(false);
  }

  async function handleArchive(id: string) {
    await archiveItem(id);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-size-2 text-neutral-10">{items.length} product{items.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={openCreate}>New product</Button>
      </div>

      {items.length === 0 ? (
        <p className="text-size-2 text-neutral-10">No products yet. Add your first product to get started.</p>
      ) : (
        <div className="border border-neutral-6 rounded-4 overflow-hidden">
          <table className="w-full text-size-2">
            <thead className="bg-neutral-2 border-b border-neutral-6">
              <tr>
                <th className="px-4 py-3 w-14"></th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Name</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-11">Description</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-11">Default price</th>
                <th className="px-4 py-3 text-right font-medium text-neutral-11"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-6">
              {items.map((item) => (
                <tr key={item.id} className="bg-surface hover:bg-neutral-2 transition-colors">
                  <td className="px-4 py-3">
                    {item.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photo_url} alt={item.name} className="w-10 h-10 rounded-3 object-cover bg-neutral-3" />
                    ) : (
                      <div className="w-10 h-10 rounded-3 bg-neutral-3" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-12 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-neutral-11">{item.description ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-neutral-12">
                    ${(item.default_price_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                        Edit
                      </Button>
                      <form action={() => handleArchive(item.id)}>
                        <Button size="sm" variant="ghost" type="submit"
                          className="text-neutral-10 hover:text-error-11">
                          Archive
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" defaultValue={editing?.description ?? ""} />
            </div>
            <ImageUpload
              name="photo_url"
              label="Photo"
              defaultUrl={editing?.photo_url ?? null}
              userId={userId}
              storagePath="item"
              previewShape="square"
            />
            <div className="space-y-1.5">
              <Label htmlFor="default_price_cents">Price ($)</Label>
              <Input
                id="default_price_cents"
                name="default_price_cents"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editing ? (editing.default_price_cents / 100).toFixed(2) : ""}
                required
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm">Cancel</Button>
              </DialogClose>
              <Button type="submit" size="sm">{editing ? "Save changes" : "Create product"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
