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

// Deterministic scatter per card index
const ROTATIONS = [-3, 2, -5, 4, -2, 5, -4, 3, -1, 4, -3, 2];
const NUDGE_Y   = [0, -5, 3, -7, 5, -3, 7, -2, 4, -6, 2, -4];

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function OgCard({ card, index }: { card: SourceCard; index: number }) {
  const rotate = ROTATIONS[index % ROTATIONS.length];
  const nudge  = NUDGE_Y[index % NUDGE_Y.length];
  const domain = getDomain(card.url);
  const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  const loading = card.og === null;
  const hasImage = !!card.og?.image;

  return (
    <div style={{ transform: `rotate(${rotate}deg) translateY(${nudge}px)` }}>
      <div
        className="rounded-xl border border-neutral-5 bg-white shadow-sm overflow-hidden"
        style={{ animation: "cardIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}
      >
        {/* Image strip */}
        {loading ? (
          <div className="h-24 bg-neutral-3 animate-pulse" />
        ) : hasImage ? (
          <div className="h-24 overflow-hidden bg-neutral-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.og!.image!} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        ) : (
          <div className="h-16 bg-neutral-2 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={favicon} alt="" className="w-6 h-6 opacity-30" />
          </div>
        )}

        {/* Meta */}
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={favicon} alt="" className="w-3 h-3 shrink-0" />
            <p className="text-[10px] text-neutral-8 truncate">{domain}</p>
          </div>
          {loading ? (
            <div className="space-y-1">
              <div className="h-2.5 bg-neutral-3 rounded animate-pulse w-3/4" />
              <div className="h-2.5 bg-neutral-3 rounded animate-pulse w-1/2" />
            </div>
          ) : (
            <p className="text-xs font-medium text-neutral-12 leading-snug line-clamp-2">
              {card.og?.title ?? card.label}
            </p>
          )}
        </div>
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
  const [phase, setPhase] = useState<"streaming" | "reveal">("streaming");
  const [cards, setCards] = useState<SourceCard[]>([]);
  const [currentQuery, setCurrentQuery] = useState<string | null>(null);
  const [tone, setTone] = useState<ToneData | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
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
              // Add card immediately in loading state
              setCards((c) => [...c, { url, label, og: null }]);
              // Fetch OG in background — no await, fire & forget
              fetch(`/api/og?url=${encodeURIComponent(url)}`)
                .then((r) => (r.ok ? r.json() : {}))
                .then((og: OgData) => {
                  setCards((c) =>
                    c.map((card) => card.url === url ? { ...card, og } : card)
                  );
                })
                .catch(() => {
                  setCards((c) =>
                    c.map((card) => card.url === url ? { ...card, og: {} } : card)
                  );
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

        setTone(resolvedTone);
        setPreview(previewResult.preview);
        setCurrentQuery(null);
        setPhase("reveal");
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

  // ── streaming phase: OG card pile ──
  if (phase === "streaming") {
    return (
      <div className="w-full max-w-xl">
        <StepLabel step="02" label="Brand research" />
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-12 mb-1">
          The Mystery Part
        </h1>
        <p className="text-sm text-neutral-10 mb-6">
          Reading everything we can find about your brand.
        </p>

        {/* Spinner + query — always at top */}
        <div className="flex items-center gap-3 mb-4">
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
              {cards.length === 0 ? "Starting up…" : "This takes about a minute…"}
            </p>
          )}
        </div>

        {/* Card grid — up to 6 columns */}
        {cards.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            {cards.map((card, i) => (
              <OgCard key={card.url} card={card} index={i} />
            ))}
          </div>
        )}

        <style>{`
          @keyframes cardIn {
            from { opacity: 0; transform: scale(0.88) translateY(12px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // ── reveal phase: tone + sources summary ──
  return (
    <div className="w-full max-w-lg">
      <StepLabel step="02" label="Brand research" />
      <h1 className="text-3xl font-semibold tracking-tight text-neutral-12 mb-1">
        The Mystery Part
      </h1>
      <p className="text-sm text-neutral-10 mb-8">
        Here&apos;s what we learned about your brand.
      </p>

      {tone && (
        <div className="space-y-6">
          {/* Tone signature */}
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-9 mb-2">
              Tone signature
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tone.tone.adjectives.map((adj) => (
                <span
                  key={adj}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-3 text-neutral-11 border border-neutral-5"
                >
                  {adj}
                </span>
              ))}
            </div>
            <div className="border-l-2 border-[#c8a89a] bg-[#fdf5f2] rounded-r-lg px-4 py-3">
              <p className="text-sm text-neutral-12 leading-relaxed">{tone.tone.summary}</p>
            </div>
          </div>

          {/* Sources */}
          {(tone.sources ?? []).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-neutral-9 mb-2">
                Sources read
              </p>
              <div className="space-y-2">
                {(tone.sources ?? []).map((source, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg border border-neutral-5 bg-white"
                    style={{ animation: `fadeSlideIn 0.3s ease ${i * 80}ms both` }}
                  >
                    <div className="mt-0.5 w-4 h-4 rounded border-2 border-neutral-12 bg-neutral-12 flex items-center justify-center shrink-0">
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-12 leading-snug">{source.label}</p>
                      <p className="text-xs text-neutral-8 truncate mt-0.5">{source.url}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview && (
            <div style={{ animation: "fadeSlideIn 0.3s ease both" }}>
              <Button className="w-full" onClick={() => onComplete(tone, preview)}>
                See the magic →
              </Button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 20px" }}>
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
    <div style={{ backgroundColor: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PREVIEW_PHOTOS[0]} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
      <div style={{ padding: "16px" }}>
        <p style={{ margin: "0 0 12px", fontSize: 11, color: "#888", textAlign: "center", letterSpacing: "0.05em", textTransform: "uppercase" }}>{businessName}</p>
        <div style={{ backgroundColor: "#e5e5ea", borderRadius: "18px 18px 18px 4px", padding: "10px 14px", maxWidth: "85%" }}>
          <p style={{ margin: 0, fontSize: 18, color: "#000", lineHeight: 1.45 }}>{sms}</p>
        </div>
      </div>
    </div>
  );
}

function EmailPhoneContent({ email }: { email: PreviewData["email"] }) {
  return (
    <div style={{ backgroundColor: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PREVIEW_PHOTOS[2]} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#000", lineHeight: 1.3 }}>{email.subject}</p>
        <p style={{ margin: 0, fontSize: 18, color: "#555", lineHeight: 1.55 }}>{email.body}</p>
      </div>
    </div>
  );
}

function InstagramPhoneContent({ instagram }: { instagram: string }) {
  return (
    <div style={{ backgroundColor: "#fff", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PREVIEW_PHOTOS[3]} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", display: "block" }} />
      <div style={{ padding: "12px 16px" }}>
        <p style={{ margin: 0, fontSize: 18, color: "#000", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{instagram}</p>
      </div>
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
            <InstagramPhoneContent instagram={preview.instagram} />
          </PhoneBezel>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-neutral-10 uppercase tracking-widest">Email</p>
          <PhoneBezel>
            <EmailPhoneContent email={preview.email} />
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
