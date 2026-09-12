import { createClient } from "@/lib/supabase/client";
import { isHoliday, fetchHolidaySchoolsForDate } from "@/features/holidays/queries";
import { fetchTemporaryScheduleTimesForDate } from "@/features/temporary-schedules/queries";
import { todayLocalDateStr } from "@/lib/date";
import type { TodayClass } from "./schema";

function getTodayDayOfWeek(): number {
  const day = new Date().getDay();
  return day;
}

// Grace period before a check-in counts as "late" against the scheduled
// start time (context.md 5.1: "Late status is calculated automatically").
const LATE_GRACE_MINUTES = 10;

interface ScheduleOverrideRow {
  classId: string;
  startTime: string;
  endTime: string;
  teacherId: string;
}

async function fetchTodayOverrides(
  classIds: string[],
  today: number,
): Promise<Map<string, ScheduleOverrideRow>> {
  if (classIds.length === 0) return new Map();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_schedule_overrides")
    .select("classId, startTime, endTime, teacherId")
    .in("classId", classIds)
    .eq("dayOfWeek", today);
  if (error) throw error;
  const map = new Map<string, ScheduleOverrideRow>();
  (data as unknown as ScheduleOverrideRow[]).forEach((row) => map.set(row.classId, row));
  return map;
}

function computeIsLate(scheduleStartTime: string): boolean {
  const [hour, minute] = scheduleStartTime.split(":").map(Number);
  const now = new Date();
  const scheduled = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
  );
  return now.getTime() > scheduled.getTime() + LATE_GRACE_MINUTES * 60_000;
}

/** Shared by startClass() and checkInWithDraftPlan(): resolves whether
 * check-in counts as late (today's effective start time, with temporary
 * schedule > per-day override > normal recurring slot, same precedence as
 * fetchTodayClasses) and whether today is a holiday for the class's school. */
async function resolveCheckInTiming(classId: string): Promise<{ isLate: boolean }> {
  const supabase = createClient();
  const today = getTodayDayOfWeek();
  const todayDateStr = todayLocalDateStr();

  const { data: clsRow } = await supabase
    .from("classes")
    .select("schoolId, class_schedule_slots(dayOfWeek, startTime)")
    .eq("id", classId)
    .single();
  type SlotRow = { dayOfWeek: number; startTime: string };
  const cls = clsRow as { schoolId: string; class_schedule_slots: SlotRow[] } | null;
  const todaySlot = cls?.class_schedule_slots.find((s) => s.dayOfWeek === today);

  if (cls?.schoolId && (await isHoliday(todayDateStr, cls.schoolId))) {
    throw new Error("HOLIDAY_NO_CLASS");
  }

  const { data: override } = await supabase
    .from("class_schedule_overrides")
    .select("startTime")
    .eq("classId", classId)
    .eq("dayOfWeek", today)
    .maybeSingle();

  const temporarySchedule = (await fetchTemporaryScheduleTimesForDate([classId], todayDateStr)).get(classId);

  const effectiveStartTime =
    temporarySchedule?.startTime ?? (override as { startTime: string } | null)?.startTime ?? todaySlot?.startTime;
  return { isLate: effectiveStartTime ? computeIsLate(effectiveStartTime) : false };
}

