import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(
    "https://js.stripe.com/apple-pay/domain-association",
    { next: { revalidate: 86400 } }
  );
  const text = await res.text();
  return new NextResponse(text, {
    headers: { "Content-Type": "text/plain" },
  });
}
