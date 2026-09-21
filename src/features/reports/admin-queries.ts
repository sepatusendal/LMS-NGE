import { createClient } from "@/lib/supabase/client";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/paginate";
import { formatLocalDateStr, parseLocalDate } from "@/lib/date";
import type { ObjectivesAchieved } from "./schema";
import type { ClassType } from "@/features/classes/schema";

export interface AdminReportListItem {
  id: string;
  meetingId: string;
  actualTeachingDate: string;
  classId: string;
  className: string;
  classType: ClassType;
  schoolName: string;
  teacherName: string;
  isSubstitute: boolean;
  topic: string;
  meetingNumber: number;
  objectivesAchieved: ObjectivesAchieved | null;
  attendancePresent: number;
  attendanceTotal: number;
  skills: string[];
  whatWentWell: string | null;
  whatNeedsImprovement: string | null;
  actionPlan: string | null;
  nextLessonNotes: string | null;
  homeworkAssigned: string | null;
  summary: string | null;
  languageSkillsFocus: string | null;
  activitiesLog: string | null;
  resourcesUsed: string | null;
  objectivesTotal: number;
  objectivesAchievedCount: number;
  followUps: { studentName: string; note: string }[];
}

export interface AdminReportDetail {
  id: string;
  meetingId: string;
  actualTeachingDate: string;
  className: string;
  classType: ClassType;
  schoolName: string;
  teacherName: string;
  isSubstitute: boolean;
  originalTeacherName: string;
  topic: string;
  meetingNumber: number;
  scheduledDate: string;
  skills: string[];
  objectivesAchieved: ObjectivesAchieved | null;
  objectives: { objectiveText: string; achieved: boolean }[];
  whatWentWell: string | null;
  whatNeedsImprovement: string | null;
  actionPlan: string | null;
  nextLessonNotes: string | null;
  homeworkAssigned: string | null;
  summary: string | null;
  languageSkillsFocus: string | null;
  activitiesLog: string | null;
  resourcesUsed: string | null;
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
  actionPlan: string | null;
  nextLessonNotes: string | null;
  homeworkAssigned: string | null;
  summary: string | null;
  photoDriveFileId: string | null;
  languageSkillsFocus: string | null;
  activitiesLog: string | null;
  resourcesUsed: string | null;
}

async function buildFollowUpsAndObjectives(reportIds: string[]) {
  const supabase = createClient();

  const followUps = await fetchInChunks<{
    teachingReportId: string;
    note: string;
    students: { fullName: string } | { fullName: string }[] | null;
  }>(reportIds, (chunk, from, to) =>
    supabase
      .from("student_follow_ups")
      .select("teachingReportId, note, students(fullName)")
      .in("teachingReportId", chunk)
      .order("id")
      .range(from, to),
  );
  const followUpsByReport = new Map<string, { studentName: string; note: string }[]>();
  followUps.forEach((f) => {
    const s = Array.isArray(f.students) ? f.students[0] : f.students;
    const list = followUpsByReport.get(f.teachingReportId) ?? [];
    list.push({ studentName: s?.fullName ?? "-", note: f.note });
    followUpsByReport.set(f.teachingReportId, list);
  });

  const objectives = await fetchInChunks<{ teachingReportId: string; achieved: boolean }>(
    reportIds,
    (chunk, from, to) =>
      supabase
        .from("report_learning_objectives")
        .select("teachingReportId, achieved")
        .in("teachingReportId", chunk)
        .order("id")
        .range(from, to),
  );
  const objectivesByReport = new Map<string, { total: number; achieved: number }>();
  objectives.forEach((o) => {
    const cur = objectivesByReport.get(o.teachingReportId) ?? { total: 0, achieved: 0 };
    cur.total += 1;
    if (o.achieved) cur.achieved += 1;
    objectivesByReport.set(o.teachingReportId, cur);
  });

  return { followUpsByReport, objectivesByReport };
}

