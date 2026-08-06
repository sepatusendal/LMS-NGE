import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env
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

async function main() {
  console.log("🌱 Seeding...");

  // ── Create test accounts in Supabase Auth ──
  const testAccounts = [
    { email: "admin@nufaglobal.id", password: "password123", role: "ADMIN", fullName: "Admin NGE" },
    { email: "coordinator@nufaglobal.id", password: "password123", role: "COORDINATOR", fullName: "Coordinator NGE" },
    { email: "teacher@nufaglobal.id", password: "password123", role: "TEACHER", fullName: "Teacher NGE" },
  ];

  for (const acc of testAccounts) {
    const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    const users = existing?.users ?? [];
    const found = users.find((u) => u.email === acc.email);

    if (!found) {
      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: { fullName: acc.fullName },
      });
      if (error) {
        console.warn(`  Could not create ${acc.email}: ${error.message}`);
      } else {
        console.log(`  Auth user created: ${acc.email}`);

        // Insert into users table (trigger should handle this, but ensure it)
        if (newUser.user) {
          await supabase.from("users").upsert({
            id: newUser.user.id,
            email: acc.email,
            fullName: acc.fullName,
            role: acc.role,
          }, { onConflict: "id" });

          if (acc.role === "TEACHER") {
            await supabase.from("teachers").upsert({
              userId: newUser.user.id,
              phone: "08123456789",
            }, { onConflict: "userId" });
          }
        }
      }
    } else {
      console.log(`  Auth user exists: ${acc.email}`);
      // Ensure users table is synced
      await supabase.from("users").upsert({
        id: found.id,
        email: acc.email,
        fullName: acc.fullName,
        role: acc.role,
      }, { onConflict: "id" });

      if (acc.role === "TEACHER") {
        await supabase.from("teachers").upsert({
          userId: found.id,
          phone: "08123456789",
        }, { onConflict: "userId" });
      }
    }
  }

  // ── Find test teacher ──
  const { data: teacherUser } = await supabase
    .from("users")
    .select("id, fullName")
    .eq("email", "teacher@nufaglobal.id")
    .single();
  if (!teacherUser) throw new Error("teacher@nufaglobal.id not found. Run test account creation first.");
  console.log(`  Teacher: ${teacherUser.fullName} (${teacherUser.id.slice(0, 8)}...)`);

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("userId", teacherUser.id)
    .single();
  if (!teacher) throw new Error("Teacher profile not found");
  const teacherId = teacher.id;

  // ── Create school ──
  const { data: school } = await supabase
    .from("schools")
    .upsert({ id: "00000000-0000-4000-a000-000000000001", name: "SMAN 1 Jakarta", address: "Jl. Merdeka No. 1" }, { onConflict: "id" })
    .select("id")
    .single();
  const schoolId = school!.id;
  console.log(`  School: SMAN 1 Jakarta`);

  // ── Create students ──
  const studentData = [
    { id: "00000000-0000-4000-a001-000000000001", fullName: "Aisyah Putri", nis: "2024001" },
    { id: "00000000-0000-4000-a001-000000000002", fullName: "Budi Santoso", nis: "2024002" },
    { id: "00000000-0000-4000-a001-000000000003", fullName: "Clara Wijaya", nis: "2024003" },
    { id: "00000000-0000-4000-a001-000000000004", fullName: "Dimas Prasetyo", nis: "2024004" },
    { id: "00000000-0000-4000-a001-000000000005", fullName: "Eka Nurhalimah", nis: "2024005" },
  ];
  const studentIds: string[] = [];
  for (const s of studentData) {
    await supabase.from("students").upsert({ ...s, schoolId }, { onConflict: "id" });
    studentIds.push(s.id);
  }
  console.log(`  Students: ${studentData.length} created`);

  // ── Create curriculum ──
  await supabase.from("curriculums").upsert(
    { id: "00000000-0000-4000-a002-000000000001", name: "English Basic", gradeLevel: "SMA", description: "Kurikulum dasar Bahasa Inggris" },
    { onConflict: "id" },
  );

  // ── Create class scheduled for today ──
  const today = new Date().getDay(); // 0=Sun ... 6=Sat
  const classId = "00000000-0000-4000-a003-000000000001";
  await supabase.from("classes").upsert({
    id: classId,
    schoolId,
    curriculumId: "00000000-0000-4000-a002-000000000001",
    teacherId,
    name: "English A",
    room: "R.201",
    scheduleDaysOfWeek: [today, (today + 3) % 7], // today + another day
    scheduleStartTime: "10:00",
    scheduleEndTime: "11:30",
    isActive: true,
  }, { onConflict: "id" });
  console.log(`  Class: English A (schedule today + ${(today + 3) % 7 || 7})`);

  // ── Enroll students ──
  for (const sid of studentIds) {
    await supabase.from("class_enrollments").upsert(
      { studentId: sid, classId, enrolledAt: new Date("2026-07-01").toISOString() },
      { onConflict: "studentId, classId" },
    );
  }
  console.log(`  Enrollments: ${studentIds.length}`);

  // ── Create lesson plans (meeting 1 & 2 = completed, meeting 3 = today) ──
  const lp1Id = "00000000-0000-4000-a004-000000000001";
  const lp2Id = "00000000-0000-4000-a004-000000000002";
  const lp3Id = "00000000-0000-4000-a004-000000000003";

  const todayStr = new Date().toISOString().slice(0, 10);
  const past1 = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const past2 = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  await supabase.from("lesson_plans").upsert({
    id: lp1Id, classId, createdByTeacherId: teacherId,
    meetingNumber: 1, week: 1, scheduledDate: past1,
    topic: "Greetings & Introductions", level: "SMA",
    learningObjectives: "Students can introduce themselves in English",
    skills: ["Speaking", "Listening"],
  }, { onConflict: "id" });

  await supabase.from("lesson_plans").upsert({
    id: lp2Id, classId, createdByTeacherId: teacherId,
    meetingNumber: 2, week: 1, scheduledDate: past2,
    topic: "Daily Routines", level: "SMA",
    learningObjectives: "Students can describe their daily routine",
    skills: ["Speaking", "Writing"],
  }, { onConflict: "id" });

  await supabase.from("lesson_plans").upsert({
    id: lp3Id, classId, createdByTeacherId: teacherId,
    meetingNumber: 3, week: 2, scheduledDate: todayStr,
    topic: "Simple Past Tense", level: "SMA",
    learningObjectives: "Students can form and use past tense verbs",
    skills: ["Writing", "Reading"],
    method: "Direct Method", procedure: "PPP (Presentation Practice Product)",
  }, { onConflict: "id" });
  console.log("  Lesson plans: 3 created (meeting 3 = today)");

  // ── Create completed meetings for 1 & 2 ──
  for (const [lpId, mn] of [[lp1Id, 1], [lp2Id, 2]] as const) {
    const { data: meeting } = await supabase.from("meetings").upsert({
      id: `00000000-0000-4000-a005-00000000000${mn}`,
      lessonPlanId: lpId,
      assignedTeacherId: teacherId,
      actualTeacherId: teacherId,
      status: "COMPLETED",
    }, { onConflict: "id" }).select("id").single();
    const meetingId = meeting!.id;

    // Check-in
    await supabase.from("check_ins").upsert({
      meetingId, teacherId,
      checkInTime: new Date(Date.now() - (7 - mn * 3) * 24 * 3600 * 1000).toISOString(),
      isLate: false,
    }, { onConflict: "meetingId" });

    // Attendance
    for (const sid of studentIds) {
      await supabase.from("attendances").upsert({
        meetingId, studentId: sid,
        status: mn === 1 || sid !== studentIds[0] ? "PRESENT" : "ABSENT",
      }, { onConflict: "meetingId, studentId" });
    }

    // Check-out
    await supabase.from("check_outs").upsert({
      meetingId, teacherId,
      checkOutTime: new Date(Date.now() - (7 - mn * 3) * 24 * 3600 * 1000 + 90 * 60000).toISOString(),
      durationMinutes: 90,
    }, { onConflict: "meetingId" });

    // Report
    await supabase.from("teaching_reports").upsert({
      meetingId,
      originalTeacherId: teacherId,
      actualTeachingDate: [past1, past2][mn - 1],
      skills: ["Speaking", "Listening"],
      objectivesAchieved: "YES",
      whatWentWell: `Students were engaged in meeting ${mn}`,
      whatNeedsImprovement: "More practice for speaking",
      nextLessonNotes: "Review vocabulary",
    }, { onConflict: "meetingId" });
  }
  console.log("  Meetings 1-2: completed with full workflow");

  console.log("\n✅ Seed complete!");
  console.log("   Login as teacher@nufaglobal.id / password123");
  console.log("   Go to /today to see meeting 3 ready to start!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
