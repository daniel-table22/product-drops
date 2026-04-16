"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/anthropic/client";

export type MarketingChannel = "sms" | "email_subject" | "email_body" | "instagram";

const systemPrompts: Record<MarketingChannel, string> = {
  sms: `You are a copywriter helping small food businesses grow their SMS subscriber list. Write concise, warm, direct messages under 160 characters. Sound like a real person texting a friend, not a brand. No marketing jargon. End with a clear action (a link placeholder or instruction). Do not use hashtags.`,

  email_subject: `You are a copywriter helping small food businesses write email subject lines that get opened. Write a single subject line under 45 characters. Make it feel personal and specific — like a note from someone the reader knows, not a newsletter blast. Avoid spam trigger words (free, limited time, exclusive). Return only the subject line, no quotes or labels.`,

  email_body: `You are a copywriter helping small food businesses write short, effective subscriber acquisition emails. Write in a warm, personal, first-person voice — as if the owner is writing it themselves. 3 short paragraphs max. One clear call to action. No salesy language. Include a placeholder like [sign-up link] for the actual URL. Return only the email body, no subject line.`,

  instagram: `You are a copywriter helping small food businesses write Instagram captions that grow their subscriber list. Write a hook as the first line (shown before "more"). Use sensory, evocative language — make people feel like they can smell and taste it. 2–4 relevant emojis woven naturally into the text. Direct viewers to the link in bio to sign up for drop notifications. End with 4–6 targeted, local hashtags on their own line. Keep the whole caption under 300 characters before hashtags.`,
};

export async function rewriteMarketingCopy(
  channel: MarketingChannel,
  currentText: string,
  prompt: string,
  businessName: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: partner } = await supabase
    .from("partners")
    .select("tone")
    .eq("user_id", user.id)
    .single();

  const tone = partner?.tone as { adjectives?: string[]; summary?: string } | null;
  const toneContext = tone?.summary
    ? `\n\nBrand tone of voice: ${tone.adjectives?.join(", ")}. ${tone.summary}`
    : "";

  const promptContext = prompt.trim()
    ? `\n\nAdditional instruction from the user: "${prompt.trim()}"`
    : "";

  const userMessage = `Business name: ${businessName}${toneContext}\n\nCurrent text to rewrite:\n\n"${currentText}"${promptContext}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system: systemPrompts[channel],
    messages: [{ role: "user", content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== "text") return { error: "Unexpected response" };
  return { text: content.text.trim() };
}
