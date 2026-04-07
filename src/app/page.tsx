import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { error } = await supabase.from("_supabase_ping").select("*").limit(1);
  // Any response (even "relation does not exist") means the connection works
  const connected = !error || error.code === "42P01";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-24">
      <h1 className="text-4xl font-bold">Product Drops</h1>
      <p className="text-lg text-gray-500">hello world</p>
      <div className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span>
          Supabase:{" "}
          {connected ? "connected" : `error — ${error?.message}`}
        </span>
      </div>
    </main>
  );
}
