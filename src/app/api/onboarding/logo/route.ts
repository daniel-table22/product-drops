import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

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
  const { websiteUrl, partnerId } = await request.json() as { websiteUrl: string; partnerId: string };

  const pk = process.env.LOGO_DEV_PUBLISHABLE_KEY;
  if (!pk || !websiteUrl) return NextResponse.json({ logoUrl: null });

  const domain = extractDomain(websiteUrl);
  const logoDevUrl = `https://img.logo.dev/${domain}?token=${pk}&size=200&format=png&retina=true`;

  try {
    const logoRes = await fetch(logoDevUrl);
    if (!logoRes.ok) return NextResponse.json({ logoUrl: null });

    let logoBytes = Buffer.from(await logoRes.arrayBuffer());

    if (logoBytes.length < LOGO_MIN_BYTES) {
      return NextResponse.json({ logoUrl: null });
    }

    // Try remove.bg background strip if key is present
    const removeBgKey = process.env.REMOVE_BG_API_KEY;
    if (removeBgKey) {
      try {
        const rbRes = await fetch("https://api.remove.bg/v1.0/removebg", {
          method: "POST",
          headers: { "X-Api-Key": removeBgKey, "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: logoDevUrl, size: "auto" }),
        });
        if (rbRes.ok) {
          logoBytes = Buffer.from(await rbRes.arrayBuffer());
        }
      } catch {
        // keep original logo bytes
      }
    }

    // Upload to Supabase Storage and persist the public URL
    const serviceClient = createServiceClient();
    const storagePath = `${partnerId}/logo/logo.png`;

    const { error: uploadError } = await serviceClient.storage
      .from("partner-assets")
      .upload(storagePath, logoBytes, { contentType: "image/png", upsert: true });

    if (!uploadError) {
      const { data } = serviceClient.storage.from("partner-assets").getPublicUrl(storagePath);
      const publicUrl = data.publicUrl;

      await serviceClient
        .from("partners")
        .update({ logo_url: publicUrl })
        .eq("id", partnerId);

      return NextResponse.json({ logoUrl: publicUrl });
    }

    // Storage failed — fall back to base64 so the preview still works
    return NextResponse.json({ logoUrl: `data:image/png;base64,${logoBytes.toString("base64")}` });
  } catch {
    return NextResponse.json({ logoUrl: null });
  }
}
