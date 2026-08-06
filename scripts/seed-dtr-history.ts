// One-off import of real historical Daily Teaching Reports from
// reference-data/NGE Daily Teaching Report (Responses).xlsx into Supabase.
// Reconstructs the lesson_plans -> meetings -> check_ins/check_outs ->
// attendances -> teaching_reports chain the app's own workflow would have
// produced, since this form data predates the app.
//
// Known approximation: the source only gives an attendance RATIO
// ("6/8 students"), not which named students attended. We pick that many
// students deterministically from each class's real roster to reconstruct
// a plausible attendances table (needed for dashboard "Hadir: X/Y"), but
// this is NOT a verified per-student record — don't treat individual rows
// from this import as ground truth for a specific student's attendance.
//
// Run with: npx tsx scripts/seed-dtr-history.ts

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "../.env");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const [key, ...vals] = line.split("=");
  if (key && vals.length) env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DTR_JSON_PATH =
  "/private/tmp/claude-502/-Users-wiraraja-Documents-LMS-NGE/9d08f836-3d24-4294-8b0b-6ca9de7a1d4c/scratchpad/dtr_reports.json";

interface DtrRow {
  row: number;
  tutor: string;
  date: string;
  class: string;
  presentCount: number | null;
  totalCount: number | null;
  topic: string;
  skills: string[];
  objectivesAchieved: string | null;
  whatWentWell: string | null;
  whatNeedsImprovement: string | null;
  followUpNote: string | null;
  nextLessonNotes: string | null;
  photoDriveFileId: string | null;
}

async function main() {
  const rows: DtrRow[] = JSON.parse(readFileSync(DTR_JSON_PATH, "utf-8"));
  console.log(`Loaded ${rows.length} historical DTR rows`);

  const { data: teacherRows, error: teacherErr } = await supabase
    .from("users")
    .select("id, fullName, teachers(id)")
    .eq("role", "TEACHER");
  if (teacherErr) throw teacherErr;
  const teacherIdByName = new Map<string, string>();
  (teacherRows as unknown as { fullName: string; teachers: { id: string } | { id: string }[] | null }[]).forEach(
    (u) => {
      const t = Array.isArray(u.teachers) ? u.teachers[0] : u.teachers;
      if (t) teacherIdByName.set(u.fullName, t.id);
    },
  );

  const { data: schoolRow, error: schoolErr } = await supabase
    .from("schools")
    .select("id")
    .eq("name", "Nurul Fajri")
    .single();
  if (schoolErr) throw schoolErr;
  const schoolId = (schoolRow as { id: string }).id;

  const { data: classRows, error: classErr } = await supabase
    .from("classes")
    .select("id, name")
    .eq("schoolId", schoolId);
  if (classErr) throw classErr;
  const classIdByName = new Map(
    (classRows as unknown as { id: string; name: string }[]).map((c) => [c.name, c.id]),
  );

  const byClass = new Map<string, DtrRow[]>();
  rows.forEach((r) => {
    const arr = byClass.get(r.class) ?? [];
    arr.push(r);
    byClass.set(r.class, arr);
  });

  let lessonPlansCreated = 0;
  let reportsCreated = 0;
  let skippedNoClass = 0;
  let skippedNoTeacher = 0;

  for (const [className, classRowsForClass] of byClass) {
    const classId = classIdByName.get(className);
    if (!classId) {
      console.warn(`  Skip: class not found "${className}"`);
      skippedNoClass += classRowsForClass.length;
      continue;
    }

    const { data: cls, error: clsErr } = await supabase
      .from("classes")
      .select("scheduleStartTime, scheduleEndTime")
      .eq("id", classId)
      .single();
    if (clsErr) throw clsErr;
    const { scheduleStartTime, scheduleEndTime } = cls as { scheduleStartTime: string; scheduleEndTime: string };

    const { data: roster, error: rosterErr } = await supabase
      .from("class_enrollments")
      .select("studentId")
      .eq("classId", classId)
      .is("unenrolledAt", null)
      .order("studentId");
    if (rosterErr) throw rosterErr;
    const studentIds = (roster as unknown as { studentId: string }[]).map((r) => r.studentId);

    const sorted = [...classRowsForClass].sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const teacherId = teacherIdByName.get(r.tutor);
      if (!teacherId) {
        console.warn(`  Skip row ${r.row}: teacher not found "${r.tutor}"`);
        skippedNoTeacher++;
        continue;
      }

      const meetingNumber = i + 1;
      const week = Math.ceil(meetingNumber / 2);

      const { data: lp, error: lpErr } = await supabase
        .from("lesson_plans")
        .insert({
          classId,
          createdByTeacherId: teacherId,
          meetingNumber,
          week,
          scheduledDate: r.date,
          topic: r.topic,
          skills: r.skills,
        })
        .select("id")
        .single();
      if (lpErr) throw lpErr;
      const lessonPlanId = (lp as { id: string }).id;
      lessonPlansCreated++;

      const { data: meeting, error: meetErr } = await supabase
        .from("meetings")
        .insert({
          lessonPlanId,
          assignedTeacherId: teacherId,
          actualTeacherId: teacherId,
          status: "COMPLETED",
        })
        .select("id")
        .single();
      if (meetErr) throw meetErr;
      const meetingId = (meeting as { id: string }).id;

      const checkInTime = `${r.date}T${scheduleStartTime}:00+07:00`;
      const checkOutTime = `${r.date}T${scheduleEndTime}:00+07:00`;
      const durationMinutes = Math.max(
        1,
        Math.round((new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) / 60000),
      );

      await supabase.from("check_ins").insert({
        meetingId,
        teacherId,
        checkInTime,
        isLate: false,
      });
      await supabase.from("check_outs").insert({
        meetingId,
        teacherId,
        checkOutTime,
        durationMinutes,
      });

      if (r.totalCount && studentIds.length > 0) {
        const n = Math.min(r.totalCount, studentIds.length);
        const present = Math.min(r.presentCount ?? n, n);
        const attendanceRows = studentIds.slice(0, n).map((studentId, idx) => ({
          meetingId,
          studentId,
          status: idx < present ? "PRESENT" : "ABSENT",
        }));
        await supabase.from("attendances").insert(attendanceRows);
      }

      const { error: reportErr } = await supabase.from("teaching_reports").insert({
        meetingId,
        originalTeacherId: teacherId,
        actualTeachingDate: r.date,
        skills: r.skills,
        objectivesAchieved: r.objectivesAchieved,
        whatWentWell: r.whatWentWell,
        whatNeedsImprovement: r.whatNeedsImprovement,
        nextLessonNotes: r.nextLessonNotes,
        photoDriveFileId: r.photoDriveFileId,
        summary: r.followUpNote,
      });
      if (reportErr) throw reportErr;
      reportsCreated++;
    }

    console.log(`  ${className}: ${sorted.length} reports imported`);
  }

  console.log("\n=== DONE ===");
  console.log(`Lesson plans created: ${lessonPlansCreated}`);
  console.log(`Reports created: ${reportsCreated}`);
  console.log(`Skipped (no class match): ${skippedNoClass}`);
  console.log(`Skipped (no teacher match): ${skippedNoTeacher}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
