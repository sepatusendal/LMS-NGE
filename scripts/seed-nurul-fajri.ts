// One-off import of real production data from
// reference-data/KELAS ENGLISH COURSE JULI.xlsx (sheet "KELAS" only) into
// Supabase. Idempotent: safe to re-run — matches existing rows by name/NIS
// instead of blindly inserting duplicates.
//
// Run with: npx tsx scripts/seed-nurul-fajri.ts

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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Missing env vars");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_JSON_PATH =
  "/private/tmp/claude-502/-Users-wiraraja-Documents-LMS-NGE/9d08f836-3d24-4294-8b0b-6ca9de7a1d4c/scratchpad/seed_final.json";

interface SeedStudent {
  no: number;
  nis: string | null;
  nama: string;
  grade: number | null;
}
interface SeedClass {
  name: string;
  room: string | null;
  scheduleDaysOfWeek: number[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  defaultTeacher: string;
  override: { dayOfWeek: number; teacher: string; startTime: string; endTime: string } | null;
  students: SeedStudent[];
}
interface SeedData {
  school: string;
  tutors: Record<string, string>;
  classes: SeedClass[];
  students: Record<string, { nis: string | null; nama: string }>;
  enrollments: { class: string; studentKey: string }[];
}

function generatePassword() {
  return `Nge${Math.random().toString(36).slice(2, 10)}!`;
}

async function main() {
  const seed: SeedData = JSON.parse(readFileSync(SEED_JSON_PATH, "utf-8"));
  console.log(`Loaded: ${seed.classes.length} classes, ${Object.keys(seed.tutors).length} tutors, ${Object.keys(seed.students).length} students`);

  // ── School ──
  const { data: existingSchool } = await supabase
    .from("schools")
    .select("id")
    .eq("name", seed.school)
    .maybeSingle();

  let schoolId: string;
  if (existingSchool) {
    schoolId = existingSchool.id;
    console.log(`School exists: ${seed.school} (${schoolId.slice(0, 8)})`);
  } else {
    const { data, error } = await supabase.from("schools").insert({ name: seed.school, isActive: true }).select("id").single();
    if (error) throw error;
    schoolId = data.id;
    console.log(`School created: ${seed.school} (${schoolId.slice(0, 8)})`);
  }

  // ── Tutors -> Supabase Auth + teachers ──
  const teacherIdByName: Record<string, string> = {};
  const createdCredentials: { name: string; email: string; password: string }[] = [];

  const { data: existingUsersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existingAuthUsers = existingUsersPage?.users ?? [];

  for (const [name, email] of Object.entries(seed.tutors)) {
    const found = existingAuthUsers.find((u) => u.email === email);
    let userId: string;
    if (found) {
      userId = found.id;
      console.log(`Tutor auth exists: ${name} <${email}>`);
    } else {
      const password = generatePassword();
      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, role: "TEACHER" },
      });
      if (error || !created.user) throw new Error(`Failed creating auth user ${email}: ${error?.message}`);
      userId = created.user.id;
      createdCredentials.push({ name, email, password });
      console.log(`Tutor auth created: ${name} <${email}>`);
    }

    await supabase.from("users").upsert(
      { id: userId, email, fullName: name, role: "TEACHER" },
      { onConflict: "id" },
    );

