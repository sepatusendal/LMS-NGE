import { createClient } from "@/lib/supabase/client";
import type { ObjectivesAchieved } from "./schema";

export interface AdminReportListItem {
  id: string;
  meetingId: string;
  actualTeachingDate: string;
  classId: string;
  className: string;
  schoolName: string;
  teacherName: string;
  isSubstitute: boolean;
  topic: string;
  meetingNumber: number;
  objectivesAchieved: ObjectivesAchieved | null;
  attendancePresent: number;
  attendanceTotal: number;
}

export interface AdminReportDetail {
  id: string;
  meetingId: string;
  actualTeachingDate: string;
  className: string;
  schoolName: string;
  teacherName: string;
  isSubstitute: boolean;
  originalTeacherName: string;
  topic: string;
  meetingNumber: number;
  scheduledDate: string;
  skills: string[];
  objectivesAchieved: ObjectivesAchieved | null;
  whatWentWell: string | null;
  whatNeedsImprovement: string | null;
  nextLessonNotes: string | null;
  homeworkAssigned: string | null;
  summary: string | null;
  photoDriveFileId: string | null;
  attendancePresent: number;
  attendanceTotal: number;
  followUps: { id: string; studentName: string; note: string }[];
}

interface ReportRow {
  id: string;
  meetingId: string;
  originalTeacherId: string;
  substituteTeacherId: string | null;
  actualTeachingDate: string;
  skills: string[];
  objectivesAchieved: ObjectivesAchieved | null;
  whatWentWell: string | null;
  whatNeedsImprovement: string | null;
  nextLessonNotes: string | null;
  homeworkAssigned: string | null;
  summary: string | null;
  photoDriveFileId: string | null;
}

async function buildContext(reports: ReportRow[]) {
  const supabase = createClient();

  const meetingIds = [...new Set(reports.map((r) => r.meetingId))];
  const { data: meetings, error: meetErr } = await supabase
    .from("meetings")
    .select("id, lessonPlanId, assignedTeacherId, actualTeacherId")
    .in("id", meetingIds);
  if (meetErr) throw meetErr;
  const meetingById = new Map(
    (meetings as unknown as { id: string; lessonPlanId: string; assignedTeacherId: string; actualTeacherId: string | null }[]).map(
      (m) => [m.id, m],
    ),
  );

  const lessonPlanIds = [...new Set(Array.from(meetingById.values()).map((m) => m.lessonPlanId))];
  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, classId, topic, meetingNumber, scheduledDate")
    .in("id", lessonPlanIds);
  if (lpErr) throw lpErr;
  const lpById = new Map(
    (lessonPlans as unknown as { id: string; classId: string; topic: string; meetingNumber: number; scheduledDate: string }[]).map(
      (lp) => [lp.id, lp],
    ),
  );

  const classIds = [...new Set(Array.from(lpById.values()).map((lp) => lp.classId))];
  const { data: classes, error: clsErr } = await supabase
    .from("classes")
    .select("id, name, schoolId")
    .in("id", classIds);
  if (clsErr) throw clsErr;
  const clsById = new Map(
    (classes as unknown as { id: string; name: string; schoolId: string }[]).map((c) => [c.id, c]),
  );

  const schoolIds = [...new Set(Array.from(clsById.values()).map((c) => c.schoolId))];
  const { data: schools, error: schErr } = await supabase.from("schools").select("id, name").in("id", schoolIds);
  if (schErr) throw schErr;
  const schoolNameById = new Map((schools as unknown as { id: string; name: string }[]).map((s) => [s.id, s.name]));

  const teacherIds = [
    ...new Set(
      Array.from(meetingById.values()).flatMap((m) => [m.assignedTeacherId, m.actualTeacherId].filter(Boolean) as string[]),
    ),
  ];
  const { data: teachers, error: teachErr } = await supabase
    .from("teachers")
    .select("id, users(fullName)")
    .in("id", teacherIds);
  if (teachErr) throw teachErr;
  const teacherNameById = new Map(
    (teachers as unknown as { id: string; users: { fullName: string } | { fullName: string }[] | null }[]).map((t) => {
      const u = Array.isArray(t.users) ? t.users[0] : t.users;
      return [t.id, u?.fullName ?? "-"];
    }),
  );

  const { data: attendances, error: attErr } = await supabase
    .from("attendances")
    .select("meetingId, status")
    .in("meetingId", meetingIds);
  if (attErr) throw attErr;
  const attendanceByMeeting = new Map<string, { present: number; total: number }>();
  (attendances as unknown as { meetingId: string; status: string }[]).forEach((a) => {
    const cur = attendanceByMeeting.get(a.meetingId) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (a.status === "PRESENT" || a.status === "LATE") cur.present += 1;
    attendanceByMeeting.set(a.meetingId, cur);
  });

  return { meetingById, lpById, clsById, schoolNameById, teacherNameById, attendanceByMeeting };
}

