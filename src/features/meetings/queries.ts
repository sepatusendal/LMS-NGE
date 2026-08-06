import { createClient } from "@/lib/supabase/client";
import type { TodayClass, CheckInInput, CheckOutInput } from "./schema";

function getTodayDayOfWeek(): number {
  const day = new Date().getDay();
  return day;
}

// Grace period before a check-in counts as "late" against the scheduled
// start time (context.md 5.1: "Late status is calculated automatically").
const LATE_GRACE_MINUTES = 10;

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

export async function startClass(
  lessonPlanId: string,
  teacherId: string,
): Promise<string> {
  const supabase = createClient();

  const { data: lpRow } = await supabase
    .from("lesson_plans")
    .select("classId, classes(scheduleStartTime)")
    .eq("id", lessonPlanId)
    .single();
  const cls = toOne(
    (lpRow as { classes: { scheduleStartTime: string } | { scheduleStartTime: string }[] | null } | null)
      ?.classes,
  );
  const isLate = cls ? computeIsLate(cls.scheduleStartTime) : false;

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
    if (ci) throw new Error("Kelas ini sudah di-check-in");
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
    if (mErr) throw mErr;
    meetingId = (meeting as { id: string }).id;
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
  scheduleStartTime: string;
  scheduleEndTime: string;
  schools: { name: string } | null;
}

interface LessonPlanRow {
  id: string;
  classId: string;
  meetingNumber: number;
  scheduledDate: string;
  topic: string;
  skills: string[];
  learningObjectives: string | null;
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
}

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

const CLASS_SELECT = `
  id, name, room, scheduleDaysOfWeek, scheduleStartTime, scheduleEndTime,
  schools(name)
`;

export async function fetchTodayClasses(teacherId: string): Promise<TodayClass[]> {
  const supabase = createClient();
  const today = getTodayDayOfWeek();

  const { data: classes, error: classErr } = await supabase
    .from("classes")
    .select(CLASS_SELECT)
    .eq("teacherId", teacherId)
    .eq("isActive", true)
    .is("deletedAt", null)
    .order("scheduleStartTime");
  if (classErr) throw classErr;

  const todayClasses = (classes as unknown as ClassRow[]).filter((c) =>
    c.scheduleDaysOfWeek.includes(today),
  );

  if (todayClasses.length === 0) return [];

  const classIds = todayClasses.map((c) => c.id);

  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, classId, meetingNumber, scheduledDate, topic, skills, learningObjectives")
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
    .select("id, lessonPlanId, status, checkIn:check_ins(id, checkInTime, isLate), checkOut:check_outs(id, checkOutTime, durationMinutes), attendances(id), teachingReport:teaching_reports(id)")
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

  return todayClasses.map((cls): TodayClass => {
    const plans = lpByClass.get(cls.id) || [];
    const sorted = [...plans].sort((a, b) => a.meetingNumber - b.meetingNumber);

    const nextPlan = sorted.find((lp) => !completedLpIds.has(lp.id));
    const plan = nextPlan || sorted[sorted.length - 1] || null;

    if (!plan) {
      return {
        classId: cls.id,
        className: cls.name,
        schoolName: cls.schools?.name ?? "-",
        scheduleStartTime: cls.scheduleStartTime,
        scheduleEndTime: cls.scheduleEndTime,
        room: cls.room,
        lessonPlanId: null,
        meetingNumber: 1,
        topic: null,
        scheduledDate: null,
        skills: [],
        learningObjectives: null,
        meetingId: null,
        meetingStatus: "not_started",
        checkInTime: null,
        checkOutTime: null,
        isLate: null,
        durationMinutes: null,
        hasAttendance: false,
        hasReport: false,
      };
    }

    const meeting = meetByLp.get(plan.id);
    const checkIn = toOne(meeting?.checkIn);
    const checkOut = toOne(meeting?.checkOut);
    const teachingReport = toOne(meeting?.teachingReport);
    const hasCheckIn = Boolean(checkIn);
    const hasCheckOut = Boolean(checkOut);
    const hasAttendance = Boolean(meeting?.attendances && meeting.attendances.length > 0);
    const hasReport = Boolean(teachingReport);

    let meetingStatus = "not_started";
    if (hasReport) meetingStatus = "report_submitted";
    else if (hasCheckOut) meetingStatus = "checked_out";
    else if (hasAttendance) meetingStatus = "attendance_done";
    else if (hasCheckIn) meetingStatus = "checked_in";

    return {
      classId: cls.id,
      className: cls.name,
      schoolName: cls.schools?.name ?? "-",
      scheduleStartTime: cls.scheduleStartTime,
      scheduleEndTime: cls.scheduleEndTime,
      room: cls.room,
      lessonPlanId: plan.id,
      meetingNumber: plan.meetingNumber,
      topic: plan.topic,
      scheduledDate: plan.scheduledDate,
      skills: plan.skills || [],
      learningObjectives: plan.learningObjectives,
      meetingId: meeting?.id || null,
      meetingStatus,
      checkInTime: checkIn?.checkInTime || null,
      checkOutTime: checkOut?.checkOutTime || null,
      isLate: checkIn?.isLate ?? null,
      durationMinutes: checkOut?.durationMinutes ?? null,
      hasAttendance,
      hasReport,
    };
  });
}

export async function createMeeting(
  lessonPlanId: string,
  assignedTeacherId: string,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      lessonPlanId,
      assignedTeacherId,
      actualTeacherId: assignedTeacherId,
      status: "SCHEDULED",
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function doCheckIn(input: CheckInInput): Promise<void> {
  const supabase = createClient();

  if (!input.meetingId) throw new Error("Meeting ID diperlukan");

  const { error } = await supabase.from("check_ins").insert({
    meetingId: input.meetingId,
    teacherId: input.teacherId,
    gpsLat: input.gpsLat ?? null,
    gpsLng: input.gpsLng ?? null,
    notes: input.notes ?? null,
    isLate: false,
  });
  if (error) throw error;
}

export async function doCheckOut(input: CheckOutInput): Promise<void> {
  const supabase = createClient();

  const { data: ci, error: ciErr } = await supabase
    .from("check_ins")
    .select("checkInTime")
    .eq("meetingId", input.meetingId)
    .single();
  if (ciErr) throw new Error("Check-in belum dilakukan");

  const now = new Date();
  const checkInTime = new Date((ci as { checkInTime: string }).checkInTime);
  const durationMinutes = Math.max(
    1,
    Math.round((now.getTime() - checkInTime.getTime()) / 60000),
  );

  const { error } = await supabase.from("check_outs").insert({
    meetingId: input.meetingId,
    teacherId: input.teacherId,
    checkOutTime: now.toISOString(),
    durationMinutes,
    notes: input.notes ?? null,
  });
  if (error) throw error;
}
