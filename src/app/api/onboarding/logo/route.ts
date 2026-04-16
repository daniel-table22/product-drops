import { NextRequest, NextResponse } from "next/server";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^www\./, "");
  }
}

// Logo.dev always returns something — placeholders are tiny (< ~1 KB).
// Real logos are almost always larger than this threshold.
const LOGO_MIN_BYTES = 1500;

export async function POST(request: NextRequest) {
  const { websiteUrl } = await request.json() as { websiteUrl: string };

  const pk = process.env.LOGO_DEV_PUBLISHABLE_KEY;
  if (!pk || !websiteUrl) {
    return NextResponse.json({ logoUrl: null });
  }

  const domain = extractDomain(websiteUrl);
  const logoDevUrl = `https://img.logo.dev/${domain}?token=${pk}&size=200&format=png&retina=true`;

  try {
    const logoRes = await fetch(logoDevUrl);
    if (!logoRes.ok) return NextResponse.json({ logoUrl: null });

    const logoBytes = Buffer.from(await logoRes.arrayBuffer());

    // Treat anything suspiciously small as a placeholder — fall back to text
    if (logoBytes.length < LOGO_MIN_BYTES) {
      return NextResponse.json({ logoUrl: null });
    }

    // Try remove.bg background strip if key is present
    const removeBgKey = process.env.REMOVE_BG_API_KEY;
    if (removeBgKey) {
      try {
        const rbRes = await fetch("https://api.remove.bg/v1.0/removebg", {
          method: "POST",
          headers: {
            "X-Api-Key": removeBgKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image_url: logoDevUrl, size: "auto" }),
        });
        if (rbRes.ok) {
          const stripped = Buffer.from(await rbRes.arrayBuffer());
          const b64 = stripped.toString("base64");
          return NextResponse.json({ logoUrl: `data:image/png;base64,${b64}` });
        }
      } catch {
        // fall through to raw logo
      }
    }

    // No remove.bg — return as base64 data URL to avoid CORS issues
    return NextResponse.json({ logoUrl: `data:image/png;base64,${logoBytes.toString("base64")}` });
  } catch {
    return NextResponse.json({ logoUrl: null });
  }
}