async function buildContext(reports: ReportRow[]) {
  const supabase = createClient();

  const meetingIds = [...new Set(reports.map((r) => r.meetingId))];
  const meetings = await fetchInChunks<{
    id: string;
    lessonPlanId: string;
    assignedTeacherId: string;
    actualTeacherId: string | null;
  }>(meetingIds, (chunk, from, to) =>
    supabase
      .from("meetings")
      .select("id, lessonPlanId, assignedTeacherId, actualTeacherId")
      .in("id", chunk)
      .order("id")
      .range(from, to),
  );
  const meetingById = new Map(meetings.map((m) => [m.id, m]));

  const lessonPlanIds = [...new Set(Array.from(meetingById.values()).map((m) => m.lessonPlanId))];
  const lessonPlans = await fetchInChunks<{
    id: string;
    classId: string;
    topic: string;
    meetingNumber: number;
    scheduledDate: string;
  }>(lessonPlanIds, (chunk, from, to) =>
    supabase
      .from("lesson_plans")
      .select("id, classId, topic, meetingNumber, scheduledDate")
      .in("id", chunk)
      .order("id")
      .range(from, to),
  );
  const lpById = new Map(lessonPlans.map((lp) => [lp.id, lp]));

  const classIds = [...new Set(Array.from(lpById.values()).map((lp) => lp.classId))];
  const classes = await fetchInChunks<{ id: string; name: string; schoolId: string; classType: ClassType }>(
    classIds,
    (chunk, from, to) =>
      supabase.from("classes").select("id, name, schoolId, classType").in("id", chunk).order("id").range(from, to),
  );
  const clsById = new Map(classes.map((c) => [c.id, c]));

  const schoolIds = [...new Set(Array.from(clsById.values()).map((c) => c.schoolId))];
  const schools = await fetchInChunks<{ id: string; name: string }>(schoolIds, (chunk, from, to) =>
    supabase.from("schools").select("id, name").in("id", chunk).order("id").range(from, to),
  );
  const schoolNameById = new Map(schools.map((s) => [s.id, s.name]));

  const teacherIds = [
    ...new Set(
      Array.from(meetingById.values()).flatMap((m) => [m.assignedTeacherId, m.actualTeacherId].filter(Boolean) as string[]),
    ),
  ];
  const teachers = await fetchInChunks<{
    id: string;
    users: { fullName: string } | { fullName: string }[] | null;
  }>(teacherIds, (chunk, from, to) =>
    supabase.from("teachers").select("id, users(fullName)").in("id", chunk).order("id").range(from, to),
  );
  const teacherNameById = new Map(
    teachers.map((t) => {
      const u = Array.isArray(t.users) ? t.users[0] : t.users;
      return [t.id, u?.fullName ?? "-"];
    }),
  );

  // attendances is the biggest table here (one row per student per meeting) —
  // a single unpaged query is silently cut off at 1000 rows, which made the
  // present/total counts wrong for most reports once the table outgrew that.
  const attendances = await fetchInChunks<{ meetingId: string; status: string }>(
    meetingIds,
    (chunk, from, to) =>
      supabase.from("attendances").select("meetingId, status").in("meetingId", chunk).order("id").range(from, to),
  );
  const attendanceByMeeting = new Map<string, { present: number; total: number }>();
  attendances.forEach((a) => {
    const cur = attendanceByMeeting.get(a.meetingId) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (a.status === "PRESENT" || a.status === "LATE") cur.present += 1;
    attendanceByMeeting.set(a.meetingId, cur);
  });

  return { meetingById, lpById, clsById, schoolNameById, teacherNameById, attendanceByMeeting };
}

function dayBefore(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() - 1);
  return formatLocalDateStr(d);
}