export async function fetchAdminReports(): Promise<AdminReportListItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("teaching_reports")
    .select(
      "id, meetingId, originalTeacherId, substituteTeacherId, actualTeachingDate, skills, objectivesAchieved, whatWentWell, whatNeedsImprovement, nextLessonNotes, homeworkAssigned, summary, photoDriveFileId",
    )
    .order("actualTeachingDate", { ascending: false });
  if (error) throw error;

  const reports = data as unknown as ReportRow[];
  if (reports.length === 0) return [];

  const ctx = await buildContext(reports);

  return reports.map((r) => {
    const meeting = ctx.meetingById.get(r.meetingId);
    const lp = meeting ? ctx.lpById.get(meeting.lessonPlanId) : undefined;
    const cls = lp ? ctx.clsById.get(lp.classId) : undefined;
    const attendance = ctx.attendanceByMeeting.get(r.meetingId) ?? { present: 0, total: 0 };
    const isSubstitute = Boolean(
      meeting && meeting.actualTeacherId && meeting.actualTeacherId !== meeting.assignedTeacherId,
    );

    return {
      id: r.id,
      meetingId: r.meetingId,
      actualTeachingDate: r.actualTeachingDate,
      classId: lp?.classId ?? "",
      className: cls?.name ?? "-",
      schoolName: cls ? (ctx.schoolNameById.get(cls.schoolId) ?? "-") : "-",
      teacherName: ctx.teacherNameById.get(r.originalTeacherId) ?? "-",
      isSubstitute,
      topic: lp?.topic ?? "-",
      meetingNumber: lp?.meetingNumber ?? 0,
      objectivesAchieved: r.objectivesAchieved,
      attendancePresent: attendance.present,
      attendanceTotal: attendance.total,
    };
  });
}

export async function fetchAdminReportDetail(id: string): Promise<AdminReportDetail | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("teaching_reports")
    .select(
      "id, meetingId, originalTeacherId, substituteTeacherId, actualTeachingDate, skills, objectivesAchieved, whatWentWell, whatNeedsImprovement, nextLessonNotes, homeworkAssigned, summary, photoDriveFileId",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const report = data as unknown as ReportRow;
  const ctx = await buildContext([report]);

  const meeting = ctx.meetingById.get(report.meetingId);
  const lp = meeting ? ctx.lpById.get(meeting.lessonPlanId) : undefined;
  const cls = lp ? ctx.clsById.get(lp.classId) : undefined;
  const attendance = ctx.attendanceByMeeting.get(report.meetingId) ?? { present: 0, total: 0 };
  const isSubstitute = Boolean(
    meeting && meeting.actualTeacherId && meeting.actualTeacherId !== meeting.assignedTeacherId,
  );

  const { data: followUps, error: fuErr } = await supabase
    .from("student_follow_ups")
    .select("id, note, students(fullName)")
    .eq("teachingReportId", id);
  if (fuErr) throw fuErr;

  return {
    id: report.id,
    meetingId: report.meetingId,
    actualTeachingDate: report.actualTeachingDate,
    className: cls?.name ?? "-",
    schoolName: cls ? (ctx.schoolNameById.get(cls.schoolId) ?? "-") : "-",
    teacherName: ctx.teacherNameById.get(report.originalTeacherId) ?? "-",
    isSubstitute,
    originalTeacherName: ctx.teacherNameById.get(report.originalTeacherId) ?? "-",
    topic: lp?.topic ?? "-",
    meetingNumber: lp?.meetingNumber ?? 0,
    scheduledDate: lp?.scheduledDate ?? report.actualTeachingDate,
    skills: report.skills,
    objectivesAchieved: report.objectivesAchieved,
    whatWentWell: report.whatWentWell,
    whatNeedsImprovement: report.whatNeedsImprovement,
    nextLessonNotes: report.nextLessonNotes,
    homeworkAssigned: report.homeworkAssigned,
    summary: report.summary,
    photoDriveFileId: report.photoDriveFileId,
    attendancePresent: attendance.present,
    attendanceTotal: attendance.total,
    followUps: (
      followUps as unknown as { id: string; note: string; students: { fullName: string } | { fullName: string }[] | null }[]
    ).map((f) => {
      const s = Array.isArray(f.students) ? f.students[0] : f.students;
      return { id: f.id, studentName: s?.fullName ?? "-", note: f.note };
    }),
  };
}
