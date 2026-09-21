import { createClient } from "@/lib/supabase/client";
import { fetchAllPages, fetchInChunks } from "@/lib/supabase/paginate";
import { parseLocalDate, formatLocalDateStr } from "@/lib/date";
import { getClassComplianceStatus } from "@/features/lesson-plans/compliance";
import type { LessonPlan } from "@/features/lesson-plans/schema";
import type { AnalyticsFilters } from "./schema";

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/** [fromISO, toISO) local-midnight bounds for filtering a timestamptz
 * column (e.g. checkInTime) from a "YYYY-MM-DD" date-only filter range —
 * see src/lib/date.ts's header comment on why this can't be done with
 * naive Date parsing or a "T00:00:00" string suffix. */
function localDateBoundsISO(dateFrom: string, dateTo: string): { fromISO: string; toISO: string } {
  const from = parseLocalDate(dateFrom);
  from.setHours(0, 0, 0, 0);
  const to = parseLocalDate(dateTo);
  to.setHours(0, 0, 0, 0);
  to.setDate(to.getDate() + 1);
  return { fromISO: from.toISOString(), toISO: to.toISOString() };
}

interface ClassContextRow {
  id: string;
  name: string;
  schoolId: string;
  teacherId: string;
  isActive: boolean;
  curriculums: { name: string } | { name: string }[] | null;
  class_schedule_slots: { dayOfWeek: number; startTime: string; endTime: string }[];
}

async function fetchClassContext(classIds: string[]) {
  const supabase = createClient();
  if (classIds.length === 0) {
    return { classById: new Map<string, ClassContextRow>(), schoolNameById: new Map<string, string>() };
  }
  const rows = await fetchInChunks<ClassContextRow>(classIds, (chunk, from, to) =>
    supabase
      .from("classes")
      .select("id, name, schoolId, teacherId, isActive, curriculums(name), class_schedule_slots(dayOfWeek, startTime, endTime)")
      .in("id", chunk)
      .order("id")
      .range(from, to),
  );
  const classById = new Map(rows.map((c) => [c.id, c]));

  const schoolIds = [...new Set(rows.map((c) => c.schoolId))];
  const schoolNameById = new Map<string, string>();
  if (schoolIds.length > 0) {
    const schools = await fetchInChunks<{ id: string; name: string }>(schoolIds, (chunk, from, to) =>
      supabase.from("schools").select("id, name").in("id", chunk).order("id").range(from, to),
    );
    schools.forEach((s) => schoolNameById.set(s.id, s.name));
  }

  return { classById, schoolNameById };
}

async function fetchTeacherNames(teacherIds: string[]): Promise<Map<string, string>> {
  const supabase = createClient();
  const nameById = new Map<string, string>();
  if (teacherIds.length === 0) return nameById;
  const data = await fetchInChunks<{ id: string; users: { fullName: string } | { fullName: string }[] | null }>(
    teacherIds,
    (chunk, from, to) =>
      supabase.from("teachers").select("id, users(fullName)").in("id", chunk).order("id").range(from, to),
  );
  data.forEach((t) => {
    nameById.set(t.id, toOne(t.users)?.fullName ?? "-");
  });
  return nameById;
}

function scheduledTimeFor(cls: ClassContextRow | undefined, dateStr: string): string {
  if (!cls) return "-";
  const dayOfWeek = parseLocalDate(dateStr).getDay();
  const slot = cls.class_schedule_slots.find((s) => s.dayOfWeek === dayOfWeek);
  return slot ? `${slot.startTime}-${slot.endTime}` : "-";
}

/** getClassComplianceStatus() rescans the full lessonPlans array per call —
 * compute it once per distinct classId instead of once per output row (many
 * rows/classes share the same classId). */
function complianceByClass(
  classIds: string[],
  lessonPlans: LessonPlan[],
): Map<string, ReturnType<typeof getClassComplianceStatus>> {
  const now = Date.now();
  return new Map(classIds.map((id) => [id, getClassComplianceStatus(id, lessonPlans, now)]));
}

// ---------------------------------------------------------------------------
// 1. Tutor Attendance Report
// ---------------------------------------------------------------------------

