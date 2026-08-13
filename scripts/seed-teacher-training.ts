// Imports the "Guru, Staf & Karyawan SIT Nurul Fajri" teacher-training
// English course schedule from
// reference-data/JADWAL KURSUS GURU, STAF &KARYAWAN SIT (1).xlsx (sheet
// "JADWAL NEW") into Supabase. Idempotent: matches existing classes by
// name+school, existing tutor accounts by email, and existing trainee
// records by fullName+school instead of blindly inserting duplicates.
//
// Run with:
//   npx tsx scripts/seed-teacher-training.ts dev    (targets .env.staging)
//   npx tsx scripts/seed-teacher-training.ts prod    (targets .env)

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const target = process.argv[2];
if (target !== "dev" && target !== "prod") {
  throw new Error('Usage: npx tsx scripts/seed-teacher-training.ts <dev|prod>');
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

const SEED_JSON_PATH =
  "/private/tmp/claude-502/-Users-wiraraja-Documents-LMS-NGE/865dc384-6af2-461d-8896-0e3078f08daf/scratchpad/teacher_training_seed.json";

interface SeedClass {
  name: string;
  room: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  tutor: string;
}
interface SeedData {
  school: string;
  tutors: Record<string, string>;
  classes: SeedClass[];
  students: Record<string, string>;
  enrollments: { class: string; studentKey: string }[];
}

function generatePassword() {
  return `Nge${Math.random().toString(36).slice(2, 10)}!`;
}

async function main() {
  const seed: SeedData = JSON.parse(readFileSync(SEED_JSON_PATH, "utf-8"));
  console.log(
    `Loaded: ${seed.classes.length} classes, ${Object.keys(seed.tutors).length} tutors, ${Object.keys(seed.students).length} trainees`,
  );

  // ── School ──
  const { data: existingSchool, error: schoolLookupErr } = await supabase
    .from("schools")
    .select("id")
    .eq("name", seed.school)
    .maybeSingle();
  if (schoolLookupErr) throw schoolLookupErr;
  if (!existingSchool) throw new Error(`School "${seed.school}" not found — expected it to already exist`);
  const schoolId = existingSchool.id;
  console.log(`School: ${seed.school} (${schoolId.slice(0, 8)})`);

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

    const { data: existingUserRow } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
    if (!existingUserRow) {
      await supabase.from("users").insert({ id: userId, email, fullName: name, role: "TEACHER" });
    }

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

  // ── Classes + schedule slots ──
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
          teacherId: teacherIdByName[c.tutor],
          name: c.name,
          room: c.room,
          scheduleDaysOfWeek: [c.dayOfWeek],
          isActive: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      classId = data.id;
      console.log(`Class created: ${c.name} (day ${c.dayOfWeek} ${c.startTime}-${c.endTime}, ${c.tutor})`);
    }
    classIdByName[c.name] = classId;

    await supabase.from("class_schedule_slots").upsert(
      { classId, dayOfWeek: c.dayOfWeek, startTime: c.startTime, endTime: c.endTime },
      { onConflict: "classId,dayOfWeek" },
    );
  }
  console.log(`Classes ready: ${Object.keys(classIdByName).length}`);

  // ── Trainees (stored as Student records, no login — same pattern as other classes) ──
  const studentIdByKey: Record<string, string> = {};
  let studentsCreated = 0;
  let studentsMatched = 0;

  for (const [key, fullName] of Object.entries(seed.students)) {
    const { data: existing } = await supabase
      .from("students")
      .select("id")
      .eq("fullName", fullName)
      .eq("schoolId", schoolId)
      .maybeSingle();
    if (existing) {
      studentIdByKey[key] = existing.id;
      studentsMatched++;
      continue;
    }
    const { data, error } = await supabase
      .from("students")
      .insert({ schoolId, fullName, isActive: true })
      .select("id")
      .single();
    if (error) throw error;
    studentIdByKey[key] = data.id;
    studentsCreated++;
  }
  console.log(`Trainees: ${studentsCreated} created, ${studentsMatched} matched existing`);

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
  console.log(`Trainees: ${Object.keys(studentIdByKey).length}`);
  console.log(`Enrollment rows: ${enrolled + enrollSkipped}`);
  if (createdCredentials.length > 0) {
    console.log("\n=== NEW TUTOR LOGIN CREDENTIALS (save these — shown once) ===");
    for (const cred of createdCredentials) {
      console.log(`  ${cred.name.padEnd(20)} ${cred.email.padEnd(32)} ${cred.password}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
