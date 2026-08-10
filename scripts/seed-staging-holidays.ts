/**
 * Seeds the holidays table on staging (found empty during a review pass —
 * likely never actually persisted from the original bulk seed, or lost
 * along the way; re-seeding is the pragmatic fix either way). Uses local
 * date components instead of toISOString() to avoid the UTC-shift bug
 * that toISOString().slice(0,10) has on machines west of UTC... er, this
 * machine is UTC+7 (WIB), so toISOString() rolls a local midnight back to
 * the previous day. Run: npx tsx scripts/seed-staging-holidays.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(__dirname, "../.env.staging");
const env: Record<string, string> = {};
readFileSync(envPath, "utf-8")
  .split("\n")
  .forEach((line) => {
    const [key, ...vals] = line.split("=");
    if (key && vals.length) env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
  });

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}
function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function holidayRange(name: string, from: Date, to: Date, schoolId: string | null) {
  const rows: { date: string; name: string; schoolId: string | null }[] = [];
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
    rows.push({ date: dateStr(d), name, schoolId });
  }
  return rows;
}

async function main() {
  const { count } = await supabase.from("holidays").select("id", { count: "exact", head: true });
  if (count && count > 0) {
    console.log(`holidays already has ${count} rows — skipping (delete them first if you want a clean reseed).`);
    return;
  }

  const TODAY = new Date(2026, 7, 10);
  const { data: schools } = await supabase.from("schools").select("id").order("name").limit(2);
  const [schoolA, schoolB] = schools ?? [];

  const holidays = [
    ...holidayRange("Libur Semester Ganjil", addDays(TODAY, 20), addDays(TODAY, 34), null),
    ...holidayRange("Cuti Bersama Nasional", addDays(TODAY, -5), addDays(TODAY, -3), null),
    ...holidayRange("Hari Kemerdekaan RI", addDays(TODAY, 7), addDays(TODAY, 7), null),
    ...(schoolA ? holidayRange("Libur Ujian Sekolah", addDays(TODAY, 45), addDays(TODAY, 49), schoolA.id) : []),
    ...(schoolB ? holidayRange("Acara Sekolah", addDays(TODAY, 12), addDays(TODAY, 12), schoolB.id) : []),
    ...holidayRange("Libur Maulid Nabi", addDays(TODAY, 60), addDays(TODAY, 60), null),
  ];

  const { error } = await supabase.from("holidays").insert(holidays);
  if (error) throw error;
  console.log(`Inserted ${holidays.length} holiday rows.`);
  holidays
    .filter((h, i) => holidays.findIndex((x) => x.name === h.name) === i)
    .forEach((h) => console.log(`  ${h.name}: ${h.schoolId ? "school-specific" : "global"}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
