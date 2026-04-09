"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { createDrop } from "../actions";

export function NewDropForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(createDrop, null);

  return (
    <div className="px-8 py-10 max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <a href="/dashboard/drops">← Back</a>
        </Button>
        <PageHeader title="New drop" size="large" />
      </div>

      <form action={formAction} className="space-y-6">
        {state?.error && (
          <p className="text-size-2 text-error-11 bg-error-3 border border-error-6 rounded-3 px-4 py-3">
            {state.error}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="name">Drop name</Label>
          <Input id="name" name="name" placeholder="Saturday Bake" required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description (optional)</Label>
          <Input id="description" name="description" placeholder="Our weekly sourdough drop…" />
        </div>

        <ImageUpload
          name="image_url"
          label="Drop photo"
          defaultUrl={null}
          userId={userId}
          storagePath="drop"
          previewShape="wide"
        />

        <fieldset className="space-y-3">
          <legend className="text-size-2 font-medium text-neutral-12">Order window</legend>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="order_window_starts_at">Opens</Label>
              <Input
                id="order_window_starts_at"
                name="order_window_starts_at"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order_window_ends_at">Closes</Label>
              <Input
                id="order_window_ends_at"
                name="order_window_ends_at"
                type="datetime-local"
                required
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-size-2 font-medium text-neutral-12">Pickup window</legend>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pickup_window_starts_at">Opens</Label>
              <Input
                id="pickup_window_starts_at"
                name="pickup_window_starts_at"
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pickup_window_ends_at">Closes</Label>
              <Input
                id="pickup_window_ends_at"
                name="pickup_window_ends_at"
                type="datetime-local"
                required
              />
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end gap-3">
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard/drops">Cancel</a>
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save draft"}
          </Button>
        </div>
      </form>
    </div>
  );
}
