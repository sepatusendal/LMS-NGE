import { createClient } from "@/lib/supabase/client";
import type { FollowUpRow, ReportNoteRow, ReportStats, TeacherAttendanceRow } from "./schema";

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

interface CheckInRow {
  teacherId: string;
  isLate: boolean;
  teachers: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null;
}

export async function fetchTeacherAttendance(days: number): Promise<TeacherAttendanceRow[]> {
  const supabase = createClient();
  const since = daysAgoStr(days);

  const { data, error } = await supabase
    .from("check_ins")
    .select("teacherId, isLate, teachers(users(fullName))")
    .gte("checkInTime", `${since}T00:00:00`);
  if (error) throw error;

  const rows = data as unknown as CheckInRow[];
  const byTeacher = new Map<string, TeacherAttendanceRow>();

  rows.forEach((row) => {
    const name = toOne(row.teachers)?.users?.fullName ?? "-";
    const existing = byTeacher.get(row.teacherId) ?? {
      teacherId: row.teacherId,
      teacherName: name,
      totalSessions: 0,
      onTimeCount: 0,
      lateCount: 0,
      onTimeRate: 0,
    };
    existing.totalSessions += 1;
    if (row.isLate) existing.lateCount += 1;
    else existing.onTimeCount += 1;
    byTeacher.set(row.teacherId, existing);
  });

  return Array.from(byTeacher.values())
    .map((t) => ({ ...t, onTimeRate: Math.round((t.onTimeCount / t.totalSessions) * 100) }))
    .sort((a, b) => b.totalSessions - a.totalSessions);
}

interface MeetingReportRow {
  status: string;
  lesson_plans: { scheduledDate: string } | { scheduledDate: string }[] | null;
  teaching_reports: { objectivesAchieved: string | null } | { objectivesAchieved: string | null }[] | null;
}

export async function fetchReportStats(days: number): Promise<ReportStats> {
  const supabase = createClient();
  const since = daysAgoStr(days * 2);
  const currentSince = daysAgoStr(days);

  const { data, error } = await supabase
    .from("meetings")
    .select(
      "status, lesson_plans!inner(scheduledDate), teaching_reports(objectivesAchieved)",
    )
    .gte("lesson_plans.scheduledDate", since);
  if (error) throw error;

  const rows = data as unknown as MeetingReportRow[];

  let totalCompletedMeetings = 0;
  let totalReportsSubmitted = 0;
  let previousReportsSubmitted = 0;
  const objectivesCount: Record<string, number> = { YES: 0, PARTIALLY: 0, NO: 0 };
  const byDate = new Map<string, number>();

  rows.forEach((row) => {
    const lp = toOne(row.lesson_plans);
    const report = toOne(row.teaching_reports);
    const inCurrentPeriod = Boolean(lp && lp.scheduledDate >= currentSince);

    if (inCurrentPeriod && row.status === "COMPLETED") totalCompletedMeetings += 1;

    if (report) {
      if (inCurrentPeriod) {
        totalReportsSubmitted += 1;
        if (report.objectivesAchieved) {
          objectivesCount[report.objectivesAchieved] = (objectivesCount[report.objectivesAchieved] ?? 0) + 1;
        }
        if (lp) byDate.set(lp.scheduledDate, (byDate.get(lp.scheduledDate) ?? 0) + 1);
      } else {
        previousReportsSubmitted += 1;
      }
    }
  });

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  return {
    totalCompletedMeetings,
    totalReportsSubmitted,
    previousReportsSubmitted,
    totalPendingReports: Math.max(0, totalCompletedMeetings - totalReportsSubmitted),
    objectives: [
      { label: "Tercapai", value: objectivesCount.YES ?? 0 },
      { label: "Sebagian", value: objectivesCount.PARTIALLY ?? 0 },
      { label: "Belum", value: objectivesCount.NO ?? 0 },
    ],
    trend: dates.map((date) => ({ date, submitted: byDate.get(date) ?? 0 })),
  };
}

export async function fetchOpenFollowUps(limit = 8): Promise<FollowUpRow[]> {
  const supabase = createClient();

  const { data: followUps, error: fuErr } = await supabase
    .from("student_follow_ups")
    .select("note, createdAt, studentId, teachingReportId")
    .is("resolvedAt", null)
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (fuErr) throw fuErr;

  const rows = followUps as unknown as {
    note: string;
    createdAt: string;
    studentId: string;
    teachingReportId: string;
  }[];
  if (rows.length === 0) return [];

  const studentIds = [...new Set(rows.map((r) => r.studentId))];
  const reportIds = [...new Set(rows.map((r) => r.teachingReportId))];

  const [{ data: students, error: stuErr }, { data: reports, error: repErr }] = await Promise.all([
    supabase.from("students").select("id, fullName").in("id", studentIds),
    supabase.from("teaching_reports").select("id, meetingId").in("id", reportIds),
  ]);
  if (stuErr) throw stuErr;
  if (repErr) throw repErr;

  const studentNameById = new Map(
    (students as unknown as { id: string; fullName: string }[]).map((s) => [s.id, s.fullName]),
  );
  const meetingIdByReport = new Map(
    (reports as unknown as { id: string; meetingId: string }[]).map((r) => [r.id, r.meetingId]),
  );

  const meetingIds = [...new Set(Array.from(meetingIdByReport.values()))];
  const { data: meetings, error: meetErr } = await supabase
    .from("meetings")
    .select("id, lessonPlanId")
    .in("id", meetingIds);
  if (meetErr) throw meetErr;

  const lessonPlanIdByMeeting = new Map(
    (meetings as unknown as { id: string; lessonPlanId: string }[]).map((m) => [m.id, m.lessonPlanId]),
  );
  const lessonPlanIds = [...new Set(Array.from(lessonPlanIdByMeeting.values()))];
  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, classId")
    .in("id", lessonPlanIds);
  if (lpErr) throw lpErr;

  const classIdByLp = new Map(
    (lessonPlans as unknown as { id: string; classId: string }[]).map((lp) => [lp.id, lp.classId]),
  );
  const classIds = [...new Set(Array.from(classIdByLp.values()))];
  const { data: classes, error: clsErr } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds);
  if (clsErr) throw clsErr;

  const classNameById = new Map(
    (classes as unknown as { id: string; name: string }[]).map((c) => [c.id, c.name]),
  );

  return rows.map((row) => {
    const meetingId = meetingIdByReport.get(row.teachingReportId);
    const lessonPlanId = meetingId ? lessonPlanIdByMeeting.get(meetingId) : undefined;
    const classId = lessonPlanId ? classIdByLp.get(lessonPlanId) : undefined;
    return {
      studentName: studentNameById.get(row.studentId) ?? "-",
      className: (classId && classNameById.get(classId)) ?? "-",
      note: row.note,
      createdAt: row.createdAt,
    };
  });
}