    const { data: existingTeacher } = await supabase.from("teachers").select("id").eq("userId", userId).maybeSingle();
    let teacherId: string;
    if (existingTeacher) {
      teacherId = existingTeacher.id;
    } else {
      const { data, error } = await supabase.from("teachers").insert({ userId }).select("id").single();
      if (error) throw error;
      teacherId = data.id;
    }
    teacherIdByName[name] = teacherId;
  }
  console.log(`Tutors ready: ${Object.keys(teacherIdByName).length}`);

  // ── Classes + schedule overrides ──
  const classIdByName: Record<string, string> = {};
  for (const c of seed.classes) {
    const { data: existingClass } = await supabase
      .from("classes")
      .select("id")
      .eq("name", c.name)
      .eq("schoolId", schoolId)
      .maybeSingle();

    let classId: string;
    if (existingClass) {
      classId = existingClass.id;
      console.log(`Class exists: ${c.name}`);
    } else {
      const { data, error } = await supabase
        .from("classes")
        .insert({
          schoolId,
          teacherId: teacherIdByName[c.defaultTeacher],
          name: c.name,
          room: c.room,
          scheduleDaysOfWeek: c.scheduleDaysOfWeek,
          scheduleStartTime: c.scheduleStartTime,
          scheduleEndTime: c.scheduleEndTime,
          isActive: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      classId = data.id;
      console.log(`Class created: ${c.name} (${c.scheduleDaysOfWeek.join(",")} ${c.scheduleStartTime}-${c.scheduleEndTime}, ${c.defaultTeacher})`);
    }
    classIdByName[c.name] = classId;

    if (c.override) {
      await supabase.from("class_schedule_overrides").upsert(
        {
          classId,
          dayOfWeek: c.override.dayOfWeek,
          startTime: c.override.startTime,
          endTime: c.override.endTime,
          teacherId: teacherIdByName[c.override.teacher],
        },
        { onConflict: "classId,dayOfWeek" },
      );
      console.log(`  override day ${c.override.dayOfWeek}: ${c.override.teacher} ${c.override.startTime}-${c.override.endTime}`);
    }
  }
  console.log(`Classes ready: ${Object.keys(classIdByName).length}`);

  // ── Students ──
  const studentIdByKey: Record<string, string> = {};
  let studentsCreated = 0;
  let studentsMatched = 0;

  for (const [key, s] of Object.entries(seed.students)) {
    if (s.nis) {
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("nis", s.nis)
        .eq("schoolId", schoolId)
        .maybeSingle();
      if (existing) {
        studentIdByKey[key] = existing.id;
        studentsMatched++;
        continue;
      }
    }
    const { data, error } = await supabase
      .from("students")
      .insert({ schoolId, fullName: s.nama, nis: s.nis, isActive: true })
      .select("id")
      .single();
    if (error) throw error;
    studentIdByKey[key] = data.id;
    studentsCreated++;
  }
  console.log(`Students: ${studentsCreated} created, ${studentsMatched} matched existing`);

  // ── Enrollments ──
  let enrolled = 0;
  let enrollSkipped = 0;
  for (const e of seed.enrollments) {
    const classId = classIdByName[e.class];
    const studentId = studentIdByKey[e.studentKey];
    if (!classId || !studentId) continue;
    const { data: existing } = await supabase
      .from("class_enrollments")
      .select("id")
      .eq("classId", classId)
      .eq("studentId", studentId)
      .maybeSingle();
    if (existing) {
      enrollSkipped++;
      continue;
    }
    const { error } = await supabase
      .from("class_enrollments")
      .insert({ classId, studentId, enrolledAt: "2026-07-01T00:00:00Z" });
    if (error) throw error;
    enrolled++;
  }
  console.log(`Enrollments: ${enrolled} created, ${enrollSkipped} already existed`);

  console.log("\n=== DONE ===");
  console.log(`School: ${seed.school}`);
  console.log(`Classes: ${Object.keys(classIdByName).length}`);
  console.log(`Tutors: ${Object.keys(teacherIdByName).length}`);
  console.log(`Students: ${Object.keys(studentIdByKey).length}`);
  console.log(`Enrollment rows: ${enrolled + enrollSkipped}`);
  if (createdCredentials.length > 0) {
    console.log("\n=== NEW TEACHER LOGIN CREDENTIALS (save these — shown once) ===");
    for (const cred of createdCredentials) {
      console.log(`  ${cred.name.padEnd(16)} ${cred.email.padEnd(32)} ${cred.password}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
