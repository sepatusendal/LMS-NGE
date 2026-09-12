import { createClient } from "@/lib/supabase/client";
import { fetchHolidaySchoolsForDate } from "@/features/holidays/queries";
import { fetchTemporaryScheduleTimesForDate } from "@/features/temporary-schedules/queries";
import { formatLocalDateStr } from "@/lib/date";
import type { AnalyticsPoint, ClassStatusRow } from "./schema";

const LATE_GRACE_MINUTES = 10;

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
  actualTeacher: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null;
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
            "id, lessonPlanId, status, assignedTeacherId, actualTeacherId, substituteReason, actualTeacher:teachers!meetings_actualTeacherId_fkey(users(fullName)), checkIn:check_ins(checkInTime, isLate), checkOut:check_outs(checkOutTime), attendances(status), teachingReport:teaching_reports(id)",
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
      const teacherName = temp?.teacherId
        ? tempTeacherNameById.get(temp.teacherId) ?? "-"
        : overrideTeacher?.users?.fullName ?? cls.teachers?.users?.fullName ?? "-";

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
        isSubstitute: Boolean(
          meeting?.actualTeacherId && meeting.actualTeacherId !== meeting.assignedTeacherId,
        ),
        substituteTeacherName: toOne(meeting?.actualTeacher ?? null)?.users?.fullName ?? null,
        substituteReason: meeting?.substituteReason ?? null,
        attendanceTotal: attendances.length,
        attendancePresent: attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE")
          .length,
        isOverdueCheckIn,
        isReportMissing,
        isHoliday,
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
