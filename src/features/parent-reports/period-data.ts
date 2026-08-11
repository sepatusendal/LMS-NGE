import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AttendanceSummary,
  StudentPeriodClassInfo,
  StudentPeriodData,
  StudentPeriodProgressNote,
  StudentPeriodTeachingReport,
} from "./schema";
import { MONTH_LABEL } from "./schema";

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function periodPrefix(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/// Pulls Attendance + Teaching Reports + Progress + Curriculum for one
/// student/period, split into flat queries joined in JS (nested Supabase
/// selects 3+ levels deep are fragile — see HANDOFF.md).
export async function getStudentPeriodData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  studentId: string,
  periodMonth: number,
  periodYear: number,
): Promise<StudentPeriodData> {
  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select("id, fullName, nis, schools(name)")
    .eq("id", studentId)
    .single();
  if (studentError) throw studentError;
  const student = studentRow as unknown as {
    id: string;
    fullName: string;
    nis: string | null;
    schools: { name: string } | { name: string }[] | null;
  };

  // Scope by the reporting period's date range up front (in SQL) instead of
  // fetching the student's entire attendance history and filtering in JS —
  // a long-enrolled student can have hundreds of attendance rows across
  // years, most of which are irrelevant to a single month's report.
  const prefix = periodPrefix(periodMonth, periodYear);
  const periodStart = `${prefix}-01`;
  const periodEndExclusive =
    periodMonth === 12
      ? `${periodYear + 1}-01-01`
      : `${periodYear}-${String(periodMonth + 1).padStart(2, "0")}-01`;

  const { data: periodLessonPlanRows, error: periodLpError } = await supabase
    .from("lesson_plans")
    .select("id, classId, scheduledDate, topic, meetingNumber, skills")
    .gte("scheduledDate", periodStart)
    .lt("scheduledDate", periodEndExclusive);
  if (periodLpError) throw periodLpError;

  const lessonPlanById = new Map((periodLessonPlanRows ?? []).map((lp) => [lp.id as string, lp]));
  const periodLessonPlanIds = Array.from(lessonPlanById.keys());

  if (periodLessonPlanIds.length === 0) {
    return emptyPeriodData(student, periodMonth, periodYear);
  }

  const { data: periodMeetingRows, error: periodMeetingError } = await supabase
    .from("meetings")
    .select("id, lessonPlanId")
    .in("lessonPlanId", periodLessonPlanIds);
  if (periodMeetingError) throw periodMeetingError;

  const lessonPlanIdByMeeting = new Map(
    (periodMeetingRows ?? []).map((m) => [m.id as string, m.lessonPlanId as string]),
  );

  const { data: attendanceRows, error: attendanceError } = await supabase
    .from("attendances")
    .select("id, status, meetingId")
    .eq("studentId", studentId)
    .in("meetingId", Array.from(lessonPlanIdByMeeting.keys()));
  if (attendanceError) throw attendanceError;

  const periodMeetingIds: string[] = [];
  const meetingMeta = new Map<
    string,
    { classId: string; scheduledDate: string; topic: string; meetingNumber: number; skills: string[] }
  >();
  for (const row of attendanceRows ?? []) {
    const meetingId = row.meetingId as string;
    const lessonPlanId = lessonPlanIdByMeeting.get(meetingId);
    if (!lessonPlanId) continue;
    const lp = lessonPlanById.get(lessonPlanId);
    if (!lp) continue;
    periodMeetingIds.push(meetingId);
    meetingMeta.set(meetingId, {
      classId: lp.classId as string,
      scheduledDate: lp.scheduledDate as string,
      topic: (lp.topic as string) ?? "",
      meetingNumber: (lp.meetingNumber as number) ?? 0,
      skills: (lp.skills as string[]) ?? [],
    });
  }

  if (periodMeetingIds.length === 0) {
    return emptyPeriodData(student, periodMonth, periodYear);
  }

  const classIds = Array.from(new Set(Array.from(meetingMeta.values()).map((m) => m.classId)));
  const { data: classRows, error: classError } = await supabase
    .from("classes")
    .select("id, name, curriculumId")
    .in("id", classIds);
  if (classError) throw classError;

  const curriculumIds = Array.from(
    new Set((classRows ?? []).map((c) => c.curriculumId).filter(Boolean) as string[]),
  );
  const curriculumById = new Map<string, { name: string; gradeLevel: string }>();
  if (curriculumIds.length > 0) {
    const { data: curriculumRows, error: curriculumError } = await supabase
      .from("curriculums")
      .select("id, name, gradeLevel")
      .in("id", curriculumIds);
    if (curriculumError) throw curriculumError;
    for (const c of curriculumRows ?? []) {
      curriculumById.set(c.id as string, { name: c.name as string, gradeLevel: c.gradeLevel as string });
    }
  }

  const classInfoById = new Map<string, StudentPeriodClassInfo>();
  for (const c of classRows ?? []) {
    const curriculum = c.curriculumId ? curriculumById.get(c.curriculumId as string) : undefined;
    classInfoById.set(c.id as string, {
      classId: c.id as string,
      className: c.name as string,
      curriculumName: curriculum?.name ?? null,
      gradeLevel: curriculum?.gradeLevel ?? null,
    });
  }

  const { data: reportRows, error: reportError } = await supabase
    .from("teaching_reports")
    .select("id, meetingId, skills, objectivesAchieved, whatWentWell, whatNeedsImprovement")
    .in("meetingId", periodMeetingIds);
  if (reportError) throw reportError;

  const teachingReports: StudentPeriodTeachingReport[] = (reportRows ?? []).map((r) => {
    const meta = meetingMeta.get(r.meetingId as string)!;
    return {
      meetingId: r.meetingId as string,
      date: meta.scheduledDate,
      className: classInfoById.get(meta.classId)?.className ?? "-",
      meetingNumber: meta.meetingNumber,
      topic: meta.topic,
      skills: (r.skills as string[]) ?? meta.skills,
      objectivesAchieved: r.objectivesAchieved as "YES" | "PARTIALLY" | "NO" | null,
      whatWentWell: r.whatWentWell as string | null,
      whatNeedsImprovement: r.whatNeedsImprovement as string | null,
    };
  });
  teachingReports.sort((a, b) => a.date.localeCompare(b.date));

  const reportIds = (reportRows ?? []).map((r) => r.id as string);
  let progressNotes: StudentPeriodProgressNote[] = [];
  if (reportIds.length > 0) {
    const { data: progressRows, error: progressError } = await supabase
      .from("progress_records")
      .select("skillArea, note, createdAt, teachingReportId")
      .eq("studentId", studentId)
      .in("teachingReportId", reportIds);
    if (progressError) throw progressError;
    progressNotes = (progressRows ?? [])
      .map((p) => ({
        date: p.createdAt as string,
        skillArea: p.skillArea as string | null,
        note: p.note as string,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // No client-side filter needed here: attendanceRows was already scoped to
  // the period's meetings via the `.in("meetingId", ...)` clause above.
  const periodAttendance = attendanceRows ?? [];
  const attendance: AttendanceSummary = {
    present: periodAttendance.filter((a) => a.status === "PRESENT").length,
    absent: periodAttendance.filter((a) => a.status === "ABSENT").length,
    excused: periodAttendance.filter((a) => a.status === "EXCUSED").length,
    late: periodAttendance.filter((a) => a.status === "LATE").length,
    total: periodAttendance.length,
  };

  const skillsCovered = Array.from(new Set(teachingReports.flatMap((r) => r.skills))).sort();

  return {
    studentId: student.id,
    studentName: student.fullName,
    nis: student.nis,
    schoolName: toOne(student.schools)?.name ?? "-",
    periodMonth,
    periodYear,
    classes: classIds.map((id) => classInfoById.get(id)!).filter(Boolean),
    attendance,
    lessonsCompleted: periodMeetingIds.length,
    skillsCovered,
    teachingReports,
    progressNotes,
  };
}

function emptyPeriodData(
  student: { id: string; fullName: string; nis: string | null; schools: { name: string } | { name: string }[] | null },
  periodMonth: number,
  periodYear: number,
): StudentPeriodData {
  return {
    studentId: student.id,
    studentName: student.fullName,
    nis: student.nis,
    schoolName: toOne(student.schools)?.name ?? "-",
    periodMonth,
    periodYear,
    classes: [],
    attendance: { present: 0, absent: 0, excused: 0, late: 0, total: 0 },
    lessonsCompleted: 0,
    skillsCovered: [],
    teachingReports: [],
    progressNotes: [],
  };
}

export function draftTeacherComments(data: StudentPeriodData): string {
  const monthLabel = `${MONTH_LABEL[data.periodMonth]} ${data.periodYear}`;

  if (data.lessonsCompleted === 0) {
    return `Belum ada kelas yang tercatat untuk ${data.studentName} pada periode ${monthLabel}.`;
  }

  const total = data.attendance.total;
  const attended = data.attendance.present + data.attendance.late;
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

  const achievedCounts = data.teachingReports.reduce(
    (acc, r) => {
      if (r.objectivesAchieved) acc[r.objectivesAchieved] += 1;
      return acc;
    },
    { YES: 0, PARTIALLY: 0, NO: 0 } as Record<"YES" | "PARTIALLY" | "NO", number>,
  );
  const totalObjectives = achievedCounts.YES + achievedCounts.PARTIALLY + achievedCounts.NO;

  const lines: string[] = [];

  // Opening — warm & personalized
  lines.push(
    `Kepada orang tua/wali dari ananda ${data.studentName},\n\n` +
    `Berikut adalah rangkuman perkembangan belajar Bahasa Inggris ananda selama ${monthLabel}. ` +
    `Kami di NUFA Global Education percaya bahwa komunikasi antara guru dan orang tua ` +
    `adalah kunci keberhasilan belajar siswa.`,
  );

  // Attendance summary with tone based on rate. Note: lessonsCompleted and
  // attendance.total are both derived from held meetings for this student,
  // so they're structurally always ~equal — this isn't "attended vs missed
  // meetings", it's "meetings held this period" plus the actual attendance
  // rate below (present+late / total), which is where the real signal is.
  lines.push(
    `\nKEHADIRAN\n` +
    `Ananda mengikuti ${data.lessonsCompleted} pertemuan pada periode ini ` +
    `(tingkat kehadiran ${rate}%). ` +
    (rate >= 90
      ? `Kehadiran ananda sangat baik! Konsistensi ini sangat membantu proses belajar. Pertahankan ya.`
      : rate >= 75
        ? `Kehadiran ananda cukup baik, namun masih ada ruang untuk peningkatan. ` +
          `Ketidakhadiran dapat mempengaruhi pemahaman materi karena setiap pertemuan saling terhubung.`
        : `Tingkat kehadiran ananda masih perlu ditingkatkan. ` +
          `Kami sarankan untuk menjaga konsistensi kehadiran karena materi Bahasa Inggris ` +
          `dibangun secara bertahap — setiap pertemuan adalah fondasi untuk pertemuan berikutnya.`),
  );

  if (data.attendance.late > 0) {
    const lateRate = Math.round((data.attendance.late / total) * 100);
    lines.push(
      lateRate > 30
        ? `Mohon perhatian: ananda tercatat terlambat pada ${data.attendance.late} pertemuan. ` +
          `Keterlambatan yang sering dapat mengganggu sesi pemanasan (warm-up) yang penting untuk mempersiapkan siswa secara mental sebelum belajar.`
        : `Ananda tercatat terlambat ${data.attendance.late} kali. Masih dalam batas wajar, namun ketepatan waktu adalah kebiasaan baik yang layak ditanamkan sejak dini.`,
    );
  }

  // Skills & curriculum progress
  if (data.skillsCovered.length > 0) {
    lines.push(
      `\nKEMAMPUAN YANG DILATIH\n` +
      `Pada periode ini, ananda berlatih: ${data.skillsCovered.join(", ")}. ` +
      `Kombinasi kemampuan ini penting untuk membangun kompetensi Bahasa Inggris yang seimbang — ` +
      `tidak hanya bisa membaca dan menulis, tetapi juga percaya diri dalam berbicara dan mendengarkan.`,
    );
  }

  // Objectives achievement with analysis
  if (totalObjectives > 0) {
    const yesRate = Math.round((achievedCounts.YES / totalObjectives) * 100);
    lines.push(
      `\nCAPAIAN PEMBELAJARAN\n` +
      `Dari ${totalObjectives} topik yang dipelajari:\n` +
      `• ${achievedCounts.YES} topik tercapai penuh\n` +
      `• ${achievedCounts.PARTIALLY} topik tercapai sebagian\n` +
      `• ${achievedCounts.NO} topik masih perlu pengulangan\n\n` +
      (yesRate >= 80
        ? `Mayoritas tujuan pembelajaran tercapai dengan baik — selamat! Ini menunjukkan ananda fokus dan terlibat aktif di kelas.`
        : yesRate >= 50
          ? `Pencapaian pembelajaran cukup baik, namun beberapa topik perlu pengulangan di rumah. Kami sarankan orang tua membantu ananda mengulang materi di luar jam kelas.`
          : `Beberapa topik masih perlu perhatian lebih. Kami akan fokus pada topik-topik ini di pertemuan mendatang. Orang tua dapat membantu dengan mendorong ananda untuk lebih aktif bertanya di kelas.`),
    );
  }

  // Insights from teacher notes
  const highlights = data.teachingReports
    .map((r) => r.whatWentWell)
    .filter((v): v is string => Boolean(v && v.trim()));
  const improvements = data.teachingReports
    .map((r) => r.whatNeedsImprovement)
    .filter((v): v is string => Boolean(v && v.trim()));

  if (highlights.length > 0) {
    lines.push(
      `\nHAL POSITIF YANG TERLIHAT\n` +
      highlights.slice(0, 3).map((h) => `• ${h}`).join("\n"),
    );
  }

  if (improvements.length > 0) {
    lines.push(
      `\nYANG PERLU DITINGKATKAN\n` +
      improvements.slice(0, 3).map((h) => `• ${h}`).join("\n"),
    );
  }

  // Actionable recommendations based on data patterns
  lines.push(`\nREKOMENDASI UNTUK ORANG TUA`);

  const recs: string[] = [];

  if (rate < 90 && data.attendance.absent > 0) {
    recs.push(
      `• Jika ananda tidak dapat hadir, mohon informasikan kepada kami terlebih dahulu ` +
      `agar guru dapat memberikan tugas pengganti atau materi susulan.`,
    );
  }

  if (data.skillsCovered.includes("Speaking")) {
    recs.push(
      `• Dorong ananda untuk berbicara Bahasa Inggris di rumah — ` +
      `bahkan kalimat sederhana seperti "good morning" atau "how are you?" ` +
      `dapat membangun kepercayaan diri yang sangat terlihat di kelas.`,
    );
  }

  if (data.skillsCovered.includes("Reading")) {
    recs.push(
      `• Sediakan buku cerita Bahasa Inggris sederhana di rumah. ` +
      `Membaca, meskipun hanya 5-10 menit sehari, secara signifikan ` +
      `memperluas kosakata dan pemahaman tata bahasa ananda.`,
    );
  }

  if (achievedCounts.PARTIALLY + achievedCounts.NO > achievedCounts.YES) {
    recs.push(
      `• Beberapa topik belum tercapai penuh. Luangkan waktu singkat ` +
      `setiap hari untuk menanyakan "apa yang kamu pelajari di English class hari ini?" ` +
      `— mendiskusikan materi di rumah membantu memperkuat ingatan.`,
    );
  }

  if (data.attendance.late >= 3) {
    recs.push(
      `• Usahakan tiba 5-10 menit lebih awal agar ananda punya waktu ` +
      `transisi dan siap secara mental sebelum kelas dimulai.`,
    );
  }

  if (data.lessonsCompleted >= 4 && rate >= 85) {
    recs.push(
      `• Pertahankan rutinitas belajar yang sudah baik! Ananda menunjukkan ` +
      `kemajuan yang stabil. Apresiasi kecil di rumah — seperti pujian atau ` +
      `stiker reward — dapat semakin memotivasi ananda.`,
    );
  }

  recs.push(
    `• Kami selalu terbuka untuk berdiskusi mengenai perkembangan ananda. ` +
    `Silakan hubungi kami melalui sekolah jika ada pertanyaan atau masukan.`,
  );

  lines.push(recs.join("\n"));

  // Closing
  lines.push(
    `\n\nTerima kasih atas kepercayaan Bapak/Ibu kepada NUFA Global Education. ` +
    `Bersama, kita dapat membantu ananda ${data.studentName} mencapai potensi terbaiknya ` +
    `dalam Bahasa Inggris dan membangun fondasi yang kuat untuk masa depannya.`,
  );

  return lines.join("\n");
}
