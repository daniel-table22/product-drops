import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function pickRandomPhoto(dir: string): { file: string; mime: string } | null {
  try {
    const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    if (!files.length) return null;
    const file = files[Math.floor(Math.random() * files.length)];
    const ext = file.split(".").pop()?.toLowerCase() ?? "jpeg";
    return { file, mime: MIME_MAP[ext] ?? "image/jpeg" };
  } catch {
    return null;
  }
}

function resolveCategory(businessType: string): string {
  const t = (businessType ?? "").toLowerCase();
  if (t.includes("baker") || t.includes("bread") || t.includes("pastry") || t.includes("boulangerie") || t.includes("patisserie")) return "baker";
  if (t.includes("butcher") || t.includes("meat") || t.includes("charcuterie")) return "butcher";
  if (t.includes("cheese") || t.includes("fromagerie") || t.includes("dairy")) return "cheese";
  if (t.includes("wine") && !t.includes("bar")) return "wine";
  if (t.includes("alcohol") || t.includes("spirit") || t.includes("distill") || t.includes("brewery") || t.includes("beer") || t.includes("wine bar") || t.includes("bottle shop") || t.includes("liquor")) return "alcohol";
  if (t.includes("restaurant") || t.includes("bistro") || t.includes("cafe") || t.includes("diner") || t.includes("eatery") || t.includes("brasserie") || t.includes("tavern")) return "restaurant";
  if (t.includes("provision") || t.includes("grocer") || t.includes("deli") || t.includes("market") || t.includes("farm") || t.includes("produce") || t.includes("pantry")) return "provisions";
  return "wine";
}

export async function POST(req: NextRequest) {
  const { logoUrl, caption, businessName, businessType } = await req.json();

  const category = resolveCategory(businessType ?? "");
  const dir = path.join(process.cwd(), "public/preview-photos", category);
  const photo = pickRandomPhoto(dir) ?? pickRandomPhoto(path.join(process.cwd(), "public/preview-photos/wine"))!;
  const photoPath = path.join(dir, photo.file);
  const photoBase64 = fs.readFileSync(photoPath).toString("base64");

  const venueDescription = businessType
    ? `a ${businessType} — use the counter, display case, or signature surfaces of that kind of space as the staging environment`
    : "a specialty food and beverage shop — use the counter or display area as the staging environment";

  const parts: Part[] = [
    {
      text: `You are a creative director at a premium food and beverage marketing agency.

Create a beautiful, editorial-quality lifestyle marketing card for "${businessName}", which is ${venueDescription}.

The scene: a printed marketing card resting on the counter of their shop, shot on location. The counter and surrounding environment should feel authentic to a ${businessType ?? "specialty food shop"} — natural light, tactile surfaces, the kind of detail that makes a customer trust the place.

${logoUrl ? "The logo is provided — place it cleanly on the card, as if it were printed there." : "No logo was provided — leave the card header clean."}

The card's key message (their Instagram copy): "${caption}"

The result should feel like a frame from a brand photoshoot — warm, atmospheric, with confident typography. Not cluttered. The card is the hero, the venue is the context.`,
    },
    {
      inlineData: { mimeType: photo.mime, data: photoBase64 },
    },
  ];

  // Fetch logo and prepend if available
  if (logoUrl) {
    try {
      const logoRes = await fetch(logoUrl);
      if (logoRes.ok) {
        const logoBuffer = await logoRes.arrayBuffer();
        const logoBase64 = Buffer.from(logoBuffer).toString("base64");
        const logoMime = logoUrl.includes(".png") ? "image/png" : "image/jpeg";
        parts.splice(1, 0, { inlineData: { mimeType: logoMime, data: logoBase64 } });
      }
    } catch {
      // proceed without logo
    }
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

  let response;
  try {
    response = await model.generateContent({
      contents: [{ role: "user", parts }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] } as any,
    });
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const imagePart = response.response.candidates?.[0]?.content.parts.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any) => p.inlineData
  ) as { inlineData: { mimeType: string; data: string } } | undefined;

  if (!imagePart) {
    return NextResponse.json({ error: "No image generated" }, { status: 500 });
  }

  return NextResponse.json({
    imageDataUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
  });
}