export interface TutorAttendanceReportRow {
  meetingId: string;
  date: string;
  teacherId: string;
  teacherName: string;
  schoolName: string;
  className: string;
  classId: string;
  schoolId: string;
  meetingNumber: number;
  scheduledTime: string;
  checkInTime: string | null;
  isLate: boolean;
  hasPhoto: boolean;
  checkOutTime: string | null;
  durationMinutes: number | null;
  isSubstitute: boolean;
  assignedTeacherName: string | null;
  notes: string | null;
}

interface CheckInReportRow {
  meetingId: string;
  teacherId: string;
  checkInTime: string;
  isLate: boolean;
  photoDriveFileId: string | null;
  notes: string | null;
  teachers: { users: { fullName: string } | { fullName: string }[] | null } | { users: { fullName: string } | { fullName: string }[] | null }[] | null;
  meetings:
    | { id: string; lessonPlanId: string; assignedTeacherId: string; actualTeacherId: string | null }
    | { id: string; lessonPlanId: string; assignedTeacherId: string; actualTeacherId: string | null }[]
    | null;
}

export async function fetchTutorAttendanceReport(filters: AnalyticsFilters): Promise<TutorAttendanceReportRow[]> {
  const supabase = createClient();
  const { fromISO, toISO } = localDateBoundsISO(filters.dateFrom, filters.dateTo);

  const rows = await fetchAllPages<CheckInReportRow>((from, to) =>
    supabase
      .from("check_ins")
      .select(
        "meetingId, teacherId, checkInTime, isLate, photoDriveFileId, notes, teachers(users(fullName)), meetings(id, lessonPlanId, assignedTeacherId, actualTeacherId)",
      )
      .gte("checkInTime", fromISO)
      .lt("checkInTime", toISO)
      .order("checkInTime", { ascending: false })
      .order("id")
      .range(from, to),
  );
  if (rows.length === 0) return [];

  const meetingIds = [...new Set(rows.map((r) => toOne(r.meetings)?.id).filter((id): id is string => Boolean(id)))];
  const lessonPlans = await fetchInChunks<{ id: string; classId: string; meetingNumber: number; scheduledDate: string }>(
    rows.map((r) => toOne(r.meetings)?.lessonPlanId).filter((id): id is string => Boolean(id)),
    (chunk, from, to) =>
      supabase
        .from("lesson_plans")
        .select("id, classId, meetingNumber, scheduledDate")
        .in("id", chunk)
        .order("id")
        .range(from, to),
  );
  const lpByMeeting = new Map<string, { classId: string; meetingNumber: number; scheduledDate: string }>();
  const lpById = new Map(lessonPlans.map((lp) => [lp.id, lp]));
  rows.forEach((r) => {
    const meeting = toOne(r.meetings);
    if (!meeting) return;
    const lp = lpById.get(meeting.lessonPlanId);
    if (lp) lpByMeeting.set(meeting.id, lp);
  });

  const classIds = [...new Set(Array.from(lpByMeeting.values()).map((lp) => lp.classId))];
  const assignedTeacherIds = rows
    .map((r) => toOne(r.meetings)?.assignedTeacherId)
    .filter((id): id is string => Boolean(id));

  const [{ classById, schoolNameById }, checkOuts, assignedNameById] = await Promise.all([
    fetchClassContext(classIds),
    fetchInChunks<{ meetingId: string; checkOutTime: string; durationMinutes: number }>(
      meetingIds,
      (chunk, from, to) =>
        supabase
          .from("check_outs")
          .select("meetingId, checkOutTime, durationMinutes")
          .in("meetingId", chunk)
          .order("id")
          .range(from, to),
    ),
    fetchTeacherNames([...new Set(assignedTeacherIds)]),
  ]);
  const checkOutByMeeting = new Map(checkOuts.map((c) => [c.meetingId, c]));
  const meetingByMeetingId = new Map(rows.map((r) => [r.meetingId, toOne(r.meetings)]));

  const result = rows.map((r) => {
    const meeting = toOne(r.meetings);
    const lp = meeting ? lpByMeeting.get(meeting.id) : undefined;
    const cls = lp ? classById.get(lp.classId) : undefined;
    const isSubstitute = Boolean(meeting && meeting.actualTeacherId && meeting.actualTeacherId !== meeting.assignedTeacherId);
    const checkOut = checkOutByMeeting.get(r.meetingId);
    // check_ins.teacherId is who actually attended — the substitute, when
    // isSubstitute is true. This is the row's primary teacher identity (it's
    // an attendance report), matching the convention already used by
    // fetchAdminReports() and fetchTeacherAttendanceDetail(): the originally
    // assigned (and absent) teacher is kept only as separate context.
    const attendingTeacherName = toOne(toOne(r.teachers)?.users ?? null)?.fullName ?? "-";

    const row: TutorAttendanceReportRow = {
      meetingId: r.meetingId,
      date: lp?.scheduledDate ?? formatLocalDateStr(new Date(r.checkInTime)),
      teacherId: r.teacherId,
      teacherName: attendingTeacherName,
      schoolName: cls ? (schoolNameById.get(cls.schoolId) ?? "-") : "-",
      className: cls?.name ?? "-",
      classId: cls?.id ?? "",
      schoolId: cls?.schoolId ?? "",
      meetingNumber: lp?.meetingNumber ?? 0,
      scheduledTime: lp && cls ? scheduledTimeFor(cls, lp.scheduledDate) : "-",
      checkInTime: r.checkInTime,
      isLate: r.isLate,
      hasPhoto: r.photoDriveFileId != null,
      checkOutTime: checkOut?.checkOutTime ?? null,
      durationMinutes: checkOut?.durationMinutes ?? null,
      isSubstitute,
      assignedTeacherName: isSubstitute && meeting ? (assignedNameById.get(meeting.assignedTeacherId) ?? "-") : null,
      notes: r.notes,
    };
    return row;
  });

  return result.filter((r) => {
    if (filters.schoolId && r.schoolId !== filters.schoolId) return false;
    if (filters.classId && r.classId !== filters.classId) return false;
    if (filters.teacherId) {
      const m = meetingByMeetingId.get(r.meetingId) ?? null;
      const matches = m && (m.assignedTeacherId === filters.teacherId || m.actualTeacherId === filters.teacherId);
      if (!matches) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// 2. Student Attendance Report
// ---------------------------------------------------------------------------

export interface StudentAttendanceReportRow {
  meetingId: string;
  date: string;
  schoolName: string;
  className: string;
  classId: string;
  schoolId: string;
  meetingNumber: number;
  studentId: string;
  studentName: string;
  nis: string | null;
  status: string;
  notes: string | null;
}

export interface StudentAttendanceSummaryRow {
  studentId: string;
  studentName: string;
  nis: string | null;
  present: number;
  late: number;
  excused: number;
  absent: number;
  totalMeetings: number;
  attendanceRate: number;
}

interface AttendanceReportRow {
  meetingId: string;
  studentId: string;
  status: string;
  notes: string | null;
  students: { fullName: string; nis: string | null } | { fullName: string; nis: string | null }[] | null;
}

export async function fetchStudentAttendanceReport(
  filters: AnalyticsFilters,
): Promise<{ rows: StudentAttendanceReportRow[]; summary: StudentAttendanceSummaryRow[] }> {
  const supabase = createClient();

  const lpRows = await fetchAllPages<{ id: string; classId: string; meetingNumber: number; scheduledDate: string }>(
    (from, to) => {
      let lpQuery = supabase
        .from("lesson_plans")
        .select("id, classId, meetingNumber, scheduledDate")
        .is("deletedAt", null)
        .gte("scheduledDate", filters.dateFrom)
        .lte("scheduledDate", filters.dateTo)
        .order("id");
      if (filters.classId) lpQuery = lpQuery.eq("classId", filters.classId);
      return lpQuery.range(from, to);
    },
  );
  if (lpRows.length === 0) return { rows: [], summary: [] };
  const lpById = new Map(lpRows.map((lp) => [lp.id, lp]));

  const meetings = await fetchInChunks<{ id: string; lessonPlanId: string }>(
    [...lpById.keys()],
    (chunk, from, to) =>
      supabase.from("meetings").select("id, lessonPlanId").in("lessonPlanId", chunk).order("id").range(from, to),
  );
  const lpByMeeting = new Map(meetings.map((m) => [m.id, lpById.get(m.lessonPlanId)!]));
  const meetingIds = [...lpByMeeting.keys()];
  if (meetingIds.length === 0) return { rows: [], summary: [] };

  const classIds = [...new Set(Array.from(lpByMeeting.values()).map((lp) => lp.classId))];
  const [{ classById, schoolNameById }, attendances] = await Promise.all([
    fetchClassContext(classIds),
    fetchInChunks<AttendanceReportRow>(meetingIds, (chunk, from, to) =>
      supabase
        .from("attendances")
        .select("meetingId, studentId, status, notes, students(fullName, nis)")
        .in("meetingId", chunk)
        .order("id")
        .range(from, to),
    ),
  ]);

  const filteredClassIds = filters.schoolId
    ? classIds.filter((id) => classById.get(id)?.schoolId === filters.schoolId)
    : classIds;

  const rows: StudentAttendanceReportRow[] = attendances
    .map((a) => {
      const lp = lpByMeeting.get(a.meetingId);
      const cls = lp ? classById.get(lp.classId) : undefined;
      const student = toOne(a.students);
      return {
        meetingId: a.meetingId,
        date: lp?.scheduledDate ?? "",
        schoolName: cls ? (schoolNameById.get(cls.schoolId) ?? "-") : "-",
        className: cls?.name ?? "-",
        classId: cls?.id ?? "",
        schoolId: cls?.schoolId ?? "",
        meetingNumber: lp?.meetingNumber ?? 0,
        studentId: a.studentId,
        studentName: student?.fullName ?? "-",
        nis: student?.nis ?? null,
        status: a.status,
        notes: a.notes,
      };
    })
    .filter((r) => filteredClassIds.includes(r.classId))
    .filter((r) => !filters.studentId || r.studentId === filters.studentId);

  const summaryByStudent = new Map<string, StudentAttendanceSummaryRow>();
  rows.forEach((r) => {
    let entry = summaryByStudent.get(r.studentId);
    if (!entry) {
      entry = {
        studentId: r.studentId,
        studentName: r.studentName,
        nis: r.nis,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        totalMeetings: 0,
        attendanceRate: 0,
      };
      summaryByStudent.set(r.studentId, entry);
    }
    entry.totalMeetings += 1;
    if (r.status === "PRESENT") entry.present += 1;
    else if (r.status === "LATE") entry.late += 1;
    else if (r.status === "EXCUSED") entry.excused += 1;
    else if (r.status === "ABSENT") entry.absent += 1;
  });

  const summary = Array.from(summaryByStudent.values())
    .map((s) => ({ ...s, attendanceRate: s.totalMeetings > 0 ? Math.round(((s.present + s.late) / s.totalMeetings) * 100) : 0 }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  return { rows: rows.sort((a, b) => b.date.localeCompare(a.date)), summary };
}

// ---------------------------------------------------------------------------
// 3. Daily Teaching Report (filtered wrapper over the existing admin report)
// ---------------------------------------------------------------------------

export type { AdminReportListItem } from "@/features/reports/admin-queries";

export async function fetchDailyTeachingReportDetail(filters: AnalyticsFilters) {
  const { fetchAdminReports } = await import("@/features/reports/admin-queries");
  const all = await fetchAdminReports({ dateFrom: filters.dateFrom, dateTo: filters.dateTo });

  return all.filter((r) => {
    if (filters.classId && r.classId !== filters.classId) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// 4. Lesson Plan Report
// ---------------------------------------------------------------------------

export interface LessonPlanReportRow {
  id: string;
  classId: string;
  schoolId: string;
  className: string;
  schoolName: string;
  teacherName: string;
  scheduledDate: string;
  meetingNumber: number;
  topic: string;
  materialsRequired: string[];
  vocabularyFocus: string | null;
  differentiationSupport: string | null;
  differentiationExtension: string | null;
  differentiationHomework: string | null;
  hasModule: boolean;
  isDraft: boolean;
  isAdminEntered: boolean;
  isCompliant: boolean;
}

interface LessonPlanReportRawRow {
  id: string;
  classId: string;
  meetingNumber: number;
  scheduledDate: string;
  topic: string;
  materialsRequired: string[] | null;
  vocabularyFocus: string | null;
  differentiationSupport: string | null;
  differentiationExtension: string | null;
  differentiationHomework: string | null;
  moduleDriveFileId: string | null;
  isDraft: boolean;
  isAdminEntered: boolean;
}

export async function fetchLessonPlanReport(filters: AnalyticsFilters): Promise<LessonPlanReportRow[]> {
  const supabase = createClient();

  const rows = await fetchAllPages<LessonPlanReportRawRow>((from, to) => {
    let query = supabase
      .from("lesson_plans")
      .select(
        "id, classId, meetingNumber, scheduledDate, topic, materialsRequired, vocabularyFocus, differentiationSupport, differentiationExtension, differentiationHomework, moduleDriveFileId, isDraft, isAdminEntered",
      )
      .is("deletedAt", null)
      .gte("scheduledDate", filters.dateFrom)
      .lte("scheduledDate", filters.dateTo)
      .order("scheduledDate", { ascending: false })
      .order("id");
    if (filters.classId) query = query.eq("classId", filters.classId);
    return query.range(from, to);
  });
  if (rows.length === 0) return [];

  const classIds = [...new Set(rows.map((r) => r.classId))];

  // For compliance, we need every (non-deleted) lesson plan of the involved
  // classes — getClassComplianceStatus looks at the class's furthest-out
  // plan, not just the ones inside this filtered date range. This only
  // depends on classIds, so it can run alongside fetchClassContext.
  const [{ classById, schoolNameById }, allPlans] = await Promise.all([
    fetchClassContext(classIds),
    fetchInChunks<{ id: string; classId: string; scheduledDate: string }>(classIds, (chunk, from, to) =>
      supabase
        .from("lesson_plans")
        .select("id, classId, scheduledDate")
        .in("classId", chunk)
        .is("deletedAt", null)
        .order("id")
        .range(from, to),
    ),
  ]);
  const allPlansMapped = allPlans.map(
    (p) => ({ id: p.id, classId: p.classId, scheduledDate: p.scheduledDate }) as unknown as LessonPlan,
  );
  const complianceById = complianceByClass(classIds, allPlansMapped);

  const teacherIds = [...new Set(Array.from(classById.values()).map((c) => c.teacherId))];
  const teacherNameById = await fetchTeacherNames(teacherIds);

  return rows
    .filter((r) => !filters.schoolId || classById.get(r.classId)?.schoolId === filters.schoolId)
    .map((r) => {
      const cls = classById.get(r.classId);
      const compliance = complianceById.get(r.classId) ?? getClassComplianceStatus(r.classId, allPlansMapped);
      return {
        id: r.id,
        classId: r.classId,
        schoolId: cls?.schoolId ?? "",
        className: cls?.name ?? "-",
        schoolName: cls ? (schoolNameById.get(cls.schoolId) ?? "-") : "-",
        teacherName: cls ? (teacherNameById.get(cls.teacherId) ?? "-") : "-",
        scheduledDate: r.scheduledDate,
        meetingNumber: r.meetingNumber,
        topic: r.topic,
        materialsRequired: r.materialsRequired ?? [],
        vocabularyFocus: r.vocabularyFocus,
        differentiationSupport: r.differentiationSupport,
        differentiationExtension: r.differentiationExtension,
        differentiationHomework: r.differentiationHomework,
        hasModule: r.moduleDriveFileId != null,
        isDraft: r.isDraft,
        isAdminEntered: r.isAdminEntered,
        isCompliant: compliance.isCompliant,
      };
    });
}

// ---------------------------------------------------------------------------
// 5. Classes Report
// ---------------------------------------------------------------------------

export interface ClassesReportRow {
  classId: string;
  className: string;
  schoolId: string;
  schoolName: string;
  teacherName: string;
  curriculumName: string | null;
  schedule: string;
  enrollmentCount: number;
  attendanceRate: number | null;
  complianceRate: number | null;
  reportsFiledCount: number;
  isActive: boolean;
}

export async function fetchClassesReport(filters: AnalyticsFilters): Promise<ClassesReportRow[]> {
  const supabase = createClient();

  const classRows = await fetchAllPages<ClassContextRow>((from, to) => {
    let classQuery = supabase
      .from("classes")
      .select(
        "id, name, schoolId, teacherId, isActive, curriculums(name), class_schedule_slots(dayOfWeek, startTime, endTime)",
      )
      .is("deletedAt", null)
      .order("name")
      .order("id");
    if (filters.schoolId) classQuery = classQuery.eq("schoolId", filters.schoolId);
    if (filters.classId) classQuery = classQuery.eq("id", filters.classId);
    return classQuery.range(from, to);
  });
  if (classRows.length === 0) return [];
  const classIds = classRows.map((c) => c.id);

  const [schools, teacherNameById, enrollments, lpAllRows] = await Promise.all([
    fetchInChunks<{ id: string; name: string }>(
      classRows.map((c) => c.schoolId),
      (chunk, from, to) => supabase.from("schools").select("id, name").in("id", chunk).order("id").range(from, to),
    ),
    fetchTeacherNames([...new Set(classRows.map((c) => c.teacherId))]),
    fetchInChunks<{ id: string; classId: string }>(classIds, (chunk, from, to) =>
      supabase
        .from("class_enrollments")
        .select("id, classId")
        .in("classId", chunk)
        .is("unenrolledAt", null)
        .order("id")
        .range(from, to),
    ),
    fetchInChunks<{ id: string; classId: string; scheduledDate: string }>(classIds, (chunk, from, to) =>
      supabase
        .from("lesson_plans")
        .select("id, classId, scheduledDate")
        .in("classId", chunk)
        .is("deletedAt", null)
        .order("id")
        .range(from, to),
    ),
  ]);

  const schoolNameById = new Map(schools.map((s) => [s.id, s.name]));

  const enrollmentCountByClass = new Map<string, number>();
  enrollments.forEach((e) => {
    enrollmentCountByClass.set(e.classId, (enrollmentCountByClass.get(e.classId) ?? 0) + 1);
  });

  const lpAllMapped = lpAllRows.map((p) => p as unknown as LessonPlan);
  const complianceById = complianceByClass(classIds, lpAllMapped);
  const planCountByClass = new Map<string, number>();
  lpAllRows.forEach((p) => planCountByClass.set(p.classId, (planCountByClass.get(p.classId) ?? 0) + 1));

  const lpInRange = lpAllRows.filter((p) => p.scheduledDate >= filters.dateFrom && p.scheduledDate <= filters.dateTo);
  const lpInRangeIds = lpInRange.map((p) => p.id);

  const meetingRows = await fetchInChunks<{ id: string; lessonPlanId: string }>(
    lpInRangeIds,
    (chunk, from, to) =>
      supabase.from("meetings").select("id, lessonPlanId").in("lessonPlanId", chunk).order("id").range(from, to),
  );
  const classByLessonPlan = new Map(lpInRange.map((p) => [p.id, p.classId]));
  const classByMeeting = new Map(meetingRows.map((m) => [m.id, classByLessonPlan.get(m.lessonPlanId) ?? ""]));
  const meetingIds = meetingRows.map((m) => m.id);

  const [attendanceRows, reportRows] = await Promise.all([
    fetchInChunks<{ meetingId: string; status: string }>(meetingIds, (chunk, from, to) =>
      supabase.from("attendances").select("meetingId, status").in("meetingId", chunk).order("id").range(from, to),
    ),
    fetchInChunks<{ meetingId: string }>(meetingIds, (chunk, from, to) =>
      supabase.from("teaching_reports").select("meetingId").in("meetingId", chunk).order("id").range(from, to),
    ),
  ]);

  const attendanceByClass = new Map<string, { present: number; total: number }>();
  attendanceRows.forEach((a) => {
    const classId = classByMeeting.get(a.meetingId);
    if (!classId) return;
    const cur = attendanceByClass.get(classId) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (a.status === "PRESENT" || a.status === "LATE") cur.present += 1;
    attendanceByClass.set(classId, cur);
  });

  const reportsFiledByClass = new Map<string, number>();
  reportRows.forEach((r) => {
    const classId = classByMeeting.get(r.meetingId);
    if (!classId) return;
    reportsFiledByClass.set(classId, (reportsFiledByClass.get(classId) ?? 0) + 1);
  });

  return classRows.map((c) => {
    const attendance = attendanceByClass.get(c.id);
    const compliance = complianceById.get(c.id) ?? getClassComplianceStatus(c.id, lpAllMapped);
    const classPlanCount = planCountByClass.get(c.id) ?? 0;
    return {
      classId: c.id,
      className: c.name,
      schoolId: c.schoolId,
      schoolName: schoolNameById.get(c.schoolId) ?? "-",
      teacherName: teacherNameById.get(c.teacherId) ?? "-",
      curriculumName: toOne(c.curriculums)?.name ?? null,
      schedule: c.class_schedule_slots.length > 0
        ? [...c.class_schedule_slots]
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
            .map((s) => `${s.dayOfWeek}:${s.startTime}-${s.endTime}`)
            .join(", ")
        : "-",
      enrollmentCount: enrollmentCountByClass.get(c.id) ?? 0,
      attendanceRate: attendance && attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : null,
      complianceRate: classPlanCount > 0 ? (compliance.isCompliant ? 100 : 0) : null,
      reportsFiledCount: reportsFiledByClass.get(c.id) ?? 0,
      isActive: c.isActive,
    };
  });
}