export async function startClass(
  lessonPlanId: string,
  teacherId: string,
): Promise<string> {
  const supabase = createClient();

  const { data: lpRow } = await supabase
    .from("lesson_plans")
    .select("classId")
    .eq("id", lessonPlanId)
    .single();
  const lp = lpRow as { classId: string } | null;
  const { isLate } = await resolveCheckInTiming(lp!.classId);

  const { data: existing } = await supabase
    .from("meetings")
    .select("id")
    .eq("lessonPlanId", lessonPlanId)
    .maybeSingle();

  let meetingId: string;
  if (existing) {
    meetingId = (existing as { id: string }).id;
    const { data: ci } = await supabase
      .from("check_ins")
      .select("id")
      .eq("meetingId", meetingId)
      .maybeSingle();
    if (ci) throw new Error("ALREADY_CHECKED_IN");
  } else {
    const { data: meeting, error: mErr } = await supabase
      .from("meetings")
      .insert({
        lessonPlanId,
        assignedTeacherId: teacherId,
        actualTeacherId: teacherId,
        status: "SCHEDULED",
      })
      .select("id")
      .single();
    if (mErr) {
      // 23505 = Postgres unique-violation. A concurrent call (e.g. a double
      // tap on "Mulai Kelas") can race past the `existing` check above and
      // both try to insert — the UNIQUE constraint on lessonPlanId stops the
      // duplicate row, but without this, the loser would see a raw DB error
      // instead of gracefully picking up the meeting the winner just created.
      if (mErr.code === "23505") {
        const { data: raced, error: racedErr } = await supabase
          .from("meetings")
          .select("id")
          .eq("lessonPlanId", lessonPlanId)
          .single();
        if (racedErr) throw racedErr;
        meetingId = (raced as { id: string }).id;
      } else {
        throw mErr;
      }
    } else {
      meetingId = (meeting as { id: string }).id;
    }
  }

  const { error } = await supabase.from("check_ins").insert({
    meetingId,
    teacherId,
    isLate,
  });
  if (error) throw error;

  return meetingId;
}

interface ClassRow {
  id: string;
  name: string;
  room: string | null;
  scheduleDaysOfWeek: number[];
  class_schedule_slots: { dayOfWeek: number; startTime: string; endTime: string }[];
  schoolId: string;
  schools: { name: string } | null;
  curriculums: { reportFormat: "STANDARD" | "ALBRIGHT" } | null;
  // Resolved for `today` after fetch — the class's own slot for today, before
  // any override is layered on top.
  scheduleStartTime: string;
  scheduleEndTime: string;
}

interface LessonPlanRow {
  id: string;
  classId: string;
  meetingNumber: number;
  scheduledDate: string;
  topic: string;
  skills: string[];
  learningObjectives: string[] | null;
  moduleDriveFileId: string | null;
  moduleFileName: string | null;
}

interface MeetingRow {
  id: string;
  lessonPlanId: string;
  status: string;
  // Supabase embeds a to-one relation as an object when it can infer the
  // unique FK, but falls back to an array otherwise — normalize both shapes
  // via toOne() below rather than relying on Boolean(x), since Boolean([])
  // is true even for an empty array.
  checkIn:
    | { id: string; checkInTime: string; isLate: boolean }
    | { id: string; checkInTime: string; isLate: boolean }[]
    | null;
  checkOut:
    | { id: string; checkOutTime: string; durationMinutes: number }
    | { id: string; checkOutTime: string; durationMinutes: number }[]
    | null;
  attendances: { id: string }[] | null;
  teachingReport: { id: string } | { id: string }[] | null;
  assignedTeacherId: string;
  actualTeacherId: string | null;
  substituteReason: string | null;
  assignedTeacher:
    | { users: { fullName: string } | null }
    | { users: { fullName: string } | null }[]
    | null;
}

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

const CLASS_SELECT = `
  id, name, room, scheduleDaysOfWeek, schoolId,
  class_schedule_slots(dayOfWeek, startTime, endTime),
  schools(name), curriculums(reportFormat)
`;

/** Resolves each class's own scheduleStartTime/EndTime to its slot for
 * `today` (a class can meet at different times on different days — see
 * ClassScheduleSlot). Classes with no slot for today (shouldn't normally
 * happen if scheduleDaysOfWeek includes today, but defends against drift)
 * fall back to "00:00" so downstream sort/late-calculation doesn't crash. */
function resolveTodaySlot<T extends { class_schedule_slots: { dayOfWeek: number; startTime: string; endTime: string }[] }>(
  classes: T[],
  today: number,
): (T & { scheduleStartTime: string; scheduleEndTime: string })[] {
  return classes.map((c) => {
    const slot = c.class_schedule_slots.find((s) => s.dayOfWeek === today);
    return { ...c, scheduleStartTime: slot?.startTime ?? "00:00", scheduleEndTime: slot?.endTime ?? "00:00" };
  });
}

