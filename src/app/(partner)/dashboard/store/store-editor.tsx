"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ImageUpload } from "@/components/image-upload";
import { updateStore } from "./actions";
import type { Tables } from "@/types/database";

type Partner = Tables<"partners">;

const FONT_OPTIONS = [
  { value: "sans",    label: "Sans-serif (default)" },
  { value: "serif",   label: "Serif" },
  { value: "display", label: "Display (elegant serif)" },
  { value: "mono",    label: "Monospace" },
];

const fontFamilies: Record<string, string> = {
  sans:    "system-ui, -apple-system, sans-serif",
  serif:   "Georgia, 'Times New Roman', serif",
  display: "'Palatino Linotype', Palatino, 'Book Antiqua', serif",
  mono:    "'Courier New', Courier, monospace",
};

// Bezel: 447×906, screen at x=25 y=19, size 393×859
// We scale to 80% so the container is ~358×725
const SCALE = 0.80;
const BEZEL_W = 447;
const BEZEL_H = 906;
const SCREEN_X = 25;
const SCREEN_Y = 19;
const SCREEN_W = 393;
const SCREEN_H = 859;

export function StoreEditor({ partner, userId }: { partner: Partner; userId: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewTab, setPreviewTab] = useState<"storefront" | "drop">("storefront");

  const storefrontUrl = `/s/${partner.slug}`;
  const dropUrl = partner.slug ? `/s/${partner.slug}/d/preview` : null;
  const iframeSrc = previewTab === "drop" && dropUrl ? dropUrl : storefrontUrl;

  function send(updates: Record<string, string>) {
    iframeRef.current?.contentWindow?.postMessage({ type: "theme-preview", ...updates }, "*");
  }

  function onIframeLoad() {
    send({
      bgColor: partner.bg_color ?? "#faf9f6",
      fgColor: partner.fg_color ?? "#000000",
      accentColor: partner.accent_color ?? "#501b00",
      fontFamily: fontFamilies[partner.font_style ?? "sans"],
    });
  }

  return (
    <div className="flex gap-10 px-8 py-10 min-h-0">
      {/* Left: form */}
      <div className="w-[510px] shrink-0 space-y-8">
        <PageHeader title="Store" size="large" />

        <form action={updateStore} className="space-y-6">
          <div className="space-y-4">
            <Separator />
            <h2 className="text-size-3 font-medium text-neutral-12">Business details</h2>

            <div className="space-y-1.5">
              <Label htmlFor="business_name">Business name</Label>
              <Input id="business_name" name="business_name" defaultValue={partner.business_name} required />
            </div>

            <div className="space-y-1.5">
              <Label>Store URL</Label>
              {partner.slug ? (
                <>
                  <p className="text-size-2 text-neutral-11 font-mono">/s/{partner.slug}</p>
                  <input type="hidden" name="slug" value={partner.slug} />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-size-2 text-neutral-10">/s/</span>
                    <Input id="slug" name="slug" required pattern="[a-z0-9-]+" placeholder="your-store" />
                  </div>
                  <p className="text-size-1 text-neutral-10">Lowercase letters, numbers, and hyphens only. Cannot be changed later.</p>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pickup_address">Pickup address</Label>
              <Input id="pickup_address" name="pickup_address" defaultValue={partner.pickup_address} required />
            </div>
          </div>

          <div className="space-y-4">
            <Separator />
            <h2 className="text-size-3 font-medium text-neutral-12">Branding</h2>

            <ImageUpload
              name="logo_url"
              label="Logo"
              defaultUrl={partner.logo_url ?? null}
              userId={userId}
              storagePath="logo"
              previewShape="square"
            />

            <ImageUpload
              name="hero_url"
              label="Hero photo"
              defaultUrl={partner.hero_url ?? null}
              userId={userId}
              storagePath="hero"
              previewShape="wide"
            />
          </div>

          <div className="space-y-4">
            <Separator />
            <h2 className="text-size-3 font-medium text-neutral-12">Theme</h2>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="bg_color">Background</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="bg_color"
                    name="bg_color"
                    defaultValue={partner.bg_color}
                    className="h-9 w-9 rounded-3 border border-neutral-6 cursor-pointer p-0.5 bg-transparent"
                    onChange={(e) => send({ bgColor: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fg_color">Foreground</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="fg_color"
                    name="fg_color"
                    defaultValue={partner.fg_color}
                    className="h-9 w-9 rounded-3 border border-neutral-6 cursor-pointer p-0.5 bg-transparent"
                    onChange={(e) => send({ fgColor: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accent_color">Accent</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="accent_color"
                    name="accent_color"
                    defaultValue={partner.accent_color}
                    className="h-9 w-9 rounded-3 border border-neutral-6 cursor-pointer p-0.5 bg-transparent"
                    onChange={(e) => send({ accentColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="font_style">Font style</Label>
              <select
                id="font_style"
                name="font_style"
                defaultValue={partner.font_style ?? "sans"}
                className="w-full rounded-3 border border-neutral-6 bg-transparent px-3 py-2 text-size-2 text-neutral-12 focus:outline-none focus:ring-2 focus:ring-accent-8"
                onChange={(e) => send({ fontFamily: fontFamilies[e.target.value] ?? fontFamilies.sans })}
              >
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm">Save changes</Button>
          </div>
        </form>
      </div>

      {/* Right: phone preview */}
      {partner.slug && (
        <div className="hidden lg:flex flex-col items-center justify-start flex-1 bg-accent-12 -mr-8 -my-10 px-10 pt-10 pb-10 gap-3">
          {/* Preview note */}
          <p className="text-size-1 text-accent-a8 text-center self-center">
            Using placeholder images until assets are uploaded
          </p>
          {/* Tab switcher */}
          <div className="flex gap-1 bg-neutral-3 rounded-3 p-0.5 self-center">
            <button
              type="button"
              onClick={() => setPreviewTab("storefront")}
              className={`px-3 py-1 rounded-2 text-size-1 font-medium transition-colors ${previewTab === "storefront" ? "bg-surface text-neutral-12 shadow-sm" : "text-neutral-10 hover:text-neutral-12"}`}
            >
              Storefront
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("drop")}
              className={`px-3 py-1 rounded-2 text-size-1 font-medium transition-colors ${previewTab === "drop" ? "bg-surface text-neutral-12 shadow-sm" : "text-neutral-10 hover:text-neutral-12"}`}
            >
              Drop page
            </button>
          </div>
          {/* Scale wrapper: outer div has scaled dimensions, inner div is full size + scaled */}
          <div
            style={{
              width: Math.round(BEZEL_W * SCALE),
              height: Math.round(BEZEL_H * SCALE),
              position: "relative",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: BEZEL_W,
                height: BEZEL_H,
                transformOrigin: "top left",
                transform: `scale(${SCALE})`,
              }}
            >
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                key={iframeSrc}
                onLoad={onIframeLoad}
                style={{
                  position: "absolute",
                  left: SCREEN_X,
                  top: SCREEN_Y,
                  width: SCREEN_W,
                  height: SCREEN_H,
                  border: "none",
                  borderRadius: "2.5rem",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/bezel.png"
                alt=""
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: BEZEL_W,
                  height: BEZEL_H,
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
