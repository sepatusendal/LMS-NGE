import { createClient } from "@/lib/supabase/client";

export interface TimelineEntry {
  meetingNumber: number;
  lessonPlanId: string;
  scheduledDate: string;
  topic: string;
  meetingId: string | null;
  meetingStatus: string;
  assignedTeacherId: string | null;
  assignedTeacherName: string;
  actualTeacherName: string | null;
  isSubstitute: boolean;
  substituteReason: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  durationMinutes: number | null;
  isLate: boolean | null;
  attendanceTotal: number;
  attendancePresent: number;
  hasReport: boolean;
  objectivesAchieved: string | null;
}

interface LpRow {
  id: string;
  meetingNumber: number;
  scheduledDate: string;
  topic: string;
}

type ToOne<T> = T | T[] | null;

interface MeetingRow {
  id: string;
  lessonPlanId: string;
  status: string;
  substituteReason: string | null;
  assignedTeacherId: string;
  actualTeacherId: string | null;
  assignedTeacher: ToOne<{ users: { fullName: string } | null }>;
  actualTeacher: ToOne<{ users: { fullName: string } | null }>;
  checkIn: ToOne<{ checkInTime: string; isLate: boolean }>;
  checkOut: ToOne<{ checkOutTime: string; durationMinutes: number }>;
  attendances: { id: string; status: string }[] | null;
  teachingReport: ToOne<{ id: string; objectivesAchieved: string | null }>;
}

// Supabase embeds a to-one relation as an object when it can infer the
// unique FK, but falls back to an array otherwise — normalize both shapes
// (see the same helper in meetings/queries.ts; without it e.g. Boolean([])
// is true even for an empty array, so `hasReport` would always read true).
function toOne<T>(rel: ToOne<T>): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export async function fetchClassTimeline(classId: string): Promise<{
  timeline: TimelineEntry[];
  totalEnrolled: number;
}> {
  const supabase = createClient();

  const { count: totalEnrolled, error: countErr } = await supabase
    .from("class_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("classId", classId)
    .is("unenrolledAt", null);
  if (countErr) throw countErr;

  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, meetingNumber, scheduledDate, topic")
    .eq("classId", classId)
    .is("deletedAt", null)
    .order("meetingNumber");
  if (lpErr) throw lpErr;

  const lps = lessonPlans as unknown as LpRow[];
  if (lps.length === 0) return { timeline: [], totalEnrolled: totalEnrolled ?? 0 };

  // Fallback for lesson plans that don't have a Meeting yet (nothing has
  // happened for that date yet — no check-in, no substitute assignment):
  // resolve who *would* teach it from the class's own schedule, the same
  // way substitutes/queries.ts resolveEffectiveTeacherForDate does, so the
  // timeline doesn't show a blank "Teacher: -" for upcoming meetings.
  const { data: classRow, error: classErr } = await supabase
    .from("classes")
    .select("teacherId, teachers(users(fullName))")
    .eq("id", classId)
    .single();
  if (classErr) throw classErr;
  const cls = classRow as unknown as {
    teacherId: string;
    teachers: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null;
  };
  const defaultTeacherId = cls.teacherId;
  const defaultTeacherName = toOne(cls.teachers)?.users?.fullName ?? "-";

  const { data: overrides, error: ovErr } = await supabase
    .from("class_schedule_overrides")
    .select("dayOfWeek, teacherId, teachers(users(fullName))")
    .eq("classId", classId);
  if (ovErr) throw ovErr;
  const overrideByDay = new Map<
    number,
    { teacherId: string; teachers: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null }
  >();
  (overrides as unknown as { dayOfWeek: number; teacherId: string; teachers: unknown }[]).forEach((o) => {
    overrideByDay.set(o.dayOfWeek, o as never);
  });

  function resolveScheduledTeacher(scheduledDate: string): { id: string; name: string } {
    const override = overrideByDay.get(dayOfWeek(scheduledDate));
    if (override) {
      return { id: override.teacherId, name: toOne(override.teachers)?.users?.fullName ?? "-" };
    }
    return { id: defaultTeacherId, name: defaultTeacherName };
  }

  const lpIds = lps.map((lp) => lp.id);

  const { data: meetings, error: meetErr } = await supabase
    .from("meetings")
    .select(`
      id, lessonPlanId, status, substituteReason, assignedTeacherId, actualTeacherId,
      assignedTeacher:teachers!meetings_assignedTeacherId_fkey(users(fullName)),
      actualTeacher:teachers!meetings_actualTeacherId_fkey(users(fullName)),
      checkIn:check_ins(checkInTime, isLate),
      checkOut:check_outs(checkOutTime, durationMinutes),
      attendances(id, status),
      teachingReport:teaching_reports(id, objectivesAchieved)
    `)
    .in("lessonPlanId", lpIds);
  if (meetErr) throw meetErr;

  const meetByLp = new Map<string, MeetingRow>();
  (meetings as unknown as MeetingRow[]).forEach((m) => {
    meetByLp.set(m.lessonPlanId, m);
  });

  const timeline: TimelineEntry[] = lps.map((lp) => {
    const meeting = meetByLp.get(lp.id);

    const attendances = meeting?.attendances ?? [];
    const report = toOne(meeting?.teachingReport ?? null);
    const checkIn = toOne(meeting?.checkIn ?? null);
    const checkOut = toOne(meeting?.checkOut ?? null);
    const assignedTeacher = toOne(meeting?.assignedTeacher ?? null);
    const actualTeacher = toOne(meeting?.actualTeacher ?? null);
    const scheduled = resolveScheduledTeacher(lp.scheduledDate);

    return {
      meetingNumber: lp.meetingNumber,
      lessonPlanId: lp.id,
      scheduledDate: lp.scheduledDate,
      topic: lp.topic,
      meetingId: meeting?.id ?? null,
      meetingStatus: meeting?.status ?? "SCHEDULED",
      assignedTeacherId: meeting?.assignedTeacherId ?? scheduled.id,
      assignedTeacherName: assignedTeacher?.users?.fullName ?? scheduled.name,
      actualTeacherName: actualTeacher?.users?.fullName ?? null,
      isSubstitute: Boolean(
        meeting?.actualTeacherId && meeting.actualTeacherId !== meeting.assignedTeacherId,
      ),
      substituteReason: meeting?.substituteReason ?? null,
      checkInTime: checkIn?.checkInTime ?? null,
      checkOutTime: checkOut?.checkOutTime ?? null,
      durationMinutes: checkOut?.durationMinutes ?? null,
      isLate: checkIn?.isLate ?? null,
      attendanceTotal: attendances.length,
      attendancePresent: attendances.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE",
      ).length,
      hasReport: Boolean(report),
      objectivesAchieved: report?.objectivesAchieved ?? null,
    };
  });

  return { timeline, totalEnrolled: totalEnrolled ?? 0 };
}