export async function fetchTodayClasses(teacherId: string): Promise<TodayClass[]> {
  const supabase = createClient();
  const today = getTodayDayOfWeek();

  const { data: ownClasses, error: classErr } = await supabase
    .from("classes")
    .select(CLASS_SELECT)
    .eq("teacherId", teacherId)
    .eq("isActive", true)
    .is("deletedAt", null);
  if (classErr) throw classErr;

  // Classes where a per-day override hands *today* to this teacher, even
  // when they aren't the class's default teacherId (Houstan/Canberra-style
  // split classes — see ClassScheduleOverride).
  const { data: myTodayOverrides, error: ovErr } = await supabase
    .from("class_schedule_overrides")
    .select("classId")
    .eq("teacherId", teacherId)
    .eq("dayOfWeek", today);
  if (ovErr) throw ovErr;

  // Meetings where this teacher was assigned as a one-off substitute for
  // *today's* specific lesson (context.md Section 6 — Admin marks the
  // original teacher absent and assigns a substitute for one meeting; this
  // is independent of the class's recurring day/teacher pattern above).
  const todayDateStr = todayLocalDateStr();
  const { data: substituteMeetings, error: subErr } = await supabase
    .from("meetings")
    .select("lessonPlanId, lesson_plans!inner(classId, scheduledDate)")
    .eq("actualTeacherId", teacherId)
    .eq("lesson_plans.scheduledDate", todayDateStr);
  if (subErr) throw subErr;

  const substituteClassIds = new Set(
    (substituteMeetings as unknown as { lesson_plans: { classId: string } | { classId: string }[] | null }[])
      .map((m) => toOne(m.lesson_plans)?.classId)
      .filter((id): id is string => Boolean(id)),
  );

  // Classes where a temporary schedule (e.g. exam-week coverage) hands
  // *today's exact date* to this teacher — same "extra class" treatment as
  // a per-day override below, but scoped to one date instead of a weekday.
  const { data: myTempSchedules, error: tempErr } = await supabase
    .from("class_temporary_schedules")
    .select("classId")
    .eq("teacherId", teacherId)
    .eq("date", todayDateStr);
  if (tempErr) throw tempErr;
  const myTempScheduleClassIds = new Set(
    (myTempSchedules as unknown as { classId: string }[]).map((r) => r.classId),
  );

  const resolvedOwnClasses = resolveTodaySlot(ownClasses as unknown as Omit<ClassRow, "scheduleStartTime" | "scheduleEndTime">[], today);
  const ownClassIds = new Set(resolvedOwnClasses.map((c) => c.id));
  const extraClassIds = [
    ...(myTodayOverrides as unknown as { classId: string }[]).map((o) => o.classId),
    ...substituteClassIds,
    ...myTempScheduleClassIds,
  ].filter((id) => !ownClassIds.has(id));

  let extraClasses: ClassRow[] = [];
  if (extraClassIds.length > 0) {
    const { data, error } = await supabase
      .from("classes")
      .select(CLASS_SELECT)
      .in("id", [...new Set(extraClassIds)])
      .eq("isActive", true)
      .is("deletedAt", null);
    if (error) throw error;
    extraClasses = resolveTodaySlot(data as unknown as Omit<ClassRow, "scheduleStartTime" | "scheduleEndTime">[], today);
  }

  const candidates = [...resolvedOwnClasses, ...extraClasses];
  const overridesByClass = await fetchTodayOverrides(candidates.map((c) => c.id), today);
  // A temporary schedule for today's exact date is authoritative for BOTH
  // time and teacher when it names one — more specific than the per-weekday
  // override, which is in turn more specific than the class's normal
  // recurring pattern. A temp schedule with no teacher set only changes the
  // time, same as before this field existed.
  const temporarySchedulesByClass = await fetchTemporaryScheduleTimesForDate(
    candidates.map((c) => c.id),
    todayDateStr,
  );

  const todayClasses = candidates
    .filter((c) => {
      const temp = temporarySchedulesByClass.get(c.id);
      if (temp?.teacherId) return temp.teacherId === teacherId;
      if (substituteClassIds.has(c.id)) return true;
      const ov = overridesByClass.get(c.id);
      // An override for today is authoritative (may hand the class to someone
      // else, or take it away). No override: fall back to the weekly pattern.
      if (ov) return ov.teacherId === teacherId;
      return c.scheduleDaysOfWeek.includes(today);
    })
    .map((c) => {
      const temp = temporarySchedulesByClass.get(c.id);
      if (temp) return { ...c, scheduleStartTime: temp.startTime, scheduleEndTime: temp.endTime };
      const ov = overridesByClass.get(c.id);
      return ov ? { ...c, scheduleStartTime: ov.startTime, scheduleEndTime: ov.endTime } : c;
    })
    .sort((a, b) => a.scheduleStartTime.localeCompare(b.scheduleStartTime));

  if (todayClasses.length === 0) return [];

  // Drop classes whose school is on holiday today (school-specific or
  // global — see Holiday.schoolId) so a teacher doesn't see a class to
  // teach on a non-teaching day.
  const holidaySchoolIds = await fetchHolidaySchoolsForDate(
    todayDateStr,
    todayClasses.map((c) => c.schoolId),
  );
  const nonHolidayClasses = todayClasses.filter((c) => !holidaySchoolIds.has(c.schoolId));
  if (nonHolidayClasses.length === 0) return [];

  const classIds = nonHolidayClasses.map((c) => c.id);

  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, classId, meetingNumber, scheduledDate, topic, skills, learningObjectives, moduleDriveFileId, moduleFileName")
    .in("classId", classIds)
    .is("deletedAt", null)
    .order("meetingNumber");
  if (lpErr) throw lpErr;

  const lpByClass = new Map<string, LessonPlanRow[]>();
  (lessonPlans as unknown as LessonPlanRow[]).forEach((lp) => {
    const arr = lpByClass.get(lp.classId) || [];
    arr.push(lp);
    lpByClass.set(lp.classId, arr);
  });

  const { data: meetings, error: meetErr } = await supabase
    .from("meetings")
    .select(
      "id, lessonPlanId, status, checkIn:check_ins(id, checkInTime, isLate), checkOut:check_outs(id, checkOutTime, durationMinutes), attendances(id), teachingReport:teaching_reports(id), assignedTeacherId, actualTeacherId, substituteReason, assignedTeacher:teachers!meetings_assignedTeacherId_fkey(users(fullName))",
    )
    .in("lessonPlanId", (lessonPlans as unknown as LessonPlanRow[]).map((lp) => lp.id));
  if (meetErr) throw meetErr;

  const meetByLp = new Map<string, MeetingRow>();
  (meetings as unknown as MeetingRow[]).forEach((m) => {
    meetByLp.set(m.lessonPlanId, m);
  });

  const { data: completedCounts, error: countErr } = await supabase
    .from("meetings")
    .select("lessonPlanId, status")
    .in("lessonPlanId", (lessonPlans as unknown as LessonPlanRow[]).map((lp) => lp.id))
    .eq("status", "COMPLETED");
  if (countErr) throw countErr;

  const completedLpIds = new Set(
    (completedCounts as unknown as { lessonPlanId: string }[]).map((c) => c.lessonPlanId),
  );

  // Classes with nobody enrolled yet can't produce attendance rows — treat
  // attendance as trivially done for them so check-out doesn't get stuck
  // waiting on a step that can never be satisfied (AttendanceForm shows a
  // "Lanjutkan" button in this case instead of a roster to submit).
  const { data: enrollments, error: enrollErr } = await supabase
    .from("class_enrollments")
    .select("classId")
    .in("classId", classIds)
    .is("unenrolledAt", null);
  if (enrollErr) throw enrollErr;

  const enrolledCountByClass = new Map<string, number>();
  (enrollments as unknown as { classId: string }[]).forEach((e) => {
    enrolledCountByClass.set(e.classId, (enrolledCountByClass.get(e.classId) ?? 0) + 1);
  });

  return nonHolidayClasses.map((cls): TodayClass => {
    const plans = lpByClass.get(cls.id) || [];
    const sorted = [...plans].sort((a, b) => a.meetingNumber - b.meetingNumber);

    const nextPlan = sorted.find((lp) => !completedLpIds.has(lp.id));
    // A pending meeting dated before today that was already checked out
    // (nothing left to do except file its report) has nothing to do with
    // *today* — but `.find()` above keeps returning it forever, since it
    // never reaches COMPLETED until someone files that report. That got
    // displayed as today's own status (e.g. "checked out") for a class the
    // teacher hadn't touched yet today. Treat it like "no plan for today"
    // instead, same as the courseCompleted case below, and surface the
    // stale meeting separately as a reminder so its report doesn't get
    // silently lost.
    const nextPlanIsStalePast =
      Boolean(nextPlan) &&
      nextPlan!.scheduledDate !== todayDateStr &&
      nextPlan!.scheduledDate < todayDateStr &&
      Boolean(toOne(meetByLp.get(nextPlan!.id)?.checkOut));
    const pendingReportMeeting = nextPlanIsStalePast ? meetByLp.get(nextPlan!.id) : undefined;
    const pendingReportMeetingId = pendingReportMeeting?.id ?? null;
    const pendingReportMeetingNumber = nextPlanIsStalePast ? (nextPlan!.meetingNumber ?? null) : null;

    // All lesson plans exist and are COMPLETED, or the only pending one is
    // the stale-past meeting above: either way there is no pending meeting
    // for *today*. Don't silently fall back to the last (already-finished)
    // plan as if it were upcoming — surface it as a distinct "course
    // finished" / "no plan today" state.
    const courseCompleted = (!nextPlan || nextPlanIsStalePast) && sorted.length > 0;
    const plan = (nextPlanIsStalePast ? null : nextPlan) || sorted[sorted.length - 1] || null;

    if (!plan || (nextPlanIsStalePast && plan === nextPlan)) {
      return {
        classId: cls.id,
        className: cls.name,
        schoolName: cls.schools?.name ?? "-",
        curriculumReportFormat: cls.curriculums?.reportFormat ?? "STANDARD",
        scheduleStartTime: cls.scheduleStartTime,
        scheduleEndTime: cls.scheduleEndTime,
        room: cls.room,
        lessonPlanId: null,
        meetingNumber: 1,
        topic: null,
        scheduledDate: null,
        skills: [],
        learningObjectives: [],
        moduleDriveFileId: null,
        moduleFileName: null,
        meetingId: null,
        // No lesson plan has ever been written for this class — there is
        // nothing to check in against today. Distinct from "not_started"
        // (which implies a plan is ready and waiting).
        meetingStatus: "no_plan_today",
        checkInTime: null,
        checkOutTime: null,
        isLate: null,
        durationMinutes: null,
        hasAttendance: false,
        hasReport: false,
        isSubstitute: false,
        originalTeacherName: null,
        substituteReason: null,
        needsNextLessonPlan: false,
        draftMeetingNumber: 1,
        draftWeek: 1,
        pendingReportMeetingId,
        pendingReportMeetingNumber,
      };
    }

    const meeting = meetByLp.get(plan.id);
    const checkIn = toOne(meeting?.checkIn);
    const checkOut = toOne(meeting?.checkOut);
    const teachingReport = toOne(meeting?.teachingReport);
    const hasCheckIn = Boolean(checkIn);
    const hasCheckOut = Boolean(checkOut);
    const hasAttendance =
      hasCheckIn &&
      (Boolean(meeting?.attendances && meeting.attendances.length > 0) ||
        (enrolledCountByClass.get(cls.id) ?? 0) === 0);
    const hasReport = Boolean(teachingReport);

    // `courseCompleted` only means "every lesson plan on file already has a
    // COMPLETED meeting" — it says nothing about whether *today* specifically
    // has been handled. `plan` in that case is the last plan ever written,
    // which is very often today's own (already-finished) meeting. Only treat
    // today as unplannable when that last plan isn't even dated today — that's
    // the one case where there's genuinely nothing to check in against.
    const planIsToday = plan.scheduledDate === todayDateStr;
    const noPlanForToday = courseCompleted && !planIsToday;
    // Caught up on everything written so far, but the *next* meeting's plan
    // (next week's, typically) hasn't been created yet — a forward-looking
    // reminder, not a sign today wasn't done. Only surface it once today's
    // own meeting is otherwise handled; noPlanForToday already carries its
    // own "create a plan" call-to-action so this would just be a duplicate.
    const needsNextLessonPlan = courseCompleted && !noPlanForToday;
    // What check_in_with_draft_plan() should number/date the placeholder
    // plan as, if the teacher checks in without writing one first — only
    // meaningful when noPlanForToday is true.
    const draftMeetingNumber = noPlanForToday ? plan.meetingNumber + 1 : plan.meetingNumber;
    const draftWeek = Math.ceil(draftMeetingNumber / 2);

    let meetingStatus = "not_started";
    if (noPlanForToday) meetingStatus = "no_plan_today";
    else if (hasReport) meetingStatus = "report_submitted";
    else if (hasCheckOut) meetingStatus = "checked_out";
    else if (hasAttendance) meetingStatus = "attendance_done";
    else if (hasCheckIn) meetingStatus = "checked_in";

    const isSubstitute = Boolean(
      meeting && meeting.assignedTeacherId !== teacherId && meeting.actualTeacherId === teacherId,
    );

    return {
      classId: cls.id,
      className: cls.name,
      schoolName: cls.schools?.name ?? "-",
      curriculumReportFormat: cls.curriculums?.reportFormat ?? "STANDARD",
      scheduleStartTime: cls.scheduleStartTime,
      scheduleEndTime: cls.scheduleEndTime,
      room: cls.room,
      lessonPlanId: plan.id,
      meetingNumber: plan.meetingNumber,
      topic: plan.topic,
      scheduledDate: plan.scheduledDate,
      skills: plan.skills || [],
      learningObjectives: plan.learningObjectives || [],
      moduleDriveFileId: plan.moduleDriveFileId,
      moduleFileName: plan.moduleFileName,
      meetingId: meeting?.id || null,
      meetingStatus,
      // `plan`/`meeting` here point at an old, already-finished meeting only
      // when noPlanForToday is true — its check-in/out/late/substitute data
      // belongs to that past session, not to "today". Blank it out so
      // there's nothing here to misread as current. In every other case
      // (including needsNextLessonPlan) this is genuinely today's meeting,
      // so its real check-in/out data should surface as usual.
      checkInTime: noPlanForToday ? null : checkIn?.checkInTime || null,
      checkOutTime: noPlanForToday ? null : checkOut?.checkOutTime || null,
      isLate: noPlanForToday ? null : (checkIn?.isLate ?? null),
      durationMinutes: noPlanForToday ? null : (checkOut?.durationMinutes ?? null),
      hasAttendance,
      hasReport,
      isSubstitute: noPlanForToday ? false : isSubstitute,
      originalTeacherName:
        !noPlanForToday && isSubstitute ? (toOne(meeting?.assignedTeacher)?.users?.fullName ?? null) : null,
      substituteReason: !noPlanForToday && isSubstitute ? (meeting?.substituteReason ?? null) : null,
      needsNextLessonPlan,
      draftMeetingNumber,
      draftWeek,
      pendingReportMeetingId,
      pendingReportMeetingNumber,
    };
  });
}

