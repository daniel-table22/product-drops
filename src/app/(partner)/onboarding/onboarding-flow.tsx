"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createPartner, generatePreview } from "./actions";
import type { ToneData, PreviewData } from "./actions";

// ─── helpers ─────────────────────────────────────────────────────────────────

function slugify(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeUrl(url: string) {
  if (!url) return url;
  return url.startsWith("http") ? url : `https://${url}`;
}

// ─── step label ───────────────────────────────────────────────────────────────

function StepLabel({ step, label }: { step: string; label: string }) {
  return (
    <p className="text-xs font-medium tracking-widest uppercase text-neutral-9 mb-3">
      {step} · {label}
    </p>
  );
}

// ─── step 1: the boring part ──────────────────────────────────────────────────

function Step1({
  onComplete,
}: {
  onComplete: (partnerId: string, email: string, businessName: string, websiteUrl: string) => void;
}) {
  const [suffix] = useState(() => String(Math.floor(1000 + Math.random() * 9000)));
  const [email, setEmail] = useState(() => `test+${suffix}@noreply.fake`);
  const [businessName, setBusinessName] = useState("Tartine Bakery");
  const [slug, setSlug] = useState(() => `tartine-bakery-${suffix}`);
  const [slugEdited, setSlugEdited] = useState(false);
  const [phone, setPhone] = useState("+1 415 555 0100");
  const [pickupAddress, setPickupAddress] = useState("600 Guerrero St, San Francisco, CA 94110");
  const [websiteUrl, setWebsiteUrl] = useState("https://tartinebakery.com");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function handleNameChange(v: string) {
    setBusinessName(v);
    if (!slugEdited) setSlug(slugify(v));
  }

  function handleSlugChange(v: string) {
    setSlugEdited(true);
    setSlug(slugify(v));
    setFieldErrors((prev) => ({ ...prev, slug: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const result = await createPartner(
      {
        email,
        businessName,
        slug,
        pickupAddress,
        phone,
        websiteUrl: websiteUrl ? normalizeUrl(websiteUrl) : "",
      },
      window.location.origin
    );

    setLoading(false);

    if ("error" in result) {
      if (result.field) setFieldErrors({ [result.field]: result.error });
      else setError(result.error);
      return;
    }

    onComplete(result.partnerId, result.email, businessName, normalizeUrl(websiteUrl));
  }

  return (
    <div className="w-full max-w-md">
      <StepLabel step="01" label="Setup" />
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-12 mb-1">
        The Boring Part
      </h1>
      <p className="text-sm text-neutral-10 mb-8">
        Two minutes. Everything can be edited later.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            autoFocus
          />
          {fieldErrors.email && (
            <p className="text-xs text-red-600">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="businessName">Business name</Label>
          <Input
            id="businessName"
            required
            value={businessName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Tartine Bakery"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Your store URL</Label>
          <div className="flex items-center rounded-md border border-neutral-7 bg-surface transition-colors focus-within:border-accent-8 focus-within:ring-1 focus-within:ring-accent-8">
            <span className="select-none pl-3 text-sm text-neutral-9 whitespace-nowrap">
              productdrops.com/s/
            </span>
            <input
              id="slug"
              required
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="flex-1 bg-transparent py-2 pr-3 text-sm text-neutral-12 outline-none"
              placeholder="tartine-bakery"
            />
          </div>
          {fieldErrors.slug && (
            <p className="text-xs text-red-600">{fieldErrors.slug}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (415) 555-0100"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pickupAddress">Pickup address</Label>
          <Input
            id="pickupAddress"
            required
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            placeholder="600 Guerrero St, San Francisco, CA 94110"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="websiteUrl">
            Website{" "}
            <span className="text-neutral-9 font-normal">
              (so we can learn your brand)
            </span>
          </Label>
          <Input
            id="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://tartinebakery.com"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading || !slug} className="w-full">
          {loading ? "Creating your account…" : "Continue →"}
        </Button>
      </form>
    </div>
  );
}

// ─── step 2: the mystery part ─────────────────────────────────────────────────

type OgData = {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  site_name?: string | null;
};

// null = still loading, object = resolved (may be empty if fetch failed)
type SourceCard = { url: string; label: string; og: OgData | null };

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function OgCard({ card }: { card: SourceCard }) {
  const domain = getDomain(card.url);
  const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  const loading = card.og === null;
  const hasImage = !!card.og?.image;

  return (
    <div
      className="rounded-xl border border-neutral-5 bg-white shadow-sm overflow-hidden"
      style={{ animation: "cardIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
    >
      {/* Image — landscape 16:9 */}
      {loading ? (
        <div className="aspect-video bg-neutral-2 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-neutral-4 border-t-neutral-9 animate-spin" />
        </div>
      ) : hasImage ? (
        <div className="aspect-video overflow-hidden bg-neutral-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.og!.image!} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      ) : (
        <div className="aspect-video bg-neutral-2 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={favicon} alt="" className="w-8 h-8 opacity-25" />
        </div>
      )}

      {/* Meta */}
      <div className="px-2.5 py-2">
        <div className="flex items-center gap-1.5 mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={favicon} alt="" className="w-3 h-3 shrink-0" />
          <p className="text-[10px] text-neutral-8 truncate">{domain}</p>
        </div>
        {loading ? (
          <div className="h-2.5 bg-neutral-3 rounded w-3/4" />
        ) : (
          <p className="text-[11px] font-medium text-neutral-12 leading-snug line-clamp-2">
            {card.og?.title ?? card.label}
          </p>
        )}
      </div>
    </div>
  );
}

function Step2({
  partnerId,
  email,
  businessName,
  websiteUrl,
  onComplete,
  onSkip,
  onRetry,
}: {
  partnerId: string;
  email: string;
  businessName: string;
  websiteUrl: string;
  onComplete: (tone: ToneData, preview: PreviewData) => void;
  onSkip: () => void;
  onRetry: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<SourceCard[]>([]);
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function run() {
      try {
        const res = await fetch("/api/onboarding/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ partnerId, email, businessName, websiteUrl }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Research failed");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let resolvedTone: ToneData | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            const data = JSON.parse(line.slice(6)) as Record<string, unknown>;

            if (data.type === "searching") {
              setCurrentQuery(data.query as string);
            } else if (data.type === "source") {
              const url = data.url as string;
              const label = data.label as string;
              setCards((c) => [...c, { url, label, og: null }]);
              fetch(`/api/og?url=${encodeURIComponent(url)}`)
                .then((r) => (r.ok ? r.json() : {}))
                .then((og: OgData) => {
                  setCards((c) => c.map((card) => card.url === url ? { ...card, og } : card));
                })
                .catch(() => {
                  setCards((c) => c.map((card) => card.url === url ? { ...card, og: {} } : card));
                });
            } else if (data.type === "done") {
              resolvedTone = data.tone as ToneData;
            } else if (data.type === "error") {
              throw new Error(data.message as string);
            }
          }
        }

        if (!resolvedTone) throw new Error("No tone data received");

        const previewResult = await generatePreview(resolvedTone, businessName);
        if ("error" in previewResult) throw new Error(previewResult.error);

        onComplete(resolvedTone, previewResult.preview);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="w-full max-w-md text-center">
        <StepLabel step="02" label="Brand research" />
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-12 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-neutral-10 mb-8">{error}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={onRetry}>Try again</Button>
          <Button variant="outline" onClick={onSkip}>
            Skip for now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1000px]">
      <StepLabel step="02" label="Brand research" />
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-12 mb-1">
        The Mystery Part
      </h1>
      <p className="text-sm text-neutral-10 mb-6">
        Reading everything we can find about your brand.
      </p>

      {/* Spinner + query */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-3 h-3 rounded-full border-2 border-neutral-4 border-t-neutral-9 animate-spin shrink-0" />
        {currentQuery ? (
          <p
            className="text-xs text-neutral-8 italic truncate"
            style={{ animation: "fadeSlideIn 0.2s ease both" }}
          >
            Searching: &ldquo;{currentQuery}&rdquo;
          </p>
        ) : (
          <p className="text-xs text-neutral-8">
            {cards.length === 0 ? "Starting up…" : "Building your preview…"}
          </p>
        )}
      </div>

      {/* Card grid — landscape cards, wider layout */}
      {cards.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-6">
          {cards.map((card) => (
            <OgCard key={card.url} card={card} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── step 3: the magic mart ───────────────────────────────────────────────────

const PREVIEW_PHOTOS = [
  "/preview-photos/photo-1.jpeg",
  "/preview-photos/photo-2.jpeg",
  "/preview-photos/photo-3.png",
  "/preview-photos/photo-4.png",
  "/preview-photos/photo-5.jpeg",
];

// Phone bezel constants (matches /public/bezel.png)
const BEZEL_W = 447, BEZEL_H = 906;
const SCREEN_X = 25, SCREEN_Y = 19;
const SCREEN_W = 393;
const SCALE = 0.62;

function DropPhonePreview({
  drop,
  businessName,
}: {
  drop: PreviewData["drop"];
  businessName: string;
}) {
  return (
    <div style={{ position: "relative", width: BEZEL_W * SCALE, height: BEZEL_H * SCALE, flexShrink: 0, margin: "0 auto" }}>
      {/* Screen area — clips content */}
      <div style={{
        position: "absolute",
        left: SCREEN_X * SCALE,
        top: SCREEN_Y * SCALE,
        width: SCREEN_W * SCALE,
        height: (BEZEL_H - SCREEN_Y * 2) * SCALE,
        overflow: "hidden",
        borderRadius: 28 * SCALE,
        backgroundColor: "#fff",
      }}>
        {/* Content rendered at real 393px width, scaled down */}
        <div style={{ width: SCREEN_W, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
          {/* ── exact drop-storefront.tsx markup ── */}
          <div style={{ backgroundColor: "#fff", color: "#242021", fontFamily: "system-ui,-apple-system,sans-serif" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 20px 12px" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.7 }}>
                {businessName}
              </p>
            </div>

            {/* Drop info */}
            <div style={{ margin: "0 8px", padding: "8px 0 24px", display: "flex", flexDirection: "column", gap: 8, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>{drop.name}</p>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.6 }}>Sat, Apr 19 · Your City</p>
              {drop.description && (
                <p style={{ margin: 0, fontSize: 16, opacity: 0.7, lineHeight: 1.5, padding: "0 16px" }}>{drop.description}</p>
              )}
              <p style={{ margin: 0, fontSize: 16, fontFamily: "monospace", color: "#16a34a" }}>Orders close in 4h 32m</p>
            </div>

            {/* Items */}
            <div style={{ margin: "0 8px", display: "flex", flexDirection: "column", gap: 32 }}>
              {drop.items.map((item, i) => (
                <div key={i}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {/* Photo — 62% width square */}
                    <div style={{ flexShrink: 0, width: "62%", aspectRatio: "1/1", borderRadius: 4, overflow: "hidden", backgroundColor: "#f0efee" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={PREVIEW_PHOTOS[i % PREVIEW_PHOTOS.length]}
                        alt={item.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    {/* Right controls */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ alignSelf: "flex-start", fontSize: 14, fontWeight: 500, padding: "4px 10px", borderRadius: 4, backgroundColor: "rgba(0,164,51,0.1)", color: "rgba(0,113,63,0.87)" }}>
                          12 left
                        </span>
                        <p style={{ margin: 0, fontFamily: "monospace", fontSize: 24, lineHeight: "24px", color: "#242021" }}>
                          ${(item.price_cents / 100).toFixed(2)}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ flex: 1, height: 56, borderRadius: 4, backgroundColor: "#e2e2e2", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}>
                          <span style={{ fontSize: 20, color: "#242021" }}>−</span>
                        </button>
                        <button style={{ flex: 1, height: 56, borderRadius: 4, backgroundColor: "#242021", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "default" }}>
                          <span style={{ fontSize: 20, color: "white" }}>+</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Name + description */}
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                    <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#242021" }}>{item.name}</p>
                    {item.description && (
                      <p style={{ margin: 0, fontSize: 16, opacity: 0.6, lineHeight: 1.5, color: "#242021" }}>{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ height: 40 }} />
          </div>
        </div>

        {/* Fade gradient at bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to bottom, transparent, white)", pointerEvents: "none" }} />
      </div>

      {/* Bezel overlay */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bezel.png"
        alt=""
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", userSelect: "none" }}
      />
    </div>
  );
}

function PhoneBezel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", width: BEZEL_W * SCALE, height: BEZEL_H * SCALE, flexShrink: 0, margin: "0 auto" }}>
      <div style={{
        position: "absolute",
        left: SCREEN_X * SCALE,
        top: SCREEN_Y * SCALE,
        width: SCREEN_W * SCALE,
        height: (BEZEL_H - SCREEN_Y * 2) * SCALE,
        overflow: "hidden",
        borderRadius: 28 * SCALE,
        backgroundColor: "#fff",
      }}>
        <div style={{ width: SCREEN_W, transform: `scale(${SCALE})`, transformOrigin: "top left" }}>
          {children}
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to bottom, transparent, white)", pointerEvents: "none" }} />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bezel.png" alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", userSelect: "none" }} />
    </div>
  );
}

function SmsPhoneContent({ sms, businessName }: { sms: string; businessName: string }) {
  return (
    <div style={{ position: "relative", height: 843, backgroundColor: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", overflow: "hidden" }}>
      {/* Navigation bar — status bar area + avatar + brand name */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 118, backgroundColor: "#f4f4f4", borderBottom: "1px solid #ddd" }}>
        <div style={{
          position: "absolute", left: "50%", top: 68,
          transform: "translateX(-50%) translateY(-50%)",
          width: 40, height: 40, borderRadius: "50%", backgroundColor: "#784545",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "white", fontSize: 16, fontWeight: 600 }}>{businessName.charAt(0).toUpperCase()}</span>
        </div>
        <p style={{
          position: "absolute", left: "50%", top: 100,
          transform: "translateX(-50%) translateY(-50%)",
          margin: 0, fontSize: 11, color: "#000", whiteSpace: "nowrap",
        }}>{businessName}</p>
      </div>

      {/* Photo bubble */}
      <div style={{ position: "absolute", top: 146, left: 36, width: 338, height: 332, backgroundColor: "#e6e5eb", borderRadius: 12, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PREVIEW_PHOTOS[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>

      {/* Text bubble */}
      <div style={{ position: "absolute", top: 504, left: 15, width: 325, backgroundColor: "#e6e5eb", borderRadius: 12, padding: 12 }}>
        {/* Bubble tail */}
        <div style={{ position: "absolute", bottom: -12, left: 3, width: 20, height: 14 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sms-chrome/tail.svg" alt="" style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
        <p style={{ margin: 0, fontSize: 21, lineHeight: "26px", color: "#000" }}>{sms}</p>
      </div>

      {/* Static bottom bar — iMessage input + home indicator */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/sms-chrome/static.png"
        alt=""
        style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 87, objectFit: "cover", pointerEvents: "none", userSelect: "none" }}
      />
    </div>
  );
}

function EmailPhoneContent({ email, businessName }: { email: PreviewData["email"]; businessName: string }) {
  return (
    <div style={{ position: "relative", height: 844, backgroundColor: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px 0", flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.3 }}>9:41</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="black"><rect x="0" y="7" width="3" height="5" rx="0.5"/><rect x="4.5" y="5" width="3" height="7" rx="0.5"/><rect x="9" y="3" width="3" height="9" rx="0.5"/><rect x="13.5" y="0" width="3" height="12" rx="0.5" fillOpacity="0.35"/></svg>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none"><path d="M8 2.4C10.3 2.4 12.4 3.4 13.9 5L15.4 3.5C13.5 1.6 10.9 0.5 8 0.5C5.1 0.5 2.5 1.6 0.6 3.5L2.1 5C3.6 3.4 5.7 2.4 8 2.4Z" fill="black"/><path d="M8 5.3C9.5 5.3 10.9 5.9 11.9 6.9L13.4 5.4C12 4 10.1 3.2 8 3.2C5.9 3.2 4 4 2.6 5.4L4.1 6.9C5.1 5.9 6.5 5.3 8 5.3Z" fill="black"/><circle cx="8" cy="10" r="1.5" fill="black"/></svg>
          <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke="black" strokeOpacity="0.35"/><rect x="2" y="2" width="18" height="9" rx="2" fill="black"/><path d="M24 4.5V8.5C25.1 8.2 26 7.4 26 6.5C26 5.6 25.1 4.8 24 4.5Z" fill="black" fillOpacity="0.4"/></svg>
        </div>
      </div>

      {/* Nav bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 16px 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#007aff" }}>
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round"><polyline points="9 1 1 8.5 9 16"/></svg>
          <span style={{ fontSize: 17, color: "#007aff" }}>Inbox</span>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: 1, backgroundColor: "#e5e5ea", flexShrink: 0 }} />

      {/* Subject */}
      <div style={{ padding: "16px 16px 12px", flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#000", lineHeight: 1.25 }}>{email.subject}</p>
      </div>

      {/* Sender row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px 14px", flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "#784545", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "white", fontSize: 16, fontWeight: 600 }}>{businessName.charAt(0).toUpperCase()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#000", lineHeight: 1.3 }}>{businessName}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#888", lineHeight: 1.3 }}>To: me</p>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#888", flexShrink: 0 }}>Today</p>
      </div>

      {/* Separator */}
      <div style={{ height: 1, backgroundColor: "#e5e5ea", flexShrink: 0 }} />

      {/* Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PREVIEW_PHOTOS[2]} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block", flexShrink: 0 }} />

      {/* Body */}
      <div style={{ padding: "16px", flex: 1, overflow: "hidden" }}>
        <p style={{ margin: 0, fontSize: 21, color: "#000", lineHeight: 1.5 }}>{email.body}</p>
      </div>

      {/* Home indicator */}
      <div style={{ height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, backgroundColor: "#000" }} />
      </div>
    </div>
  );
}

function InstagramPhoneContent({ instagram, businessName }: { instagram: string; businessName: string }) {
  return (
    <div style={{ position: "relative", height: 844, backgroundColor: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", color: "#000", overflow: "hidden" }}>
      {/* Header bitmap — status bar + Instagram wordmark + icons */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/instagram-chrome/header.png"
        alt=""
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 91, objectFit: "cover", objectPosition: "top", pointerEvents: "none", userSelect: "none" }}
      />

      {/* Dynamic content — starts at 88px per Figma layout */}
      <div style={{ position: "absolute", top: 88, left: 0, width: "100%" }}>
        {/* Post header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", height: 50, backgroundColor: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              padding: 2,
            }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", backgroundColor: "#e0d6cc", border: "2px solid white" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{businessName}</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>···</span>
        </div>

        {/* Photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PREVIEW_PHOTOS[3]} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />

        {/* Action icons bitmap */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/instagram-chrome/actions.png"
          alt=""
          style={{ width: "100%", height: 44, objectFit: "cover", display: "block", pointerEvents: "none" }}
        />

        {/* Caption */}
        <div style={{ padding: "4px 12px 0", backgroundColor: "#fff" }}>
          <p style={{ margin: 0, fontSize: 21, color: "#000", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
            <span style={{ fontWeight: 700 }}>{businessName} </span>
            {instagram}
          </p>
        </div>
      </div>

      {/* Footer bitmap — anchored to bottom */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/instagram-chrome/footer.png"
        alt=""
        style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 95, objectFit: "cover", pointerEvents: "none", userSelect: "none" }}
      />
    </div>
  );
}

function Step3({
  tone,
  preview,
  businessName,
  email,
}: {
  tone: ToneData;
  preview: PreviewData;
  businessName: string;
  email: string;
}) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="text-4xl mb-6">✉️</div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-12 mb-2">
          Check your inbox
        </h1>
        <p className="text-sm text-neutral-10">
          We sent a magic link to <span className="font-medium text-neutral-12">{email}</span>.
          Click it to open your dashboard.
        </p>
        <p className="text-xs text-neutral-8 mt-4">
          You can close this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl">
      <StepLabel step="03" label="Preview" />
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-12 mb-1">
        The Magic Mart
      </h1>
      <p className="text-sm text-neutral-10 mb-2">
        Everything below is{" "}
        <span className="font-medium text-neutral-11">placeholder content</span>{" "}
        in your brand&apos;s voice. Edit it all in your dashboard.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {tone.tone.adjectives.map((adj) => (
          <span
            key={adj}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-3 text-neutral-11"
          >
            {adj}
          </span>
        ))}
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-3 text-neutral-9 italic">
          {tone.business_type}
        </span>
      </div>

      <div className="mb-8 max-w-[800px]">
        <p className="text-base text-neutral-12 leading-relaxed">{tone.tone.summary}</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 mb-10 justify-items-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-neutral-10 uppercase tracking-widest">Drop page</p>
          <DropPhonePreview drop={preview.drop} businessName={businessName} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-neutral-10 uppercase tracking-widest">SMS</p>
          <PhoneBezel>
            <SmsPhoneContent sms={preview.sms} businessName={businessName} />
          </PhoneBezel>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-neutral-10 uppercase tracking-widest">Instagram</p>
          <PhoneBezel>
            <InstagramPhoneContent instagram={preview.instagram} businessName={businessName} />
          </PhoneBezel>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-neutral-10 uppercase tracking-widest">Email</p>
          <PhoneBezel>
            <EmailPhoneContent email={preview.email} businessName={businessName} />
          </PhoneBezel>
        </div>
      </div>

      <div className="border-t border-neutral-5 pt-6 flex items-center justify-between">
        <p className="text-xs text-neutral-9">
          ✦ AI-generated preview · your real drops will look even better
        </p>
        <Button onClick={() => setDone(true)} className="shrink-0">
          Go to dashboard →
        </Button>
      </div>
    </div>
  );
}

// ─── main flow ────────────────────────────────────────────────────────────────

export function OnboardingFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [partnerId, setPartnerId] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [tone, setTone] = useState<ToneData | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [step2Key, setStep2Key] = useState(0);

  function handleStep1Complete(
    id: string,
    em: string,
    name: string,
    url: string
  ) {
    setPartnerId(id);
    setEmail(em);
    setBusinessName(name);
    setWebsiteUrl(url);
    // Skip research if no website provided
    if (url) {
      setStep(2);
    } else {
      // No website — show check email screen directly
      setStep(3);
    }
  }

  function handleResearchComplete(t: ToneData, p: PreviewData) {
    setTone(t);
    setPreview(p);
    setStep(3);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-[#fafaf8]">
      {step === 1 && <Step1 onComplete={handleStep1Complete} />}
      {step === 2 && (
        <Step2
          key={step2Key}
          partnerId={partnerId}
          email={email}
          businessName={businessName}
          websiteUrl={websiteUrl}
          onComplete={handleResearchComplete}
          onSkip={() => setStep(3)}
          onRetry={() => setStep2Key((k) => k + 1)}
        />
      )}
      {step === 3 && tone && preview && (
        <Step3
          tone={tone}
          preview={preview}
          businessName={businessName}
          email={email}
        />
      )}
      {/* No website or research skipped — just show check email */}
      {step === 3 && (!tone || !preview) && (
        <div className="w-full max-w-md text-center">
          <div className="text-4xl mb-6">✉️</div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-12 mb-2">
            You&apos;re all set
          </h1>
          <p className="text-sm text-neutral-10">
            We sent a magic link to{" "}
            <span className="font-medium text-neutral-12">{email}</span>. Click
            it to open your dashboard.
          </p>
          <p className="text-xs text-neutral-8 mt-4">You can close this tab.</p>
        </div>
      )}
    </div>
  );
}
