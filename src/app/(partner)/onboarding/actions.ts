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

export async function createPartnerRow(
  data: {
    email: string;
    businessName: string;
    slug: string;
    pickupAddress: string;
  },
  userId: string
): Promise<{ partnerId: string } | { error: string; field?: "slug" }> {
  const serviceClient = createServiceClient();

  const { data: row, error: partnerError } = await serviceClient
    .from("partners")
    .insert({
      user_id: userId,
      email: data.email,
      business_name: data.businessName,
      slug: data.slug,
      pickup_address: data.pickupAddress,
      onboarding_state: "profile_complete",
    })
    .select("id")
    .single();

  if (partnerError) {
    if (partnerError.code === "23505") {
      return { error: "That URL is already taken. Try a different one.", field: "slug" };
    }
    return { error: partnerError.message };
  }

  try {
    await seedPartnerDefaults(row.id, serviceClient);
  } catch {
    // ignore
  }

  return { partnerId: row.id };
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

  // Seed sample items and subscribers — non-fatal if it fails
  try {
    await seedPartnerDefaults(row.id, serviceClient);
  } catch {
    // ignore
  }

  return { partnerId: row.id, email: data.email };
}

// ─── seed defaults ────────────────────────────────────────────────────────────

const SEED_ITEMS = [
  { name: "Lemon Poppyseed Tea Cake",    description: "Bright lemon zest and nutty poppy seeds in a tender, buttery crumb.",                        default_price_cents: 1400, photo_url: "/seed-items/lemon-poppyseed-tea-cake.jpeg" },
  { name: "Blackberry Vegan Crumb Cake", description: "Jammy blackberries folded into a light vegan cake with a golden crumb topping.",              default_price_cents: 1200, photo_url: "/seed-items/blackberry-vegan-crumb-cake.jpeg" },
  { name: "Brownie",                     description: "Dense, fudgy, crackly-topped. The only kind worth making.",                                   default_price_cents:  500, photo_url: "/seed-items/brownie.jpeg" },
  { name: "Lemon Bar",                   description: "Silky lemon curd on a crisp shortbread base, dusted with powdered sugar.",                    default_price_cents:  500, photo_url: "/seed-items/lemon-bar.png" },
  { name: "Rocher",                      description: "A crisp chocolate shell with hazelnut praline and a wafer crunch.",                           default_price_cents:  300, photo_url: "/seed-items/rocher.jpeg" },
  { name: "Gougère",                     description: "Airy choux pastry baked with Gruyère — perfect warm from the oven.",                         default_price_cents:  400, photo_url: "/seed-items/gougere.jpeg" },
  { name: "4\" Lemon Cream Tart",        description: "Delicate pastry shell filled with bright lemon cream and fresh citrus zest.",                 default_price_cents: 1400, photo_url: "/seed-items/4-lemon-cream-tart.jpeg" },
  { name: "4\" Banana Cream Tart",       description: "Vanilla pastry cream layered with ripe banana in a buttery tart shell.",                      default_price_cents: 1400, photo_url: "/seed-items/4-banana-cream-tart.jpeg" },
  { name: "4\" Coconut Cream Tart",      description: "Toasted coconut and velvety cream filling in a crisp pastry shell.",                         default_price_cents: 1400, photo_url: "/seed-items/4-coconut-cream-tart.jpeg" },
  { name: "4\" Chocolate Hazelnut Tart", description: "Rich dark chocolate ganache with roasted hazelnuts in a buttery tart shell.",                 default_price_cents: 1600, photo_url: "/seed-items/4-chocolate-hazelnut-tart.png" },
  { name: "Slice Tres Leches Cake",      description: "Cloud-light sponge soaked in three milks, topped with whipped cream.",                       default_price_cents:  800, photo_url: "/seed-items/slice-tres-leches-cake.jpeg" },
  { name: "Slice Chocolate Soufflé Cake",description: "Intensely chocolatey, almost flourless — rich and deeply satisfying.",                       default_price_cents:  900, photo_url: "/seed-items/slice-chocolate-souffle-cake.png" },
  { name: "Slice Lemon Meringue Cake",   description: "Bright lemon curd layered with soft sponge and torched meringue.",                           default_price_cents:  900, photo_url: "/seed-items/slice-lemon-meringue-cake.png" },
];

