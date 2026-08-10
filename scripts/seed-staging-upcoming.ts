/**
 * Supplemental seed: adds a couple of UPCOMING (no Meeting row yet) lesson
 * plans per class so there's something to click "Ganti Tutor" on and to
 * exercise the today/status-board views. Run after seed-staging-bulk.ts:
 *   npx tsx scripts/seed-staging-upcoming.ts
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(__dirname, "../.env.staging");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
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
  return d.toISOString().slice(0, 10);
}
function walkScheduleDates(days: number[], from: Date, count: number): Date[] {
  const out: Date[] = [];
  let cursor = new Date(from);
  while (out.length < count) {
    if (days.includes(cursor.getDay())) out.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return out;
}

const TOPICS = [
  "Simple Present Review", "Descriptive Writing", "Listening Practice",
  "Grammar Focus: Modals", "Speaking: Debate Basics",
];
const SKILLS = ["Listening", "Speaking", "Writing", "Reading"];

async function main() {
  const TODAY = new Date("2026-08-10");

  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, teacherId, scheduleDaysOfWeek")
    .is("deletedAt", null);
  if (error) throw error;

  const rows: {
    id: string;
    classId: string;
    createdByTeacherId: string;
    meetingNumber: number;
    week: number;
    scheduledDate: string;
    topic: string;
    level: string;
    learningObjectives: string;
    skills: string[];
  }[] = [];

  for (const c of classes as { id: string; teacherId: string; scheduleDaysOfWeek: number[] }[]) {
    const { count } = await supabase
      .from("lesson_plans")
      .select("id", { count: "exact", head: true })
      .eq("classId", c.id);
    const startingMeetingNumber = (count ?? 0) + 1;

    const dates = walkScheduleDates(c.scheduleDaysOfWeek, addDays(TODAY, 1), 3);
    dates.forEach((d, idx) => {
      rows.push({
        id: randomUUID(),
        classId: c.id,
        createdByTeacherId: c.teacherId,
        meetingNumber: startingMeetingNumber + idx,
        week: 99,
        scheduledDate: dateStr(d),
        topic: TOPICS[idx % TOPICS.length],
        level: "SMA",
        learningObjectives: "Materi lanjutan",
        skills: [SKILLS[idx % SKILLS.length], SKILLS[(idx + 1) % SKILLS.length]],
      });
    });
  }

  for (let i = 0; i < rows.length; i += 500) {
    const { error: insErr } = await supabase.from("lesson_plans").insert(rows.slice(i, i + 500));
    if (insErr) throw insErr;
  }
  console.log(`Added ${rows.length} upcoming lesson plans across ${(classes ?? []).length} classes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
