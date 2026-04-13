"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const anthropic = new Anthropic();

export type ToneData = {
  tone: { adjectives: string[]; summary: string };
  business_type: string;
  product_examples: string[];
  sources: Array<{ label: string; url: string }>;
};

export type PreviewData = {
  sms: string;
  email: { subject: string; body: string };
  instagram: string;
  drop: {
    name: string;
    description: string;
    items: { name: string; description: string; price_cents: number }[];
  };
};

function extractJson(text: string): string {
  const stripped = text.trim();
  if (stripped.startsWith("```")) {
    return stripped.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start !== -1 && end !== -1) return stripped.slice(start, end + 1);
  return stripped;
}

export async function createPartner(
  data: {
    email: string;
    businessName: string;
    slug: string;
    pickupAddress: string;
    phone: string;
    websiteUrl: string;
  },
  origin: string
): Promise<{ partnerId: string; email: string } | { error: string; field?: "slug" | "email" }> {
  const serviceClient = createServiceClient();

  // Create Supabase auth user via admin API (no email sent yet)
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email: data.email,
    email_confirm: true, // mark confirmed so no separate confirmation email fires
  });

  if (authError) {
    const msg = authError.message.toLowerCase();
    if (msg.includes("already") || msg.includes("exists")) {
      return {
        error: "An account with this email already exists. Check your inbox for a magic link.",
        field: "email",
      };
    }
    return { error: authError.message };
  }

  const userId = authData.user.id;

  // Create partner row
  const { data: row, error: partnerError } = await serviceClient
    .from("partners")
    .insert({
      user_id: userId,
      email: data.email,
      business_name: data.businessName,
      slug: data.slug,
      pickup_address: data.pickupAddress,
      phone: data.phone || null,
      website_url: data.websiteUrl || null,
      onboarding_state: "profile_complete",
    })
    .select("id")
    .single();

  if (partnerError) {
    // Roll back auth user if partner insert fails
    await serviceClient.auth.admin.deleteUser(userId);
    if (partnerError.code === "23505") {
      return { error: "That URL is already taken. Try a different one.", field: "slug" };
    }
    return { error: partnerError.message };
  }

  // Send magic link so they can return to the dashboard later
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email: data.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  return { partnerId: row.id, email: data.email };
}

export async function generatePreview(
  tone: ToneData,
  businessName: string
): Promise<{ preview: PreviewData } | { error: string }> {
  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: `You write marketing copy for food and hospitality brands. Return ONLY valid JSON — no surrounding text, no markdown.`,
      messages: [
        {
          role: "user",
          content: `Write placeholder marketing materials for a product drop for this brand.

Business: ${businessName}
Type: ${tone.business_type}
Voice: ${tone.tone.summary}
Adjectives: ${tone.tone.adjectives.join(", ")}
Products they sell: ${tone.product_examples.join(", ")}

Invent a realistic drop with 3 items. Write everything in their exact voice — match their capitalization, cadence, and personality.

Return exactly this JSON shape:
{
  "sms": "SMS under 160 characters in their voice",
  "email": {
    "subject": "email subject line",
    "body": "3–4 sentence email body in their voice"
  },
  "instagram": "instagram caption in their voice with a few relevant hashtags",
  "drop": {
    "name": "creative drop name that fits the brand",
    "description": "1–2 sentence drop description in their voice",
    "items": [
      { "name": "item name", "description": "one sentence that sells it", "price_cents": 1200 },
      { "name": "item name", "description": "one sentence that sells it", "price_cents": 800 },
      { "name": "item name", "description": "one sentence that sells it", "price_cents": 1800 }
    ]
  }
}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text");

    return { preview: JSON.parse(extractJson(textBlock.text)) };
  } catch (error) {
    console.error("Generate error:", error);
    return { error: "Failed to generate preview" };
  }
}
