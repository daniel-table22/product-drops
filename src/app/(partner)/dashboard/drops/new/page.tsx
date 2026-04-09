import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { createDrop } from "../actions";

export default async function NewDropPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  return (
    <div className="px-8 py-10 max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <a href="/dashboard/drops">← Back</a>
        </Button>
        <PageHeader title="New drop" />
      </div>

      <form action={createDrop} className="space-y-6">
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
          userId={user.id}
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
          <Button type="submit" size="sm">Save draft</Button>
        </div>
      </form>
    </div>
  );
}
