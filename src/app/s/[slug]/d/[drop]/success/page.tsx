import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/client";

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; drop: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const { session_id } = await searchParams;

  let customerEmail: string | null = null;
  let customerName: string | null = null;

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      customerEmail = session.customer_email;
      customerName = session.metadata?.customer_name ?? null;
    } catch {
      // Stripe session not found — show generic success
    }
  }

  const supabase = await createClient();
  const { data: partner } = await supabase
    .from("partners")
    .select("business_name, slug")
    .eq("slug", slug)
    .single();

  return (
    <div className="min-h-screen bg-page-bg flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="space-y-2">
          <p className="text-size-9 leading-none">✓</p>
          <h1 className="text-size-6 font-semibold text-neutral-12 tracking-tight">
            Order confirmed
          </h1>
          {customerName && (
            <p className="text-size-2 text-neutral-10">Thanks, {customerName}!</p>
          )}
        </div>

        <div className="rounded-4 border border-neutral-6 bg-surface p-5 space-y-2 text-left">
          {customerEmail && (
            <p className="text-size-2 text-neutral-12">
              A confirmation has been sent to{" "}
              <strong className="font-medium">{customerEmail}</strong>.
            </p>
          )}
          <p className="text-size-2 text-neutral-10">
            Bring this email to pickup. The partner will have your order ready.
          </p>
        </div>

        {partner && (
          <Link
            href={`/s/${partner.slug}`}
            className="text-size-2 text-neutral-10 hover:text-neutral-12 underline"
          >
            Back to {partner.business_name}
          </Link>
        )}
      </div>
    </div>
  );
}