export async function fetchAdminReports(filters?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<AdminReportListItem[]> {
  const supabase = createClient();

  // teaching_reports.actualTeachingDate is the day the report was *filed*
  // (create_teaching_report stores CURRENT_DATE, and the 7-day edit window's
  // RLS keys off it too), not the day the class was taught — the two differ
  // for every late or admin-entered report. Reports are dated and filtered by
  // the class date (the lesson plan's scheduledDate) below; this DB-side bound
  // only narrows the fetch. A report is never filed before its class, so
  // "filed on/after dateFrom" can't drop one whose class is in range — the
  // extra day of slack covers the UTC-vs-WIB day boundary (CURRENT_DATE is
  // evaluated in UTC).
  const reports = await fetchAllPages<ReportRow>((from, to) => {
    let query = supabase
      .from("teaching_reports")
      .select(
        "id, meetingId, originalTeacherId, substituteTeacherId, actualTeachingDate, skills, objectivesAchieved, whatWentWell, whatNeedsImprovement, actionPlan, nextLessonNotes, homeworkAssigned, summary, photoDriveFileId, languageSkillsFocus, activitiesLog, resourcesUsed",
      )
      .order("actualTeachingDate", { ascending: false })
      .order("id");
    if (filters?.dateFrom) query = query.gte("actualTeachingDate", dayBefore(filters.dateFrom));
    return query.range(from, to);
  });
  if (reports.length === 0) return [];

  const ctx = await buildContext(reports);
  const { followUpsByReport, objectivesByReport } = await buildFollowUpsAndObjectives(reports.map((r) => r.id));

  const items = reports.map((r): AdminReportListItem => {
    const meeting = ctx.meetingById.get(r.meetingId);
    const lp = meeting ? ctx.lpById.get(meeting.lessonPlanId) : undefined;
    const cls = lp ? ctx.clsById.get(lp.classId) : undefined;
    const attendance = ctx.attendanceByMeeting.get(r.meetingId) ?? { present: 0, total: 0 };
    const isSubstitute = Boolean(
      meeting && meeting.actualTeacherId && meeting.actualTeacherId !== meeting.assignedTeacherId,
    );
    const objectives = objectivesByReport.get(r.id) ?? { total: 0, achieved: 0 };

    return {
      id: r.id,
      meetingId: r.meetingId,
      // Class date, not filing date — see the note above the query.
      actualTeachingDate: lp?.scheduledDate ?? r.actualTeachingDate,
      classId: lp?.classId ?? "",
      className: cls?.name ?? "-",
      classType: cls?.classType ?? "REGULAR",
      schoolName: cls ? (ctx.schoolNameById.get(cls.schoolId) ?? "-") : "-",
      // Who actually taught, per the meeting record — not who happened to
      // submit the report. teaching_reports.substituteTeacherId is only set
      // when the report-*submitter* differs from meetings.assignedTeacherId
      // (create_teaching_report), so it stays NULL whenever the absent
      // assigned teacher files the report themselves even though a
      // different teacher's actualTeacherId is on the meeting (e.g. by
      // phone/from home) — meeting.actualTeacherId is the one field that's
      // always kept in sync with who really checked in and taught.
      teacherName: ctx.teacherNameById.get(meeting?.actualTeacherId ?? r.originalTeacherId) ?? "-",
      isSubstitute,
      topic: lp?.topic ?? "-",
      meetingNumber: lp?.meetingNumber ?? 0,
      objectivesAchieved: r.objectivesAchieved,
      attendancePresent: attendance.present,
      attendanceTotal: attendance.total,
      skills: r.skills,
      whatWentWell: r.whatWentWell,
      whatNeedsImprovement: r.whatNeedsImprovement,
      actionPlan: r.actionPlan,
      nextLessonNotes: r.nextLessonNotes,
      homeworkAssigned: r.homeworkAssigned,
      summary: r.summary,
      languageSkillsFocus: r.languageSkillsFocus,
      activitiesLog: r.activitiesLog,
      resourcesUsed: r.resourcesUsed,
      objectivesTotal: objectives.total,
      objectivesAchievedCount: objectives.achieved,
      followUps: followUpsByReport.get(r.id) ?? [],
    };
  });

  return items
    .filter(
      (item) =>
        (!filters?.dateFrom || item.actualTeachingDate >= filters.dateFrom) &&
        (!filters?.dateTo || item.actualTeachingDate <= filters.dateTo),
    )
    .sort((a, b) => b.actualTeachingDate.localeCompare(a.actualTeachingDate) || a.id.localeCompare(b.id));
}

export async function fetchAdminReportDetail(id: string): Promise<AdminReportDetail | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("teaching_reports")
    .select(
      "id, meetingId, originalTeacherId, substituteTeacherId, actualTeachingDate, skills, objectivesAchieved, whatWentWell, whatNeedsImprovement, actionPlan, nextLessonNotes, homeworkAssigned, summary, photoDriveFileId, languageSkillsFocus, activitiesLog, resourcesUsed",
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

  const { data: objectives, error: objErr } = await supabase
    .from("report_learning_objectives")
    .select("objectiveText, achieved")
    .eq("teachingReportId", id);
  if (objErr) throw objErr;

  return {
    id: report.id,
    meetingId: report.meetingId,
    // Class date, not filing date — see fetchAdminReports().
    actualTeachingDate: lp?.scheduledDate ?? report.actualTeachingDate,
    className: cls?.name ?? "-",
    classType: cls?.classType ?? "REGULAR",
    schoolName: cls ? (ctx.schoolNameById.get(cls.schoolId) ?? "-") : "-",
    // See fetchAdminReports() above for why this reads meeting.actualTeacherId
    // rather than report.substituteTeacherId.
    teacherName: ctx.teacherNameById.get(meeting?.actualTeacherId ?? report.originalTeacherId) ?? "-",
    isSubstitute,
    originalTeacherName: ctx.teacherNameById.get(report.originalTeacherId) ?? "-",
    topic: lp?.topic ?? "-",
    meetingNumber: lp?.meetingNumber ?? 0,
    scheduledDate: lp?.scheduledDate ?? report.actualTeachingDate,
    skills: report.skills,
    objectivesAchieved: report.objectivesAchieved,
    objectives: (objectives as unknown as { objectiveText: string; achieved: boolean }[]) ?? [],
    whatWentWell: report.whatWentWell,
    whatNeedsImprovement: report.whatNeedsImprovement,
    actionPlan: report.actionPlan,
    nextLessonNotes: report.nextLessonNotes,
    homeworkAssigned: report.homeworkAssigned,
    summary: report.summary,
    languageSkillsFocus: report.languageSkillsFocus,
    activitiesLog: report.activitiesLog,
    resourcesUsed: report.resourcesUsed,
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
