// Resets the password for every TEACHER-role auth user in a Supabase
// project, and reports (without resetting) every ADMIN/COORDINATOR account.
// Prints a table to stdout — pipe/redirect into CREDENTIALS(.staging).md.
//
// Run with:
//   npx tsx scripts/reset-teacher-credentials.ts dev
//   npx tsx scripts/reset-teacher-credentials.ts prod

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const target = process.argv[2];
if (target !== "dev" && target !== "prod") {
  throw new Error("Usage: npx tsx scripts/reset-teacher-credentials.ts <dev|prod>");
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
    .order("role")
    .order("fullName");
  if (usersError) throw usersError;

  const rows = usersData as Row[];
  const admins = rows.filter((r) => r.role === "ADMIN" || r.role === "COORDINATOR");
  const teachers = rows.filter((r) => r.role === "TEACHER");

  console.error(`Found: ${admins.length} admin/coordinator, ${teachers.length} teacher`);

  const teacherResults: { fullName: string; email: string; password: string }[] = [];
  for (const t of teachers) {
    const password = generatePassword();
    const { error } = await supabase.auth.admin.updateUserById(t.id, { password });
    if (error) {
      console.error(`FAILED reset for ${t.email}: ${error.message}`);
      continue;
    }
    teacherResults.push({ fullName: t.fullName, email: t.email, password });
    console.error(`Reset: ${t.fullName} <${t.email}>`);
  }

  console.log(`\n<!-- ${target.toUpperCase()} — generated ${new Date().toISOString()} -->`);
  console.log(`\n### Admin / Coordinator (${target}) — password TIDAK direset\n`);
  console.log(`| Role | Nama | Email |`);
  console.log(`|---|---|---|`);
  for (const a of admins) {
    console.log(`| ${a.role} | ${a.fullName} | ${a.email} |`);
  }

  console.log(`\n### Teacher (${target}) — password baru\n`);
  console.log(`| Nama | Email | Password |`);
  console.log(`|---|---|---|`);
  for (const t of teacherResults) {
    console.log(`| ${t.fullName} | ${t.email} | \`${t.password}\` |`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
