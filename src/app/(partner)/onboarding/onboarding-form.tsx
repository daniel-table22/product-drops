"use client";

import { useState } from "react";
import { signUpPartner } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingForm() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function handleBusinessNameChange(value: string) {
    setBusinessName(value);
    if (!slugEdited) setSlug(slugify(value));
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
    setEmailError(null);
    setLoading(true);

    const result = await signUpPartner({ email, businessName, slug, pickupAddress });

    setLoading(false);

    if ("error" in result) {
      if (result.field === "slug") setSlugError(result.error);
      else if (result.field === "email") setEmailError(result.error);
      else setError(result.error);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-3">
        <div className="rounded-4 border border-accent-6 bg-accent-2 p-4 text-size-2 text-accent-11">
          Almost there — check your email and click the link we sent to <strong>{email}</strong> to access your dashboard.
        </div>
        <p className="text-center text-size-1 text-neutral-9">
          Didn&apos;t get it? Check your spam folder or{" "}
          <button
            type="button"
            onClick={() => setDone(false)}
            className="underline hover:text-neutral-11"
          >
            try again
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
          placeholder="you@yourbusiness.com"
        />
        {emailError && <p className="text-size-1 text-error-11">{emailError}</p>}
      </div>

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
        {loading ? "Setting up…" : "Get started"}
      </Button>
    </form>
  );
}
