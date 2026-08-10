/**
 * Supplemental seed: ensures every class has a lesson plan (no Meeting
 * yet) on each of its scheduled weekdays for the next 14 days from today,
 * so the dashboard/status board and the teacher-day substitute view have
 * real data to browse across any near-future date, not just today.
 * Run: npx tsx scripts/seed-staging-next-2-weeks.ts
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
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

const TOPICS = [
  "Grammar Review", "Vocabulary Building", "Conversation Practice", "Reading Comprehension",
  "Listening Skills", "Writing Workshop", "Pronunciation Drill", "Group Discussion",
];
const SKILLS = ["Listening", "Speaking", "Writing", "Reading"];

async function main() {
  const TODAY = new Date(2026, 7, 10); // 2026-08-10, matches the rest of the seed data

  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, teacherId, scheduleDaysOfWeek")
    .eq("isActive", true)
    .is("deletedAt", null);
  if (error) throw error;

  const { data: overrides, error: ovErr } = await supabase
    .from("class_schedule_overrides")
    .select("classId, dayOfWeek");
  if (ovErr) throw ovErr;
  const overrideDaysByClass = new Map<string, Set<number>>();
  (overrides ?? []).forEach((o) => {
    const set = overrideDaysByClass.get(o.classId) ?? new Set<number>();
    set.add(o.dayOfWeek);
    overrideDaysByClass.set(o.classId, set);
  });

  const { data: existingLps, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("classId, scheduledDate")
    .gte("scheduledDate", dateStr(TODAY))
    .lte("scheduledDate", dateStr(addDays(TODAY, 13)));
  if (lpErr) throw lpErr;
  const existingKey = new Set((existingLps ?? []).map((l) => `${l.classId}_${l.scheduledDate}`));

  const countByClass = new Map<string, number>();
  {
    const { data: allLps, error: allErr } = await supabase.from("lesson_plans").select("classId");
    if (allErr) throw allErr;
    (allLps ?? []).forEach((l) => countByClass.set(l.classId, (countByClass.get(l.classId) ?? 0) + 1));
  }

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
    const days = new Set([...(c.scheduleDaysOfWeek ?? []), ...(overrideDaysByClass.get(c.id) ?? [])]);
    for (let i = 0; i < 14; i++) {
      const d = addDays(TODAY, i);
      if (!days.has(d.getDay())) continue;
      const ds = dateStr(d);
      const key = `${c.id}_${ds}`;
      if (existingKey.has(key)) continue;
      existingKey.add(key);
      const nextNum = (countByClass.get(c.id) ?? 0) + 1;
      countByClass.set(c.id, nextNum);
      rows.push({
        id: randomUUID(),
        classId: c.id,
        createdByTeacherId: c.teacherId,
        meetingNumber: nextNum,
        week: 100 + i,
        scheduledDate: ds,
        topic: TOPICS[(nextNum + i) % TOPICS.length],
        level: "SMA",
        learningObjectives: "Materi lanjutan",
        skills: [SKILLS[i % SKILLS.length], SKILLS[(i + 1) % SKILLS.length]],
      });
    }
  }

  for (let i = 0; i < rows.length; i += 300) {
    const { error: insErr } = await supabase.from("lesson_plans").insert(rows.slice(i, i + 300));
    if (insErr) throw insErr;
  }

  console.log(`Created ${rows.length} lesson plans across the next 14 days (${dateStr(TODAY)} .. ${dateStr(addDays(TODAY, 13))}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
