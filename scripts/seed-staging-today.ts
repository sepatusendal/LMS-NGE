/**
 * Supplemental seed: ensures every class scheduled to meet TODAY (by
 * weekly pattern or override) has a lesson plan dated today, with no
 * Meeting yet — so the dashboard/status board and the new substitute
 * workflows have real "not_started today" rows to demo against, instead
 * of every class showing "belum ada lesson plan" for today specifically.
 * Run: npx tsx scripts/seed-staging-today.ts
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

const TOPICS = ["Grammar Review", "Vocabulary Building", "Conversation Practice", "Reading Comprehension"];
const SKILLS = ["Listening", "Speaking", "Writing", "Reading"];

async function main() {
  const TODAY = "2026-08-10";
  const todayDow = new Date(2026, 7, 10).getDay(); // Monday = 1

  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, teacherId, scheduleDaysOfWeek")
    .eq("isActive", true)
    .is("deletedAt", null);
  if (error) throw error;

  const { data: overrides, error: ovErr } = await supabase
    .from("class_schedule_overrides")
    .select("classId")
    .eq("dayOfWeek", todayDow);
  if (ovErr) throw ovErr;
  const overrideClassIds = new Set((overrides ?? []).map((o) => o.classId));

  const todayClasses = (classes as { id: string; teacherId: string; scheduleDaysOfWeek: number[] }[]).filter(
    (c) => c.scheduleDaysOfWeek.includes(todayDow) || overrideClassIds.has(c.id),
  );

  const { data: existingLps, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("classId")
    .eq("scheduledDate", TODAY);
  if (lpErr) throw lpErr;
  const hasToday = new Set((existingLps ?? []).map((l) => l.classId));

  const toCreate = todayClasses.filter((c) => !hasToday.has(c.id));
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

  for (const c of toCreate) {
    const { count } = await supabase
      .from("lesson_plans")
      .select("id", { count: "exact", head: true })
      .eq("classId", c.id);
    rows.push({
      id: randomUUID(),
      classId: c.id,
      createdByTeacherId: c.teacherId,
      meetingNumber: (count ?? 0) + 1,
      week: 99,
      scheduledDate: TODAY,
      topic: TOPICS[Math.floor(Math.random() * TOPICS.length)],
      level: "SMA",
      learningObjectives: "Materi hari ini",
      skills: [SKILLS[0], SKILLS[1]],
    });
  }

  for (let i = 0; i < rows.length; i += 200) {
    const { error: insErr } = await supabase.from("lesson_plans").insert(rows.slice(i, i + 200));
    if (insErr) throw insErr;
  }

  console.log(`Todays classes: ${todayClasses.length}, already had a plan: ${hasToday.size}, created: ${rows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
