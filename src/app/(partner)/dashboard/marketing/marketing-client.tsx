"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { rewriteMarketingCopy, type MarketingChannel } from "./actions";
import { SectionIntro } from "@/components/section-intro";

// ─── Channel guidance ────────────────────────────────────────────────────────

const guidance: Record<string, { title: string; tips: string[] }> = {
  sms: {
    title: "SMS / Text message",
    tips: [
      "Keep it under 160 characters — anything longer splits into two messages and looks sloppy.",
      "Write like a real person. \"Hey! We're doing a drop Saturday\" beats \"Exciting announcement!\" every time.",
      "One link, one action. People decide in 3 seconds whether to tap.",
      "Best time to send: Tuesday–Thursday, 10am–2pm or 5–7pm local time.",
      "Never start with your business name — that's what the sender field is for.",
    ],
  },
  email: {
    title: "Email",
    tips: [
      "Your subject line does 80% of the work. Under 45 characters. Make it feel like a note, not a newsletter.",
      "Use your first name as the sender — \"Sarah\" not \"Tartine Bakery\". Open rates go up significantly.",
      "Three short paragraphs max. One CTA. No sidebar, no banner, no footer links.",
      "The best marketing emails read like they were written in 10 minutes — casual, specific, human.",
      "Best time to send: Tuesday or Wednesday, 9–11am.",
    ],
  },
  instagram: {
    title: "Instagram",
    tips: [
      "The first line is your hook — it's all that shows before 'more'. Make it visual or surprising.",
      "Sensory language converts. 'Warm sourdough' is better than 'fresh bread'. People should almost smell it.",
      "2–4 emojis woven in, not bolted on at the end. Emojis mid-sentence break up the rhythm.",
      "Local + specific hashtags outperform generic ones. #bayareabread beats #bread every time.",
      "Stories for urgency ('8 left'), Feed for storytelling. Both drive sign-ups differently.",
    ],
  },
};

// ─── Default example copy ────────────────────────────────────────────────────

function defaultSms(businessName: string, slug: string) {
  return `${businessName} is doing small-batch drops. Get first dibs by signing up → [your link]`;
}

function defaultEmailSubject(businessName: string) {
  return `Want in on our next batch?`;
}

function defaultEmailBody(businessName: string, slug: string) {
  return `Hey,

We do small-batch drops — limited quantities of [what you make], available for a short window before they're gone.

If you want to be the first to know when the next one's ready, sign up here: [sign-up link]

No newsletters. Just a text when there's something worth ordering.

— ${businessName}`;
}

function defaultInstagram(businessName: string) {
  return `We bake in small batches. Limited quantities. Gone fast. 🍞

If you want first dibs on the next drop, the link in our bio takes 10 seconds to sign up — we'll text you when it's ready, nothing else.

#smallbatch #localbread #bayareabakery #sourdough #breadbaking`;
}

// ─── Reusable channel block ──────────────────────────────────────────────────

function GuidanceCard({ tips }: { tips: string[] }) {
  return (
    <div className="rounded-3 border border-neutral-6 bg-neutral-2 px-4 py-3 space-y-1.5">
      {tips.map((tip, i) => (
        <p key={i} className="text-size-1 text-neutral-11 leading-relaxed flex gap-2">
          <span className="shrink-0 text-neutral-9 mt-0.5">·</span>
          <span>{tip}</span>
        </p>
      ))}
    </div>
  );
}

function ChannelBlock({
  label,
  channel,
  businessName,
  children,
}: {
  label: string;
  channel: MarketingChannel;
  businessName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 max-w-xl">
      {children}
    </div>
  );
}