/** Used when the Absensi card is in the "no_plan_today" state — check-in
 * without an existing lesson plan for this class's next meeting. Creates a
 * placeholder ("draft") lesson plan, the meeting, and the check-in row all
 * in one atomic call — see check_in_with_draft_plan() in
 * 20260911020000_editable_reports_and_draft_plans. The normal path (a plan
 * already exists) keeps using startClass() above, untouched. */
export async function checkInWithDraftPlan(
  classId: string,
  teacherId: string,
  meetingNumber: number,
  week: number,
  scheduledDate: string,
): Promise<string> {
  const supabase = createClient();
  const { isLate } = await resolveCheckInTiming(classId);
  const { data, error } = await supabase.rpc("check_in_with_draft_plan", {
    p_class_id: classId,
    p_teacher_id: teacherId,
    p_meeting_number: meetingNumber,
    p_week: week,
    p_scheduled_date: scheduledDate,
    p_is_late: isLate,
  });
  if (error) {
    if (error.message === "NOT_PRIMARY_TEACHER") throw new Error("NOT_PRIMARY_TEACHER");
    throw error;
  }
  return data as string;
}

export async function updateCheckInPhoto(
  meetingId: string,
  driveFileId: string,
  fileName: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("check_ins")
    .update({ photoDriveFileId: driveFileId, photoFileName: fileName })
    .eq("meetingId", meetingId);
  if (error) throw error;
}

