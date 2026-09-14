import { createClient } from "@/lib/supabase/client";
import { fetchHolidaySchoolsForDate } from "@/features/holidays/queries";
import { fetchTemporaryScheduleTimesForDate } from "@/features/temporary-schedules/queries";
import { formatLocalDateStr } from "@/lib/date";
import type { AnalyticsPoint, ClassStatusRow, DormantTutorRow } from "./schema";

const LATE_GRACE_MINUTES = 10;

// A tutor with this many or more no-lesson-plan-at-all sessions in the
// lookback window shows up on the "never used LMS" widget — tunable without
// touching the query shape. 3 in ~14 days is "this isn't a one-off," not
// "missed one class."
const DORMANT_THRESHOLD = 3;

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function dayOfWeek(dateStr: string): number {
  // Parse as a local calendar date (no time component) rather than UTC
  // midnight, which can roll to the wrong weekday depending on timezone.
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

interface LessonPlanRow {
  id: string;
  classId: string;
  meetingNumber: number;
  scheduledDate: string;
  topic: string;
}

interface ClassRow {
  id: string;
  name: string;
  classType: "REGULAR" | "TEACHER_TRAINING";
  room: string | null;
  scheduleDaysOfWeek: number[];
  class_schedule_slots: { dayOfWeek: number; startTime: string; endTime: string }[];
  teacherId: string;
  schoolId: string;
  schools: { id: string; name: string } | null;
  teachers: { users: { fullName: string } | null } | null;
}

interface OverrideRow {
  classId: string;
  startTime: string;
  endTime: string;
  teacherId: string;
  teachers:
    | { id: string; users: { fullName: string } | null }
    | { id: string; users: { fullName: string } | null }[]
    | null;
}

interface MeetingRow {
  id: string;
  lessonPlanId: string;
  status: string;
  assignedTeacherId: string;
  actualTeacherId: string | null;
  substituteReason: string | null;
  isAdminEntered: boolean;
  actualTeacher: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null;
  assignedTeacher: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null;
  checkIn: { checkInTime: string; isLate: boolean } | { checkInTime: string; isLate: boolean }[] | null;
  checkOut: { checkOutTime: string } | { checkOutTime: string }[] | null;
  attendances: { status: string }[] | null;
  teachingReport: { id: string } | { id: string }[] | null;
}

export async function fetchStatusBoard(date: string): Promise<ClassStatusRow[]> {
  const supabase = createClient();
  const today = dayOfWeek(date);

  // Determine which classes actually meet on `date`: the weekly pattern
  // (scheduleDaysOfWeek) unioned with any day-specific override (overrides
  // can add a meeting day outside the normal weekly pattern — see the
  // equivalent teacher-facing resolution in meetings/queries.ts
  // fetchTodayClasses). This mirrors that logic instead of relying on
  // "does a lesson plan exist for this exact date", so a class with no LP
  // yet still shows up as a visible gap rather than disappearing.
  const { data: allClasses, error: clsErr } = await supabase
    .from("classes")
    .select(
      "id, name, classType, room, scheduleDaysOfWeek, class_schedule_slots(dayOfWeek, startTime, endTime), teacherId, schoolId, schools(id, name), teachers(users(fullName))",
    )
    .eq("isActive", true)
    .is("deletedAt", null);
  if (clsErr) throw clsErr;

  const { data: overrides, error: ovErr } = await supabase
    .from("class_schedule_overrides")
    .select("classId, startTime, endTime, teacherId, teachers(id, users(fullName))")
    .eq("dayOfWeek", today);
  if (ovErr) throw ovErr;

  const overrideByClass = new Map<string, OverrideRow>();
  (overrides as unknown as OverrideRow[]).forEach((o) => overrideByClass.set(o.classId, o));

  // A temporary schedule (Jadwal Sementara, e.g. exam-week coverage) for
  // `date` can add a meeting on a day the class doesn't normally meet and
  // doesn't have a recurring override either — fetched up front (across
  // every active class, not just the weekly-pattern/override subset below)
  // so those classes aren't silently dropped from the board entirely. Same
  // union the teacher-facing fetchTodayClasses already does in
  // meetings/queries.ts (myTempScheduleClassIds).
  const temporaryTimes = await fetchTemporaryScheduleTimesForDate(
    (allClasses as unknown as ClassRow[]).map((c) => c.id),
    date,
  );

  const classesToday = (allClasses as unknown as ClassRow[]).filter(
    (c) => c.scheduleDaysOfWeek.includes(today) || overrideByClass.has(c.id) || temporaryTimes.has(c.id),
  );
  if (classesToday.length === 0) return [];

  const holidaySchoolIds = await fetchHolidaySchoolsForDate(
    date,
    classesToday.map((c) => c.schoolId),
  );

  const classIds = classesToday.map((c) => c.id);

  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, classId, meetingNumber, scheduledDate, topic")
    .in("classId", classIds)
    .eq("scheduledDate", date)
    .is("deletedAt", null);
  if (lpErr) throw lpErr;

  const lps = lessonPlans as unknown as LessonPlanRow[];
  const lpByClass = new Map<string, LessonPlanRow>();
  lps.forEach((lp) => lpByClass.set(lp.classId, lp));

  const lpIds = lps.map((lp) => lp.id);
  const { data: meetings, error: meetErr } =
    lpIds.length > 0
      ? await supabase
          .from("meetings")
          .select(
            "id, lessonPlanId, status, assignedTeacherId, actualTeacherId, substituteReason, \"isAdminEntered\", actualTeacher:teachers!meetings_actualTeacherId_fkey(users(fullName)), assignedTeacher:teachers!meetings_assignedTeacherId_fkey(users(fullName)), checkIn:check_ins(checkInTime, isLate), checkOut:check_outs(checkOutTime), attendances(status), teachingReport:teaching_reports(id)",
          )
          .in("lessonPlanId", lpIds)
      : { data: [], error: null };
  if (meetErr) throw meetErr;

  const meetingByLp = new Map<string, MeetingRow>();
  (meetings as unknown as MeetingRow[]).forEach((m) => meetingByLp.set(m.lessonPlanId, m));

  const now = Date.now();

  // A temporary schedule's own teacherId (e.g. exam-week substitute) wins
  // over both the per-day override and the class's normal teacher — same
  // temp > override > default precedence already used above for time.
  // Needs its own name lookup since fetchTemporaryScheduleTimesForDate only
  // returns the id.
  const tempTeacherIds = [
    ...new Set([...temporaryTimes.values()].map((t) => t.teacherId).filter((id): id is string => Boolean(id))),
  ];
  const tempTeacherNameById = new Map<string, string>();
  if (tempTeacherIds.length > 0) {
    const { data: tempTeachers, error: ttErr } = await supabase
      .from("teachers")
      .select("id, users(fullName)")
      .in("id", tempTeacherIds);
    if (ttErr) throw ttErr;
    (tempTeachers as unknown as { id: string; users: { fullName: string } | { fullName: string }[] | null }[]).forEach(
      (t) => tempTeacherNameById.set(t.id, toOne(t.users)?.fullName ?? "-"),
    );
  }

  return classesToday
    .map((cls): ClassStatusRow => {
      const override = overrideByClass.get(cls.id);
      const overrideTeacher = toOne(override?.teachers ?? null);
      const todaySlot = cls.class_schedule_slots.find((s) => s.dayOfWeek === today);
      const temp = temporaryTimes.get(cls.id);
      const scheduleStartTime = temp?.startTime ?? override?.startTime ?? todaySlot?.startTime ?? "00:00";
      const scheduleEndTime = temp?.endTime ?? override?.endTime ?? todaySlot?.endTime ?? "00:00";
      const teacherId = temp?.teacherId ?? overrideTeacher?.id ?? cls.teacherId;
      // The teacher who'd otherwise have this slot — the default to compare
      // a temp-schedule swap against (override wins over the class's own
      // teacherId, same precedence as everywhere else in this function).
      const defaultTeacherId = overrideTeacher?.id ?? cls.teacherId;
      const defaultTeacherName = overrideTeacher?.users?.fullName ?? cls.teachers?.users?.fullName ?? "-";
      const teacherName = temp?.teacherId
        ? tempTeacherNameById.get(temp.teacherId) ?? "-"
        : defaultTeacherName;

      const lp = lpByClass.get(cls.id) ?? null;
      const meeting = lp ? meetingByLp.get(lp.id) : undefined;
      const checkIn = toOne(meeting?.checkIn ?? null);
      const checkOut = toOne(meeting?.checkOut ?? null);
      const teachingReport = toOne(meeting?.teachingReport ?? null);
      const attendances = meeting?.attendances ?? [];

      const hasCheckIn = Boolean(checkIn);
      const hasCheckOut = Boolean(checkOut);
      const hasAttendance = attendances.length > 0;
      const hasReport = Boolean(teachingReport);

      let meetingStatus: ClassStatusRow["meetingStatus"] = "not_started";
      if (hasReport) meetingStatus = "report_submitted";
      else if (hasCheckOut) meetingStatus = "checked_out";
      else if (hasAttendance) meetingStatus = "attendance_done";
      else if (hasCheckIn) meetingStatus = "checked_in";

      const [hour, minute] = scheduleStartTime.split(":").map(Number);
      const [y, m, d] = date.split("-").map(Number);
      const scheduledStart = new Date(y, m - 1, d, hour, minute).getTime();
      const isHoliday = holidaySchoolIds.has(cls.schoolId);
      const isOverdueCheckIn =
        !isHoliday &&
        meetingStatus === "not_started" &&
        now > scheduledStart + LATE_GRACE_MINUTES * 60_000;
      const isReportMissing = !isHoliday && meetingStatus === "checked_out";

      const isMeetingSubstitute = Boolean(
        meeting?.actualTeacherId && meeting.actualTeacherId !== meeting.assignedTeacherId,
      );
      const isTempSubstitute = Boolean(temp?.teacherId && temp.teacherId !== defaultTeacherId);

      return {
        classId: cls.id,
        className: cls.name,
        classType: cls.classType,
        schoolId: cls.schoolId,
        schoolName: cls.schools?.name ?? "-",
        teacherId,
        teacherName,
        room: cls.room,
        scheduleStartTime,
        scheduleEndTime,
        lessonPlanId: lp?.id ?? null,
        meetingNumber: lp?.meetingNumber ?? 0,
        topic: lp?.topic ?? "",
        hasLessonPlan: isHoliday ? true : Boolean(lp),
        meetingId: meeting?.id ?? null,
        meetingStatus,
        checkInTime: checkIn?.checkInTime ?? null,
        checkOutTime: checkOut?.checkOutTime ?? null,
        isLate: checkIn?.isLate ?? null,
        // Two independent mechanisms can put a substitute in this slot: a
        // one-off Meeting-level assignment (meeting.actualTeacherId, from
        // "Atur Guru Pengganti" — this is what `isSubstitute` has always
        // meant, and other consumers of this row (the /substitutes page's
        // per-teacher grouping + absence dialog, ReassignTutorDialog) rely
        // on that exact meaning: their `teacherId`/`teacherName` is this
        // row's nominal owner, and `isSubstitute` says "someone else is
        // covering *their* class". Do NOT fold the temp-schedule case into
        // it — for a temp-schedule swap, `teacherId`/`teacherName` above are
        // already the substitute's own identity (temp wins precedence), so
        // setting `isSubstitute` there would self-referentially claim the
        // substitute is substituting for themselves in those consumers.
        isSubstitute: isMeetingSubstitute,
        // Unified flag for the Status Board's own display only (Teacher
        // column name-swap + "Sub" badge) — true for either mechanism.
        isTeacherSwapped: isMeetingSubstitute || isTempSubstitute,
        originalTeacherName: isMeetingSubstitute
          ? (toOne(meeting?.assignedTeacher ?? null)?.users?.fullName ?? defaultTeacherName)
          : isTempSubstitute
            ? defaultTeacherName
            : null,
        substituteTeacherName: isMeetingSubstitute
          ? (toOne(meeting?.actualTeacher ?? null)?.users?.fullName ?? null)
          : isTempSubstitute
            ? (tempTeacherNameById.get(temp!.teacherId!) ?? null)
            : null,
        substituteReason: meeting?.substituteReason ?? null,
        attendanceTotal: attendances.length,
        attendancePresent: attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE")
          .length,
        isOverdueCheckIn,
        isReportMissing,
        isHoliday,
        isAdminEntered: meeting?.isAdminEntered ?? false,
      };
    })
    .sort((a, b) => a.scheduleStartTime.localeCompare(b.scheduleStartTime));
}

export async function fetchAnalytics(days: number): Promise<AnalyticsPoint[]> {
  const supabase = createClient();

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatLocalDateStr(d));
  }

  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, scheduledDate")
    .gte("scheduledDate", dates[0])
    .lte("scheduledDate", dates[dates.length - 1])
    .is("deletedAt", null);
  if (lpErr) throw lpErr;

  const lps = lessonPlans as unknown as { id: string; scheduledDate: string }[];
  const lpIds = lps.map((lp) => lp.id);

  const { data: meetings, error: meetErr } =
    lpIds.length > 0
      ? await supabase
          .from("meetings")
          .select("lessonPlanId, status, attendances(status)")
          .in("lessonPlanId", lpIds)
      : { data: [], error: null };
  if (meetErr) throw meetErr;

  const meetingByLp = new Map<
    string,
    { status: string; attendances: { status: string }[] | null }
  >();
  (meetings as unknown as { lessonPlanId: string; status: string; attendances: { status: string }[] | null }[]).forEach(
    (m) => meetingByLp.set(m.lessonPlanId, m),
  );

  return dates.map((date) => {
    const dayLps = lps.filter((lp) => lp.scheduledDate === date);
    let completedCount = 0;
    let attendanceTotal = 0;
    let attendancePresent = 0;

    dayLps.forEach((lp) => {
      const meeting = meetingByLp.get(lp.id);
      if (!meeting) return;
      if (meeting.status === "COMPLETED") completedCount++;
      const attendances = meeting.attendances ?? [];
      attendanceTotal += attendances.length;
      attendancePresent += attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    });

    return {
      date,
      scheduledCount: dayLps.length,
      completedCount,
      completionRate: dayLps.length > 0 ? Math.round((completedCount / dayLps.length) * 100) : 0,
      attendanceTotal,
      attendancePresent,
      attendanceRate: attendanceTotal > 0 ? Math.round((attendancePresent / attendanceTotal) * 100) : 0,
    };
  });
}