function TextareaWithAI({
  label,
  channel,
  defaultValue,
  rows,
  maxLength,
  businessName,
  showCopy = true,
}: {
  label?: string;
  channel: MarketingChannel;
  defaultValue: string;
  rows?: number;
  maxLength?: number;
  businessName: string;
  showCopy?: boolean;
}) {
  const [text, setText] = useState(defaultValue);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);

  async function handleRewrite() {
    if (!text.trim()) return;
    setPending(true);
    const result = await rewriteMarketingCopy(channel, text, prompt, businessName);
    if ("text" in result && result.text) setText(result.text);
    setPending(false);
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-size-2 font-medium text-neutral-11">{label}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={rows ?? 4}
        maxLength={maxLength}
        className="w-full rounded-3 border border-neutral-6 bg-transparent px-3 py-2 text-size-2 text-neutral-12 focus:outline-none focus:ring-2 focus:ring-accent-8 resize-none"
      />
      <div className="flex items-center gap-2">
        {maxLength && (
          <span className="text-size-1 text-neutral-10 shrink-0">{text.length}/{maxLength}</span>
        )}
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Optional prompt…"
          className="h-8 text-size-1 flex-1"
        />
        <Button size="sm" variant="outline" disabled={pending || !text.trim()} onClick={handleRewrite}>
          {pending ? "Rewriting…" : "✦ Rewrite with AI"}
        </Button>
        {showCopy && (
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(text)}>
            Copy
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function MarketingClient({
  businessName,
  partnerSlug,
}: {
  businessName: string;
  partnerSlug: string;
}) {
  const storUrl = typeof window !== "undefined"
    ? `${window.location.origin}/s/${partnerSlug}`
    : `/s/${partnerSlug}`;

  return (
    <div className="px-8 py-10 space-y-10 max-w-3xl">
      <div>
        <PageHeader title="Marketing" size="large" />
        <p className="mt-1 text-size-2 text-neutral-10">
          Create assets to attract new subscribers — people who haven't ordered yet but should know you exist.
        </p>
      </div>

      <SectionIntro
        storageKey="intro_dismissed_marketing"
        illustration="/illustrations/marketing-intro.png"
        title="Grow your audience"
        description="Ready-to-use copy for SMS, email, and Instagram to help you get more subscribers before your next drop."
      >
      <div className="space-y-10">
      {/* ── SMS ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-size-4 font-semibold text-neutral-12">{guidance.sms.title}</h2>
          <p className="text-size-1 text-neutral-10 mt-0.5">A single text message someone can forward to a friend or send to a group chat.</p>
        </div>
        <GuidanceCard tips={guidance.sms.tips} />
        <TextareaWithAI
          channel="sms"
          defaultValue={defaultSms(businessName, partnerSlug)}
          rows={3}
          maxLength={160}
          businessName={businessName}
        />
      </div>

      <Separator />

      {/* ── Email ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-size-4 font-semibold text-neutral-12">{guidance.email.title}</h2>
          <p className="text-size-1 text-neutral-10 mt-0.5">A short personal email to share with your existing contacts. Subject line and body separately so you can optimise each.</p>
        </div>
        <GuidanceCard tips={guidance.email.tips} />
        <TextareaWithAI
          label="Subject line"
          channel="email_subject"
          defaultValue={defaultEmailSubject(businessName)}
          rows={1}
          maxLength={80}
          businessName={businessName}
        />
        <TextareaWithAI
          label="Body"
          channel="email_body"
          defaultValue={defaultEmailBody(businessName, partnerSlug)}
          rows={10}
          businessName={businessName}
        />
      </div>

      <Separator />

      {/* ── Instagram ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-size-4 font-semibold text-neutral-12">{guidance.instagram.title}</h2>
          <p className="text-size-1 text-neutral-10 mt-0.5">A caption to drive people to your storefront sign-up. Pair it with your best food photo.</p>
        </div>
        <GuidanceCard tips={guidance.instagram.tips} />
        <TextareaWithAI
          channel="instagram"
          defaultValue={defaultInstagram(businessName)}
          rows={8}
          businessName={businessName}
        />
      </div>
      </div>
      </SectionIntro>
    </div>
  );
}
