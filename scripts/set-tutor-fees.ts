// One-off: set Teacher.feePerMeeting per the org's fee schedule.
// Default 100,000 for every teacher; Bu Eni and Brother Edi get 125,000;
// Brother Ahmed Siam is left null (not set).
//
// Run with:
//   npx tsx scripts/set-tutor-fees.ts dev
//   npx tsx scripts/set-tutor-fees.ts prod

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const target = process.argv[2];
if (target !== "dev" && target !== "prod") {
  throw new Error("Usage: npx tsx scripts/set-tutor-fees.ts <dev|prod>");
}
const envFile = target === "prod" ? "../.env" : "../.env.staging";

const envPath = resolve(__dirname, envFile);
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [key, ...vals] = line.split("=");
  if (key && vals.length) env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error(`Missing env vars in ${envFile}`);

console.log(`Target: ${target.toUpperCase()} — ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEFAULT_FEE = 100_000;
const HIGH_FEE = 125_000;
const HIGH_FEE_NAMES = ["Bu Eni", "Brother Edi"];
const NO_FEE_NAMES = ["Brother Ahmed Siam"];

async function main() {
  const { data: teachers, error } = await supabase
    .from("teachers")
    .select("id, users(fullName)")
    .is("deletedAt", null);
  if (error) throw error;

  for (const t of teachers as unknown as { id: string; users: { fullName: string } | null }[]) {
    const name = t.users?.fullName ?? "";
    let fee: number | null = DEFAULT_FEE;
    if (HIGH_FEE_NAMES.includes(name)) fee = HIGH_FEE;
    if (NO_FEE_NAMES.includes(name)) fee = null;

    const { error: updateError } = await supabase
      .from("teachers")
      .update({ feePerMeeting: fee })
      .eq("id", t.id);
    if (updateError) throw updateError;
    console.log(`${name.padEnd(20)} -> ${fee === null ? "(kosong)" : `Rp${fee.toLocaleString("id-ID")}`}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
