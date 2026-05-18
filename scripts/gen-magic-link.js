#!/usr/bin/env node
// Usage: node scripts/gen-magic-link.js <email> [redirect_to]
// Generates a magic link without sending email — for local/dev testing only.
// Uses the Supabase Admin REST API with the service role key from the CLI.

import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/gen-magic-link.js <email> [redirect_to]");
  process.exit(1);
}

// Read app URL from .env.local
const envPath = resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1];
const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const redirectTo = process.argv[3] ?? `${appUrl}/auth/callback?next=/dashboard`;

// Get service role key via CLI (avoids stale .env.local keys)
let serviceKey;
try {
  const output = execSync(`supabase projects api-keys --project-ref ${projectRef} 2>/dev/null`, { encoding: "utf8" });
  serviceKey = output.split("\n").find((l) => l.includes("service_role"))?.split("|")[1]?.trim();
} catch {
  // fall back to .env.local
  serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
}

if (!serviceKey) {
  console.error("Could not find service role key.");
  process.exit(1);
}

const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ type: "magiclink", email, options: { redirect_to: redirectTo } }),
});

const data = await res.json();

if (!res.ok || !data.hashed_token) {
  console.error("Error:", data.msg ?? data.error ?? JSON.stringify(data));
  process.exit(1);
}

const callbackUrl = `${appUrl}/auth/callback?code=${data.hashed_token}`;

console.log("\nCallback URL (paste into browser):");
console.log(callbackUrl);
console.log("\nRedirects to:", redirectTo);
