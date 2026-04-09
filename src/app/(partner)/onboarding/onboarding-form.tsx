"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingForm({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleBusinessNameChange(value: string) {
    setBusinessName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    setSlug(slugify(value));
    setSlugError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSlugError(null);
    setLoading(true);

    const supabase = createClient();

    const { error: insertError } = await supabase.from("partners").insert({
      user_id: userId,
      email,
      business_name: businessName,
      slug,
      pickup_address: pickupAddress,
      onboarding_state: "profile_complete",
    });

    setLoading(false);

    if (insertError) {
      if (insertError.code === "23505") {
        setSlugError("That URL is taken. Try a different one.");
      } else {
        setError(insertError.message);
      }
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          type="text"
          required
          value={businessName}
          onChange={(e) => handleBusinessNameChange(e.target.value)}
          placeholder="Tartine Bakery"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">Store URL</Label>
        <div className="flex items-center rounded-3 border border-neutral-7 bg-surface transition-colors focus-within:border-accent-8 focus-within:ring-1 focus-within:ring-accent-8">
          <span className="select-none pl-3 text-size-2 text-neutral-9 whitespace-nowrap">
            productdrops.com/s/
          </span>
          <input
            id="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            className="flex-1 bg-transparent py-2 pr-3 text-size-2 text-neutral-12 outline-none"
            placeholder="tartine-bakery"
          />
        </div>
        {slugError && <p className="text-size-1 text-error-11">{slugError}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pickupAddress">Pickup address</Label>
        <Input
          id="pickupAddress"
          type="text"
          required
          value={pickupAddress}
          onChange={(e) => setPickupAddress(e.target.value)}
          placeholder="600 Guerrero St, San Francisco, CA 94110"
        />
      </div>

      {error && <p className="text-size-2 text-error-11">{error}</p>}

      <Button type="submit" disabled={loading || !slug} className="w-full">
        {loading ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
