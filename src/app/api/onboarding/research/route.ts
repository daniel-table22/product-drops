import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 60;

const anthropic = new Anthropic();

export type ToneData = {
  tone: {
    adjectives: string[];
    summary: string;
  };
  business_type: string;
  product_examples: string[];
  sources: Array<{ label: string; url: string }>;
};

function normalizeUrl(url: string): string {
  if (!url) return url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

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

export async function POST(request: NextRequest) {
  const { partnerId, email, businessName, websiteUrl } = await request.json();

  const serviceClient = createServiceClient();
  const { data: partner } = await serviceClient
    .from("partners")
    .select("id")
    .eq("id", partnerId)
    .eq("email", email)
    .single();

  if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const normalizedUrl = normalizeUrl(websiteUrl);
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Accumulate tool_use input JSON by block index
        const toolInputs = new Map<number, string>();

        const msgStream = anthropic.messages.stream(
          {
            model: "claude-sonnet-4-6",
            max_tokens: 1024,
            tools: [
              {
                type: "web_search_20250305" as const,
                name: "web_search",
                max_uses: 6,
              },
            ],
            system: `You are a brand strategist specialising in food, hospitality, and small producer brands. Research the brand's tone of voice and return ONLY valid JSON — no surrounding text, no markdown fences. Use exactly this shape:

{
  "tone": {
    "adjectives": ["string", "string", "string"],
    "summary": "string"
  },
  "business_type": "string",
  "product_examples": ["string", "string", "string"],
  "sources": [
    { "label": "string", "url": "string" }
  ]
}

adjectives: 3–5 words that capture how they write (e.g. "Warm", "Playful", "Lowercase", "Direct", "Irreverent")
summary: 2–3 sentences on their voice, cadence, capitalization, personality, and any signature phrases or signoffs
business_type: short label like "artisan bakery", "natural wine shop", "small-batch hot sauce maker"
product_examples: 3 real or likely products this business sells
sources: every URL you actually read — label should be short and human-readable like "tartinebakery.com — About" or "Instagram @tartine — captions". Include 3–8 sources.

If the website doesn't load or you can't find enough signal, make a reasonable inference from the business name and any other sources you find.`,
            messages: [
              {
                role: "user",
                content: `Research the tone of voice for this business.

Business name: ${businessName}
Website: ${normalizedUrl}

Search their website, Instagram, any press coverage or reviews, and other public materials to understand how they write and communicate. Return only JSON.`,
              },
            ],
          },
          { headers: { "anthropic-beta": "web-search-2025-03-05" } }
        );

        // Single streamEvent handler — raw SSE events with correct types
        msgStream.on("streamEvent", (event) => {
          if (event.type === "content_block_start") {
            const block = event.content_block;

            // Claude is about to fire a web search — start accumulating query JSON
            if (block.type === "tool_use" && block.name === "web_search") {
              toolInputs.set(event.index, "");
            }

            // Search results arriving — emit each URL immediately
            if (block.type === "web_search_tool_result") {
              const content = block.content;
              if (Array.isArray(content)) {
                for (const item of content) {
                  if (item.type === "web_search_result") {
                    send({ type: "source", label: item.title, url: item.url });
                  }
                }
              }
            }
          } else if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta.type === "input_json_delta" && toolInputs.has(event.index)) {
              toolInputs.set(
                event.index,
                (toolInputs.get(event.index) ?? "") + delta.partial_json
              );
            }
          } else if (event.type === "content_block_stop") {
            const json = toolInputs.get(event.index);
            if (json !== undefined) {
              try {
                const input = JSON.parse(json) as Record<string, unknown>;
                if (input.query) send({ type: "searching", query: input.query });
              } catch {
                // partial / malformed JSON — skip
              }
              toolInputs.delete(event.index);
            }
          }
        });

        const finalMsg = await msgStream.finalMessage();

        // Extract the tone JSON from the last text block
        const textBlock = finalMsg.content.findLast((b) => b.type === "text");
        if (!textBlock || textBlock.type !== "text") throw new Error("No text in response");
        const tone = JSON.parse(extractJson(textBlock.text)) as ToneData;

        // If we didn't catch real-time sources from tool results, fall back to Claude's JSON
        // (sources field in the JSON is our safety net)

        await serviceClient
          .from("partners")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ tone: tone as any, tone_researched_at: new Date().toISOString(), website_url: normalizedUrl })
          .eq("id", partnerId);

        send({ type: "done", tone });
      } catch (error) {
        console.error("Research stream error:", error);
        let message = "Research failed. Please try again.";
        if (error instanceof Error) {
          try {
            const parsed = JSON.parse(error.message) as { error?: { type?: string; message?: string } };
            if (parsed.error?.type === "overloaded_error") {
              message = "AI is busy right now. Please try again in a moment.";
            } else {
              message = parsed.error?.message ?? error.message;
            }
          } catch {
            message = error.message;
          }
        }
        send({ type: "error", message });
      }

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