export async function fetchReportNotes(limit = 8): Promise<ReportNoteRow[]> {
  const supabase = createClient();

  const { data: reports, error: repErr } = await supabase
    .from("teaching_reports")
    .select("meetingId, summary, actualTeachingDate")
    .not("summary", "is", null)
    .order("actualTeachingDate", { ascending: false })
    .limit(limit);
  if (repErr) throw repErr;

  const rows = reports as unknown as { meetingId: string; summary: string; actualTeachingDate: string }[];
  if (rows.length === 0) return [];

  const meetingIds = [...new Set(rows.map((r) => r.meetingId))];
  const { data: meetings, error: meetErr } = await supabase
    .from("meetings")
    .select("id, lessonPlanId")
    .in("id", meetingIds);
  if (meetErr) throw meetErr;
  const lessonPlanIdByMeeting = new Map(
    (meetings as unknown as { id: string; lessonPlanId: string }[]).map((m) => [m.id, m.lessonPlanId]),
  );

  const lessonPlanIds = [...new Set(Array.from(lessonPlanIdByMeeting.values()))];
  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, classId")
    .in("id", lessonPlanIds);
  if (lpErr) throw lpErr;
  const classIdByLp = new Map(
    (lessonPlans as unknown as { id: string; classId: string }[]).map((lp) => [lp.id, lp.classId]),
  );

  const classIds = [...new Set(Array.from(classIdByLp.values()))];
  const { data: classes, error: clsErr } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds);
  if (clsErr) throw clsErr;
  const classNameById = new Map(
    (classes as unknown as { id: string; name: string }[]).map((c) => [c.id, c.name]),
  );

  return rows.map((r) => {
    const lessonPlanId = lessonPlanIdByMeeting.get(r.meetingId);
    const classId = lessonPlanId ? classIdByLp.get(lessonPlanId) : undefined;
    return {
      className: (classId && classNameById.get(classId)) ?? "-",
      note: r.summary,
      date: r.actualTeachingDate,
    };
  });
}

interface PayrollCheckInRow {
  teacherId: string;
  teachers:
    | { feePerMeeting: number | null; users: { fullName: string } | null }
    | { feePerMeeting: number | null; users: { fullName: string } | null }[]
    | null;
}

export interface TutorPayrollRow {
  teacherId: string;
  teacherName: string;
  feePerMeeting: number | null;
  attendedCount: number;
  subtotal: number;
}

export interface TutorPayroll {
  rows: TutorPayrollRow[];
  totalAttended: number;
  totalExpense: number;
  unbilledCount: number;
}

export async function fetchTutorPayroll(from?: string | null, to?: string | null): Promise<TutorPayroll> {
  const supabase = createClient();

  let query = supabase
    .from("check_ins")
    .select("teacherId, teachers(feePerMeeting, users(fullName))");
  if (from) query = query.gte("checkInTime", from);
  if (to) query = query.lt("checkInTime", to);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data as unknown as PayrollCheckInRow[];
  const byTeacher = new Map<string, TutorPayrollRow>();

  rows.forEach((row) => {
    const teacher = toOne(row.teachers);
    const name = teacher?.users?.fullName ?? "-";
    const fee = teacher?.feePerMeeting ?? null;
    const existing = byTeacher.get(row.teacherId) ?? {
      teacherId: row.teacherId,
      teacherName: name,
      feePerMeeting: fee,
      attendedCount: 0,
      subtotal: 0,
    };
    existing.attendedCount += 1;
    byTeacher.set(row.teacherId, existing);
  });

  const list = Array.from(byTeacher.values())
    .map((t) => ({
      ...t,
      subtotal: t.feePerMeeting != null ? t.feePerMeeting * t.attendedCount : 0,
    }))
    .sort((a, b) => b.subtotal - a.subtotal);

  const totalAttended = list.reduce((sum, t) => sum + t.attendedCount, 0);
  const totalExpense = list.reduce((sum, t) => sum + t.subtotal, 0);
  const unbilledCount = list.filter((t) => t.feePerMeeting == null).length;

  return { rows: list, totalAttended, totalExpense, unbilledCount };
}