/** Surfaces tutors whose classes have gone repeatedly untouched — no
 * lesson_plans row at all for an expected session (which also means no
 * check-in, since check-in either uses an existing plan or auto-creates a
 * draft one via check_in_with_draft_plan()) — over the last `days` days.
 * Deliberately simpler than fetchStatusBoard's per-day resolution: uses each
 * class's own weekly scheduleDaysOfWeek only, ignoring schedule overrides/
 * temporary schedules/holidays, since this is a proactive "who might need a
 * nudge" list, not the authoritative per-day record (that's Status Board) —
 * a handful of off-by-one days from an override doesn't change who ends up
 * on this list. */
export async function fetchDormantTutors(days: number): Promise<DormantTutorRow[]> {
  const supabase = createClient();

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatLocalDateStr(d));
  }
  const dowByDate = new Map(dates.map((date) => [date, dayOfWeek(date)]));

  const { data: classes, error: clsErr } = await supabase
    .from("classes")
    .select("id, name, teacherId, scheduleDaysOfWeek, teachers(users(fullName))")
    .eq("isActive", true)
    .is("deletedAt", null);
  if (clsErr) throw clsErr;

  type ClassRow = {
    id: string;
    name: string;
    teacherId: string;
    scheduleDaysOfWeek: number[];
    teachers: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null;
  };
  const cls = classes as unknown as ClassRow[];
  if (cls.length === 0) return [];

  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("classId, scheduledDate")
    .in("classId", cls.map((c) => c.id))
    .gte("scheduledDate", dates[0])
    .lte("scheduledDate", dates[dates.length - 1])
    .is("deletedAt", null);
  if (lpErr) throw lpErr;

  const plannedSet = new Set(
    (lessonPlans as unknown as { classId: string; scheduledDate: string }[]).map(
      (lp) => `${lp.classId}|${lp.scheduledDate}`,
    ),
  );

  // "Last active" looks further back than the dormancy window itself (a
  // tutor who wrote one plan 20 days ago but nothing since should still show
  // that date, not "Belum pernah") — capped at 90 days so the query stays
  // bounded rather than scanning the whole table.
  const { data: recentPlans, error: recentErr } = await supabase
    .from("lesson_plans")
    .select("createdByTeacherId, scheduledDate")
    .in("createdByTeacherId", [...new Set(cls.map((c) => c.teacherId))])
    .gte("scheduledDate", formatLocalDateStr(new Date(Date.now() - 90 * 86_400_000)))
    .is("deletedAt", null);
  if (recentErr) throw recentErr;

  const lastActiveByTeacher = new Map<string, string>();
  (recentPlans as unknown as { createdByTeacherId: string; scheduledDate: string }[]).forEach((lp) => {
    const current = lastActiveByTeacher.get(lp.createdByTeacherId);
    if (!current || lp.scheduledDate > current) lastActiveByTeacher.set(lp.createdByTeacherId, lp.scheduledDate);
  });

  interface Tally {
    teacherName: string;
    classNames: Set<string>;
    expectedSessions: number;
    missedSessions: number;
  }
  const byTeacher = new Map<string, Tally>();

  cls.forEach((c) => {
    const teacherName = toOne(c.teachers)?.users?.fullName ?? "-";
    dates.forEach((date) => {
      if (!c.scheduleDaysOfWeek.includes(dowByDate.get(date) as number)) return;
      const tally = byTeacher.get(c.teacherId) ?? {
        teacherName,
        classNames: new Set<string>(),
        expectedSessions: 0,
        missedSessions: 0,
      };
      tally.expectedSessions += 1;
      if (!plannedSet.has(`${c.id}|${date}`)) {
        tally.missedSessions += 1;
        tally.classNames.add(c.name);
      }
      byTeacher.set(c.teacherId, tally);
    });
  });

  return [...byTeacher.entries()]
    .filter(([, tally]) => tally.missedSessions >= DORMANT_THRESHOLD)
    .map(([teacherId, tally]) => ({
      teacherId,
      teacherName: tally.teacherName,
      classNames: [...tally.classNames],
      expectedSessions: tally.expectedSessions,
      missedSessions: tally.missedSessions,
      lastActiveDate: lastActiveByTeacher.get(teacherId) ?? null,
    }))
    .sort((a, b) => b.missedSessions - a.missedSessions);
}
