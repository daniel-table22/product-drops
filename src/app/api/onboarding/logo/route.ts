import { NextRequest, NextResponse } from "next/server";

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^www\./, "");
  }
}

export async function POST(request: NextRequest) {
  const { websiteUrl } = await request.json() as { websiteUrl: string };

  const pk = process.env.LOGO_DEV_PUBLISHABLE_KEY;
  if (!pk || !websiteUrl) {
    return NextResponse.json({ logoUrl: null });
  }

  const domain = extractDomain(websiteUrl);
  const logoUrl = `https://img.logo.dev/${domain}?token=${pk}&size=200&format=png&retina=true`;

  // If remove.bg key is present, fetch the logo and strip its background
  const removeBgKey = process.env.REMOVE_BG_API_KEY;
  if (removeBgKey) {
    try {
      const res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": removeBgKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_url: logoUrl, size: "auto" }),
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        return NextResponse.json({ logoUrl, logoDataUrl: `data:image/png;base64,${b64}` });
      }
    } catch {
      // fall through to plain logoUrl
    }
  }

  return NextResponse.json({ logoUrl });
}
