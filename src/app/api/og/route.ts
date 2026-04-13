import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function extractMeta(html: string, property: string): string | null {
  // Try property="og:..." (standard)
  let m = html.match(
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i")
  );
  if (m) return m[1];
  // Try content first, then property
  m = html.match(
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i")
  );
  return m?.[1] ?? null;
}

function extractTitle(html: string): string | null {
  return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
}

function resolveUrl(base: string, maybeRelative: string | null): string | null {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).href;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Twitterbot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({});

    const html = await res.text();

    const rawImage =
      extractMeta(html, "og:image") ??
      extractMeta(html, "twitter:image") ??
      extractMeta(html, "twitter:image:src");

    return NextResponse.json({
      title:
        extractMeta(html, "og:title") ??
        extractMeta(html, "twitter:title") ??
        extractTitle(html),
      description:
        extractMeta(html, "og:description") ??
        extractMeta(html, "twitter:description"),
      image: resolveUrl(url, rawImage),
      site_name: extractMeta(html, "og:site_name"),
    });
  } catch {
    // Timeout, CORS, blocked — return empty so client shows fallback
    return NextResponse.json({});
  }
}