const SEED_SUBSCRIBERS = [
  { name: "Sarah Chen",           phone: "+14155550101", email: "sarah.chen@gmail.com",     opted_in: true,  created_at: "2026-01-05T00:00:00Z" },
  { name: "Michael Torres",       phone: "+14085550102", email: "m.torres@yahoo.com",        opted_in: false, created_at: "2026-01-08T00:00:00Z" },
  { name: "Emma Williams",        phone: "+14155550103", email: "emma.w@icloud.com",         opted_in: true,  created_at: "2026-01-12T00:00:00Z" },
  { name: "James Patel",          phone: "+16505550104", email: "jpatel@gmail.com",          opted_in: true,  created_at: "2026-01-15T00:00:00Z" },
  { name: "Olivia Kim",           phone: "+14155550105", email: "olivia.kim@gmail.com",      opted_in: false, created_at: "2026-01-19T00:00:00Z" },
  { name: "Noah Johnson",         phone: "+16505550106", email: "noah.j@outlook.com",        opted_in: true,  created_at: "2026-01-22T00:00:00Z" },
  { name: "Sophia Martinez",      phone: "+14085550107", email: "sophiam@gmail.com",         opted_in: false, created_at: "2026-01-26T00:00:00Z" },
  { name: "Liam Anderson",        phone: "+14155550108", email: "liam.anderson@gmail.com",   opted_in: true,  created_at: "2026-01-29T00:00:00Z" },
  { name: "Ava Thompson",         phone: "+14085550109", email: "ava.thompson@icloud.com",   opted_in: false, created_at: "2026-02-02T00:00:00Z" },
  { name: "Mason Garcia",         phone: "+14155550110", email: "mason.g@gmail.com",         opted_in: true,  created_at: "2026-02-05T00:00:00Z" },
  { name: "Isabella Lee",         phone: "+16505550111", email: "isabella.lee@yahoo.com",    opted_in: false, created_at: "2026-02-08T00:00:00Z" },
  { name: "Ethan Davis",          phone: "+14155550112", email: "ethan.d@gmail.com",         opted_in: true,  created_at: "2026-02-11T00:00:00Z" },
  { name: "Mia Wilson",           phone: "+14085550113", email: "mia.wilson@gmail.com",      opted_in: false, created_at: "2026-02-14T00:00:00Z" },
  { name: "Alexander Brown",      phone: "+14155550114", email: "alex.brown@icloud.com",     opted_in: true,  created_at: "2026-02-17T00:00:00Z" },
  { name: "Charlotte Taylor",     phone: "+16505550115", email: "charlotte.t@gmail.com",     opted_in: false, created_at: "2026-02-20T00:00:00Z" },
  { name: "Daniel Jackson",       phone: "+14155550116", email: "d.jackson@gmail.com",       opted_in: true,  created_at: "2026-02-22T00:00:00Z" },
  { name: "Amelia White",         phone: "+14085550117", email: "amelia.w@yahoo.com",        opted_in: true,  created_at: "2026-02-25T00:00:00Z" },
  { name: "Henry Harris",         phone: "+16505550118", email: "h.harris@gmail.com",        opted_in: false, created_at: "2026-02-27T00:00:00Z" },
  { name: "Harper Martin",        phone: "+14155550119", email: "harper.m@icloud.com",       opted_in: true,  created_at: "2026-03-02T00:00:00Z" },
  { name: "Sebastian Thompson",   phone: "+14085550120", email: "seb.t@gmail.com",           opted_in: true,  created_at: "2026-03-05T00:00:00Z" },
  { name: "Evelyn Garcia",        phone: "+16505550121", email: "evelyn.g@outlook.com",      opted_in: false, created_at: "2026-03-08T00:00:00Z" },
  { name: "Jack Martinez",        phone: "+14155550122", email: "jack.m@gmail.com",          opted_in: true,  created_at: "2026-03-11T00:00:00Z" },
  { name: "Scarlett Robinson",    phone: "+14085550123", email: "scarlett.r@gmail.com",      opted_in: false, created_at: "2026-03-13T00:00:00Z" },
  { name: "Logan Clark",          phone: "+14155550124", email: "logan.c@icloud.com",        opted_in: true,  created_at: "2026-03-16T00:00:00Z" },
  { name: "Grace Rodriguez",      phone: "+16505550125", email: "grace.r@gmail.com",         opted_in: true,  created_at: "2026-03-18T00:00:00Z" },
  { name: "Owen Lewis",           phone: "+14155550126", email: "owen.l@yahoo.com",          opted_in: false, created_at: "2026-03-21T00:00:00Z" },
  { name: "Lily Walker",          phone: "+14085550127", email: "lily.w@gmail.com",          opted_in: true,  created_at: "2026-03-23T00:00:00Z" },
  { name: "Carter Hall",          phone: "+16505550128", email: "carter.h@gmail.com",        opted_in: false, created_at: "2026-03-25T00:00:00Z" },
  { name: "Zoey Allen",           phone: "+14155550129", email: "zoey.allen@icloud.com",     opted_in: true,  created_at: "2026-03-27T00:00:00Z" },
  { name: "Aiden Young",          phone: "+14085550130", email: "aiden.y@gmail.com",         opted_in: true,  created_at: "2026-03-29T00:00:00Z" },
  { name: "Penelope Hernandez",   phone: "+16505550131", email: "penny.h@gmail.com",         opted_in: false, created_at: "2026-04-01T00:00:00Z" },
  { name: "Luke King",            phone: "+14155550132", email: "luke.k@outlook.com",        opted_in: true,  created_at: "2026-04-02T00:00:00Z" },
  { name: "Nora Wright",          phone: "+14085550133", email: "nora.w@gmail.com",          opted_in: true,  created_at: "2026-04-03T00:00:00Z" },
  { name: "Wyatt Scott",          phone: "+16505550134", email: "wyatt.s@gmail.com",         opted_in: false, created_at: "2026-04-04T00:00:00Z" },
  { name: "Hannah Green",         phone: "+14155550135", email: "hannah.g@icloud.com",       opted_in: true,  created_at: "2026-04-05T00:00:00Z" },
  { name: "Gabriel Adams",        phone: "+14085550136", email: "gabriel.a@gmail.com",       opted_in: false, created_at: "2026-04-06T00:00:00Z" },
  { name: "Stella Baker",         phone: "+16505550137", email: "stella.b@gmail.com",        opted_in: true,  created_at: "2026-04-07T00:00:00Z" },
  { name: "Julian Nelson",        phone: "+14155550138", email: "julian.n@yahoo.com",        opted_in: true,  created_at: "2026-04-08T00:00:00Z" },
  { name: "Addison Carter",       phone: "+14085550139", email: "addison.c@gmail.com",       opted_in: false, created_at: "2026-04-09T00:00:00Z" },
  { name: "Riley Mitchell",       phone: "+16505550140", email: "riley.m@gmail.com",         opted_in: true,  created_at: "2026-04-10T00:00:00Z" },
];

async function seedPartnerDefaults(
  partnerId: string,
  supabase: ReturnType<typeof createServiceClient>
) {
  await Promise.all([
    supabase.from("items").insert(
      SEED_ITEMS.map((item) => ({ ...item, partner_id: partnerId }))
    ),
    supabase.from("subscribers").insert(
      SEED_SUBSCRIBERS.map((s) => ({ ...s, partner_id: partnerId, source: "seed" }))
    ),
  ]);
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
