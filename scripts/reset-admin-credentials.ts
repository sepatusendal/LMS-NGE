// Resets the password for every ADMIN/COORDINATOR-role auth user in a
// Supabase project. Sibling to reset-teacher-credentials.ts.
//
// Run with:
//   npx tsx scripts/reset-admin-credentials.ts dev
//   npx tsx scripts/reset-admin-credentials.ts prod

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const target = process.argv[2];
if (target !== "dev" && target !== "prod") {
  throw new Error("Usage: npx tsx scripts/reset-admin-credentials.ts <dev|prod>");
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

console.error(`Target: ${target.toUpperCase()} — ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generatePassword() {
  return `Nge${Math.random().toString(36).slice(2, 10)}!`;
}

interface Row {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

async function main() {
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id, email, fullName, role")
    .is("deletedAt", null)
    .in("role", ["ADMIN", "COORDINATOR"])
    .order("role")
    .order("fullName");
  if (usersError) throw usersError;

  const rows = usersData as Row[];
  console.error(`Found: ${rows.length} admin/coordinator`);

  const results: { role: string; fullName: string; email: string; password: string }[] = [];
  for (const r of rows) {
    const password = generatePassword();
    const { error } = await supabase.auth.admin.updateUserById(r.id, { password });
    if (error) {
      console.error(`FAILED reset for ${r.email}: ${error.message}`);
      continue;
    }
    results.push({ role: r.role, fullName: r.fullName, email: r.email, password });
    console.error(`Reset: ${r.fullName} <${r.email}>`);
  }

  console.log(`\n<!-- ${target.toUpperCase()} — generated ${new Date().toISOString()} -->`);
  console.log(`\n### Admin / Coordinator (${target}) — password baru\n`);
  console.log(`| Role | Nama | Email | Password |`);
  console.log(`|---|---|---|---|`);
  for (const r of results) {
    console.log(`| ${r.role} | ${r.fullName} | ${r.email} | \`${r.password}\` |`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
