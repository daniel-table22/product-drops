import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/image-upload";
import { updateDrop } from "../../actions";

function toDateTimeLocal(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

export default async function EditDropPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!partner) redirect("/onboarding");

  const { data: drop } = await supabase
    .from("drops")
    .select("*")
    .eq("id", id)
    .eq("partner_id", partner.id)
    .single();

  if (!drop) notFound();

  const updateDropWithId = updateDrop.bind(null, id);

  return (
    <div className="px-8 py-10 max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <a href={`/dashboard/drops/${id}`}>← Back</a>
        </Button>
        <PageHeader title="Edit drop" size="large" />
      </div>

      <form action={updateDropWithId} className="space-y-6">
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
                defaultValue={toDateTimeLocal(drop.order_window_starts_at)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order_window_ends_at">Closes</Label>
              <Input
                id="order_window_ends_at"
                name="order_window_ends_at"
                type="datetime-local"
                defaultValue={toDateTimeLocal(drop.order_window_ends_at)}
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
                defaultValue={toDateTimeLocal(drop.pickup_window_starts_at)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pickup_window_ends_at">Closes</Label>
              <Input
                id="pickup_window_ends_at"
                name="pickup_window_ends_at"
                type="datetime-local"
                defaultValue={toDateTimeLocal(drop.pickup_window_ends_at)}
                required
              />
            </div>
          </div>
        </fieldset>

        <div className="flex justify-end gap-3">
          <Button asChild variant="outline" size="sm">
            <a href={`/dashboard/drops/${id}`}>Cancel</a>
          </Button>
          <Button type="submit" size="sm">Save changes</Button>
        </div>
      </form>
    </div>
  );
}
