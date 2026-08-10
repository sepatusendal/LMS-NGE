/**
 * Bulk test-data seed for the STAGING Supabase project only — never point
 * this at prod. Run with:
 *   npx tsx scripts/seed-staging-bulk.ts
 *
 * Generates dozens-to-hundreds of realistic rows (schools, teachers,
 * students, classes, lesson plans, meetings, holidays incl. date ranges)
 * so the dev/staging environment has enough data to click around in
 * without every list being empty.
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase env vars in .env.staging");

console.log(`Seeding STAGING project: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function insertBatched<T extends object>(table: string, rows: T[], batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`  ${table}: +${rows.length}`);
}

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

async function main() {
  const TODAY = new Date("2026-08-10");

  // ── Schools ──
  const SCHOOL_NAMES = [
    "SMAN 1 Jakarta",
    "SMAN 3 Bandung",
    "SMPN 5 Surabaya",
    "SDN Menteng 01",
    "SMA Kristen Petra",
    "SMP Islam Al-Azhar",
    "SMAN 8 Yogyakarta",
    "SDIT Nurul Fikri",
  ];
  const schools = SCHOOL_NAMES.map((name, i) => ({
    id: randomUUID(),
    name,
    address: `Jl. Pendidikan No. ${i + 1}`,
    picName: `PIC ${name}`,
    picPhone: `0812${String(1000000 + i).slice(0, 7)}`,
    isActive: true,
  }));
  await insertBatched("schools", schools);

  // ── Curriculums ──
  const CURRICULUM_DEFS = [
    { name: "English Basic", gradeLevel: "SD" },
    { name: "English Intermediate", gradeLevel: "SMP" },
    { name: "English Advanced", gradeLevel: "SMA" },
    { name: "TOEFL Preparation", gradeLevel: "SMA" },
  ];
  const curriculums = CURRICULUM_DEFS.map((c) => ({
    id: randomUUID(),
    ...c,
    description: `Kurikulum ${c.name}`,
    isActive: true,
  }));
  await insertBatched("curriculums", curriculums);

  // ── Teachers (real auth accounts, password: password123) ──
  const TEACHER_NAMES = [
    "Andi Wijaya", "Bunga Lestari", "Citra Dewi", "Dedi Kurniawan", "Eni Susanti",
    "Fajar Ramadhan", "Gita Permata", "Hendra Saputra", "Indah Puspita", "Joko Widodo",
    "Kartika Sari", "Latifa Zahra", "Made Suryawan", "Nurul Hidayah", "Oscar Pratama",
    "Putri Amelia", "Rangga Adiputra", "Siti Rahmawati", "Taufik Hidayat", "Umi Kalsum",
  ];
  const teacherIds: string[] = [];
  for (let i = 0; i < TEACHER_NAMES.length; i++) {
    const fullName = TEACHER_NAMES[i];
    const email = `teacher${i + 1}.seed@nufaglobal.id`;

    const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    let userId = existing?.users.find((u) => u.email === email)?.id;

    if (!userId) {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email,
        password: "password123",
        email_confirm: true,
        user_metadata: { fullName, role: "TEACHER" },
      });
      if (error || !newUser.user) {
        console.warn(`  Skipping ${email}: ${error?.message}`);
        continue;
      }
      userId = newUser.user.id;
    }

    await supabase.from("users").upsert(
      { id: userId, email, fullName, role: "TEACHER" },
      { onConflict: "id" },
    );
    const { data: teacher } = await supabase
      .from("teachers")
      .upsert({ userId, phone: `0813${String(2000000 + i).slice(0, 7)}` }, { onConflict: "userId" })
      .select("id")
      .single();
    if (teacher) teacherIds.push(teacher.id);
  }
  console.log(`  teachers: ${teacherIds.length} ready`);

  // ── Students (spread across schools) ──
  const FIRST_NAMES = [
    "Aisyah", "Budi", "Clara", "Dimas", "Eka", "Fahri", "Gina", "Hana", "Ivan", "Julia",
    "Kevin", "Lina", "Mira", "Nanda", "Omar", "Putra", "Qonita", "Rian", "Sinta", "Tio",
    "Uci", "Vino", "Winda", "Xena", "Yusuf", "Zahra",
  ];
  const LAST_NAMES = [
    "Putri", "Santoso", "Wijaya", "Prasetyo", "Nurhalimah", "Ramadhan", "Kusuma", "Hidayat",
    "Setiawan", "Anggraini", "Firmansyah", "Pratiwi", "Gunawan", "Maharani", "Saputra",
  ];
  const students: { id: string; schoolId: string; fullName: string; nis: string; isActive: boolean }[] = [];
  let nisCounter = 1;
  for (const school of schools) {
    const count = 20 + Math.floor(Math.random() * 10); // 20-29 per school
    for (let i = 0; i < count; i++) {
      students.push({
        id: randomUUID(),
        schoolId: school.id,
        fullName: `${randomOf(FIRST_NAMES)} ${randomOf(LAST_NAMES)}`,
        nis: `2026${String(nisCounter++).padStart(4, "0")}`,
        isActive: true,
      });
    }
  }
  await insertBatched("students", students);

  // ── Classes (each with 1-2 schedule slots) ──
  const CLASS_LABELS = ["A", "B", "C", "English Club", "TOEFL Prep", "Reading Circle"];
  const classes: {
    id: string;
    schoolId: string;
    curriculumId: string;
    teacherId: string;
    name: string;
    room: string;
    scheduleDaysOfWeek: number[];
    isActive: boolean;
  }[] = [];
  const classSlots: { classId: string; dayOfWeek: number; startTime: string; endTime: string }[] = [];

  for (const school of schools) {
    const numClasses = 4 + Math.floor(Math.random() * 3); // 4-6 per school
    for (let i = 0; i < numClasses; i++) {
      const days = pick([1, 2, 3, 4, 5], Math.random() > 0.4 ? 2 : 1).sort();
      const startHour = 7 + Math.floor(Math.random() * 8);
      const startTime = `${String(startHour).padStart(2, "0")}:00`;
      const endTime = `${String(startHour + 1).padStart(2, "0")}:30`;
      const classId = randomUUID();

      classes.push({
        id: classId,
        schoolId: school.id,
        curriculumId: randomOf(curriculums).id,
        teacherId: randomOf(teacherIds),
        name: `${randomOf(CLASS_LABELS)} ${i + 1}`,
        room: `R.${100 + i}`,
        scheduleDaysOfWeek: days,
        isActive: true,
      });
      for (const day of days) {
        classSlots.push({ classId, dayOfWeek: day, startTime, endTime });
      }
    }
  }
  await insertBatched("classes", classes);
  await insertBatched("class_schedule_slots", classSlots);

  // A handful of recurring per-weekday substitute overrides (different
  // tutor covers one of the class's regular days every week).
  const overrideCandidates = classes.filter((c) => c.scheduleDaysOfWeek.length === 2);
  const scheduleOverrides = pick(overrideCandidates, Math.min(8, overrideCandidates.length)).map((c) => {
    const slot = classSlots.find((s) => s.classId === c.id && s.dayOfWeek === c.scheduleDaysOfWeek[1]);
    const otherTeachers = teacherIds.filter((t) => t !== c.teacherId);
    return {
      classId: c.id,
      dayOfWeek: c.scheduleDaysOfWeek[1],
      startTime: slot?.startTime ?? "08:00",
      endTime: slot?.endTime ?? "09:30",
      teacherId: randomOf(otherTeachers),
    };
  });
  if (scheduleOverrides.length > 0) await insertBatched("class_schedule_overrides", scheduleOverrides);

  // ── Enrollments (5-12 students per class, from the same school) ──
  const studentsBySchool = new Map<string, string[]>();
  for (const s of students) {
    const arr = studentsBySchool.get(s.schoolId) ?? [];
    arr.push(s.id);
    studentsBySchool.set(s.schoolId, arr);
  }
  const enrollments: { studentId: string; classId: string; enrolledAt: string }[] = [];
  for (const c of classes) {
    const pool = studentsBySchool.get(c.schoolId) ?? [];
    const count = Math.min(pool.length, 5 + Math.floor(Math.random() * 8));
    for (const sid of pick(pool, count)) {
      enrollments.push({ studentId: sid, classId: c.id, enrolledAt: addDays(TODAY, -60).toISOString() });
    }
  }
  await insertBatched("class_enrollments", enrollments);

  // ── Lesson plans: 8 meetings per class, walking the class's own
  // schedule days starting ~9 weeks before TODAY, so "today"/status-board
  // logic has real data to resolve against. ──
  const TOPICS = [
    "Greetings & Introductions", "Daily Routines", "Simple Past Tense", "Family & Relationships",
    "Food & Drinks", "Hobbies & Free Time", "Travel & Directions", "Shopping Dialogues",
    "Weather & Seasons", "School Life", "Future Plans", "Storytelling Basics",
  ];
  const SKILLS = ["Listening", "Speaking", "Writing", "Reading"];

  const lessonPlans: {
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

  function walkScheduleDates(days: number[], from: Date, count: number): Date[] {
    const out: Date[] = [];
    let cursor = new Date(from);
    while (out.length < count) {
      if (days.includes(cursor.getDay())) out.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    return out;
  }

  for (const c of classes) {
    const start = addDays(TODAY, -9 * 7);
    const dates = walkScheduleDates(c.scheduleDaysOfWeek, start, 8);
    dates.forEach((d, idx) => {
      lessonPlans.push({
        id: randomUUID(),
        classId: c.id,
        createdByTeacherId: c.teacherId,
        meetingNumber: idx + 1,
        week: Math.floor(idx / c.scheduleDaysOfWeek.length) + 1,
        scheduledDate: dateStr(d),
        topic: TOPICS[idx % TOPICS.length],
        level: randomOf(["SD", "SMP", "SMA"]),
        learningObjectives: `Students can understand and use ${TOPICS[idx % TOPICS.length].toLowerCase()}`,
        skills: pick(SKILLS, 2),
      });
    });
  }
  await insertBatched("lesson_plans", lessonPlans);

  // ── Meetings for past lesson plans (COMPLETED, with check-in/out,
  // attendance, and a teaching report) + a few one-off substitutes. ──
  const meetings: {
    id: string;
    lessonPlanId: string;
    assignedTeacherId: string;
    actualTeacherId: string;
    substituteReason: string | null;
    status: string;
  }[] = [];
  const checkIns: { meetingId: string; teacherId: string; checkInTime: string; isLate: boolean }[] = [];
  const checkOuts: { meetingId: string; teacherId: string; checkOutTime: string; durationMinutes: number }[] = [];
  const attendances: { meetingId: string; studentId: string; status: string }[] = [];
  const reports: {
    meetingId: string;
    originalTeacherId: string;
    substituteTeacherId: string | null;
    replacementReason: string | null;
    actualTeachingDate: string;
    skills: string[];
    objectivesAchieved: string;
    whatWentWell: string;
    whatNeedsImprovement: string;
    nextLessonNotes: string;
  }[] = [];

  const enrollByClass = new Map<string, string[]>();
  for (const e of enrollments) {
    const arr = enrollByClass.get(e.classId) ?? [];
    arr.push(e.studentId);
    enrollByClass.set(e.classId, arr);
  }
  const classById = new Map(classes.map((c) => [c.id, c]));
  const ABSENCE_REASONS = ["SICK_LEAVE", "EMERGENCY", "PERSONAL_LEAVE", "OFFICIAL_DUTY", "SCHEDULE_CONFLICT"];

  for (const lp of lessonPlans) {
    if (new Date(lp.scheduledDate) >= TODAY) continue; // future meetings: leave without a Meeting row
    const cls = classById.get(lp.classId)!;
    const isSubstituted = Math.random() < 0.12;
    const actualTeacherId = isSubstituted
      ? randomOf(teacherIds.filter((t) => t !== cls.teacherId))
      : cls.teacherId;

    const meetingId = randomUUID();
    meetings.push({
      id: meetingId,
      lessonPlanId: lp.id,
      assignedTeacherId: cls.teacherId,
      actualTeacherId,
      substituteReason: isSubstituted ? randomOf(ABSENCE_REASONS) : null,
      status: "COMPLETED",
    });

    const startTime = new Date(`${lp.scheduledDate}T${classSlots.find((s) => s.classId === cls.id)?.startTime ?? "08:00"}:00`);
    const isLate = Math.random() < 0.1;
    checkIns.push({
      meetingId,
      teacherId: actualTeacherId,
      checkInTime: addDays(startTime, 0).toISOString(),
      isLate,
    });
    checkOuts.push({
      meetingId,
      teacherId: actualTeacherId,
      checkOutTime: new Date(startTime.getTime() + 90 * 60000).toISOString(),
      durationMinutes: 90,
    });

    for (const sid of enrollByClass.get(cls.id) ?? []) {
      attendances.push({
        meetingId,
        studentId: sid,
        status: Math.random() < 0.9 ? "PRESENT" : randomOf(["ABSENT", "EXCUSED", "LATE"]),
      });
    }

    reports.push({
      meetingId,
      originalTeacherId: cls.teacherId,
      substituteTeacherId: isSubstituted ? actualTeacherId : null,
      replacementReason: isSubstituted ? "Guru asli berhalangan hadir" : null,
      actualTeachingDate: lp.scheduledDate,
      skills: pick(SKILLS, 2),
      objectivesAchieved: randomOf(["YES", "YES", "YES", "PARTIALLY", "NO"]),
      whatWentWell: `Siswa aktif berpartisipasi di sesi "${lp.topic}"`,
      whatNeedsImprovement: "Perlu lebih banyak latihan speaking",
      nextLessonNotes: "Review vocabulary minggu depan",
    });
  }
  await insertBatched("meetings", meetings);
  await insertBatched("check_ins", checkIns);
  await insertBatched("check_outs", checkOuts);
  await insertBatched("attendances", attendances);
  await insertBatched("teaching_reports", reports);

  // ── Holidays: a mix of multi-day ranges and single days, global and
  // per-school, to exercise the new holiday feature end-to-end. ──
  function holidayRange(name: string, from: Date, to: Date, schoolId: string | null) {
    const rows: { date: string; name: string; schoolId: string | null }[] = [];
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      rows.push({ date: dateStr(d), name, schoolId });
    }
    return rows;
  }

  const holidays = [
    ...holidayRange("Libur Semester Ganjil", addDays(TODAY, 20), addDays(TODAY, 34), null),
    ...holidayRange("Cuti Bersama Nasional", addDays(TODAY, -5), addDays(TODAY, -3), null),
    ...holidayRange("Hari Kemerdekaan RI", addDays(TODAY, 7), addDays(TODAY, 7), null),
    ...holidayRange("Libur Ujian Sekolah", addDays(TODAY, 45), addDays(TODAY, 49), schools[0].id),
    ...holidayRange("Acara Sekolah", addDays(TODAY, 12), addDays(TODAY, 12), schools[1].id),
    ...holidayRange("Libur Maulid Nabi", addDays(TODAY, 60), addDays(TODAY, 60), null),
  ];
  await insertBatched("holidays", holidays);

  console.log("\nSeed complete.");
  console.log(`  Schools: ${schools.length}, Teachers: ${teacherIds.length}, Students: ${students.length}`);
  console.log(`  Classes: ${classes.length}, Lesson plans: ${lessonPlans.length}, Meetings: ${meetings.length}`);
  console.log(`  Holidays: ${holidays.length} rows`);
  console.log("  Teacher login: teacher1.seed@nufaglobal.id / password123 (through teacher20)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
