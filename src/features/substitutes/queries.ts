import { createClient } from "@/lib/supabase/client";
import { parseLocalDate, todayLocalDateStr } from "@/lib/date";
import type { CurrentMeetingInfo, HandoverSummary } from "./schema";

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function dayOfWeek(dateStr: string): number {
  return parseLocalDate(dateStr).getDay();
}

/** Remaps the DB trigger's raw exception (enforce_no_substitute_change_after_checkin,
 * migration 20260811020000) into the same friendly message used by the
 * app-layer pre-check — this is the TOCTOU backstop firing, not a bug. */
function checkInGuardError(error: { message: string }): Error {
  if (error.message.includes("cannot change the assigned/substitute teacher after check-in")) {
    return new Error("Meeting ini sudah di-check-in, tidak bisa diganti tutor lagi");
  }
  return error instanceof Error ? error : new Error(error.message);
}

interface LessonPlanRow {
  id: string;
  meetingNumber: number;
  topic: string;
  scheduledDate: string;
}

/** Same "automatic lesson continuation" rule used for Today's Class (context.md
 * 5.6): first not-yet-COMPLETED meeting by meetingNumber, else the last one. */
async function resolveCurrentLessonPlan(classId: string): Promise<LessonPlanRow | null> {
  const supabase = createClient();

  const { data: plans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, meetingNumber, topic, scheduledDate")
    .eq("classId", classId)
    .is("deletedAt", null)
    .order("meetingNumber");
  if (lpErr) throw lpErr;

  const sorted = plans as unknown as LessonPlanRow[];
  if (sorted.length === 0) return null;

  const { data: completed, error: mErr } = await supabase
    .from("meetings")
    .select("lessonPlanId")
    .in("lessonPlanId", sorted.map((p) => p.id))
    .eq("status", "COMPLETED");
  if (mErr) throw mErr;

  const completedIds = new Set((completed as unknown as { lessonPlanId: string }[]).map((c) => c.lessonPlanId));
  return sorted.find((p) => !completedIds.has(p.id)) ?? sorted[sorted.length - 1];
}

/** Resolves the class's normally-scheduled teacher for a given date — the
 * class's own teacherId, unless a recurring per-weekday
 * ClassScheduleOverride hands that weekday to someone else. Used as the
 * "assignedTeacherId" baseline before layering a one-off substitute on top
 * (assignSubstituteForLessonPlan below), so cancelling the substitute always
 * reverts to this. */
async function resolveEffectiveTeacherForDate(
  classId: string,
  dateStr: string,
): Promise<{ teacherId: string; teacherName: string }> {
  const supabase = createClient();
  const day = dayOfWeek(dateStr);

  const { data: override } = await supabase
    .from("class_schedule_overrides")
    .select("teachers(id, users(fullName))")
    .eq("classId", classId)
    .eq("dayOfWeek", day)
    .maybeSingle();

  const ov = override as { teachers: { id: string; users: { fullName: string } | null } | { id: string; users: { fullName: string } | null }[] | null } | null;
  const ovTeacher = toOne(ov?.teachers);
  if (ovTeacher) {
    return { teacherId: ovTeacher.id, teacherName: ovTeacher.users?.fullName ?? "-" };
  }

  const { data: cls, error } = await supabase
    .from("classes")
    .select("teacherId, teachers(users(fullName))")
    .eq("id", classId)
    .single();
  if (error) throw error;
  const c = cls as unknown as { teacherId: string; teachers: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null };
  const teacher = toOne(c.teachers);
  return { teacherId: c.teacherId, teacherName: teacher?.users?.fullName ?? "-" };
}

export async function fetchCurrentMeetingInfo(classId: string): Promise<CurrentMeetingInfo | null> {
  const plan = await resolveCurrentLessonPlan(classId);
  if (!plan) return null;

  const supabase = createClient();
  const effective = await resolveEffectiveTeacherForDate(classId, todayLocalDateStr());

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select(
      "id, assignedTeacherId, actualTeacherId, substituteReason, checkIn:check_ins(id), assignedTeacher:teachers!meetings_assignedTeacherId_fkey(users(fullName)), actualTeacher:teachers!meetings_actualTeacherId_fkey(users(fullName))",
    )
    .eq("lessonPlanId", plan.id)
    .maybeSingle();
  if (error) throw error;

  if (!meeting) {
    return {
      lessonPlanId: plan.id,
      meetingNumber: plan.meetingNumber,
      topic: plan.topic,
      meetingId: null,
      hasCheckIn: false,
      effectiveTeacherId: effective.teacherId,
      effectiveTeacherName: effective.teacherName,
      isSubstituted: false,
      substituteTeacherId: null,
      substituteTeacherName: null,
      substituteReason: null,
    };
  }

  const m = meeting as unknown as {
    id: string;
    assignedTeacherId: string;
    actualTeacherId: string | null;
    substituteReason: string | null;
    checkIn: { id: string } | { id: string }[] | null;
    assignedTeacher: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null;
    actualTeacher: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null;
  };
  const isSubstituted = Boolean(m.actualTeacherId && m.actualTeacherId !== m.assignedTeacherId);

  return {
    lessonPlanId: plan.id,
    meetingNumber: plan.meetingNumber,
    topic: plan.topic,
    meetingId: m.id,
    hasCheckIn: Boolean(toOne(m.checkIn)),
    effectiveTeacherId: m.assignedTeacherId,
    effectiveTeacherName: toOne(m.assignedTeacher)?.users?.fullName ?? effective.teacherName,
    isSubstituted,
    substituteTeacherId: isSubstituted ? m.actualTeacherId : null,
    substituteTeacherName: isSubstituted ? (toOne(m.actualTeacher)?.users?.fullName ?? null) : null,
    substituteReason: m.substituteReason,
  };
}

/** Core one-off substitute assignment, scoped to an explicit lessonPlanId —
 * reusable for "today's meeting" (assignSubstitute below) as well as any
 * other date's meeting (e.g. an admin picking a future meeting off the
 * class timeline). Since it's keyed to a single Meeting/LessonPlan, the
 * *next* meeting automatically falls back to the class's normal
 * teacher/override — no separate "revert" step needed. */
export async function assignSubstituteForLessonPlan(input: {
  lessonPlanId: string;
  classId: string;
  scheduledDate: string;
  substituteTeacherId: string;
  reason: string;
}): Promise<void> {
  const supabase = createClient();
  const effective = await resolveEffectiveTeacherForDate(input.classId, input.scheduledDate);

  const { data: existing, error: findErr } = await supabase
    .from("meetings")
    .select("id, check_ins(id)")
    .eq("lessonPlanId", input.lessonPlanId)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    const ex = existing as unknown as { id: string; check_ins: { id: string }[] | null };
    if (ex.check_ins && ex.check_ins.length > 0) {
      throw new Error("Meeting ini sudah di-check-in, tidak bisa diganti tutor lagi");
    }
    const { error } = await supabase
      .from("meetings")
      .update({
        actualTeacherId: input.substituteTeacherId,
        substituteReason: input.reason,
      })
      .eq("id", ex.id);
    if (error) throw checkInGuardError(error);
    return;
  }

  const { error } = await supabase.from("meetings").insert({
    lessonPlanId: input.lessonPlanId,
    assignedTeacherId: effective.teacherId,
    actualTeacherId: input.substituteTeacherId,
    substituteReason: input.reason,
    status: "SCHEDULED",
  });
  if (error) {
    // 23505 = Postgres unique-violation on the lessonPlanId UNIQUE
    // constraint. This can race with another assignSubstitute call (or a
    // teacher's own startClass) that inserted the meeting for this lesson
    // plan first — surface a clear message instead of the raw DB error.
    if (error.code === "23505") {
      throw new Error(
        "Kelas ini sudah memiliki guru pengganti yang ditugaskan. Silakan refresh halaman.",
      );
    }
    throw error;
  }
}

export async function assignSubstitute(input: {
  classId: string;
  substituteTeacherId: string;
  reason: string;
}): Promise<void> {
  const plan = await resolveCurrentLessonPlan(input.classId);
  if (!plan) throw new Error("Kelas ini belum punya lesson plan");

  await assignSubstituteForLessonPlan({
    lessonPlanId: plan.id,
    classId: input.classId,
    scheduledDate: plan.scheduledDate,
    substituteTeacherId: input.substituteTeacherId,
    reason: input.reason,
  });
}

export async function cancelSubstitute(meetingId: string): Promise<void> {
  const supabase = createClient();

  const { data: meeting, error: findErr } = await supabase
    .from("meetings")
    .select("assignedTeacherId, check_ins(id)")
    .eq("id", meetingId)
    .single();
  if (findErr) throw findErr;

  const m = meeting as unknown as { assignedTeacherId: string; check_ins: { id: string }[] | null };
  if (m.check_ins && m.check_ins.length > 0) {
    throw new Error("Meeting ini sudah di-check-in, tidak bisa dibatalkan");
  }

  const { error } = await supabase
    .from("meetings")
    .update({ actualTeacherId: m.assignedTeacherId, substituteReason: null })
    .eq("id", meetingId);
  if (error) throw checkInGuardError(error);
}

export async function fetchHandoverSummary(
  classId: string,
  currentLessonPlanId: string,
): Promise<HandoverSummary> {
  const supabase = createClient();

  const { data: plans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, meetingNumber, topic, scheduledDate")
    .eq("classId", classId)
    .is("deletedAt", null)
    .order("meetingNumber");
  if (lpErr) throw lpErr;

  const sorted = plans as unknown as LessonPlanRow[];
  const currentIndex = sorted.findIndex((p) => p.id === currentLessonPlanId);
  const current = sorted[currentIndex] ?? null;
  const previous = currentIndex > 0 ? sorted[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null;

  const { data: cls, error: clsErr } = await supabase
    .from("classes")
    .select("teacherId, teachers(users(fullName))")
    .eq("id", classId)
    .single();
  if (clsErr) throw clsErr;
  const c = cls as unknown as { teachers: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null };
  const originalTeacherName = toOne(c.teachers)?.users?.fullName ?? "-";

  let previousReport: HandoverSummary["previousReport"] = null;
  if (previous) {
    const { data: meeting } = await supabase
      .from("meetings")
      .select("teaching_reports(whatWentWell, whatNeedsImprovement, nextLessonNotes, homeworkAssigned)")
      .eq("lessonPlanId", previous.id)
      .maybeSingle();
    const report = toOne(
      (meeting as { teaching_reports: HandoverSummary["previousReport"] | HandoverSummary["previousReport"][] | null } | null)
        ?.teaching_reports,
    );
    previousReport = report;
  }

  const lessonPlanIds = sorted.map((p) => p.id);
  let followUps: HandoverSummary["followUps"] = [];
  if (lessonPlanIds.length > 0) {
    const { data: meetingRows, error: meetErr } = await supabase
      .from("meetings")
      .select("id")
      .in("lessonPlanId", lessonPlanIds);
    if (meetErr) throw meetErr;
    const meetingIds = (meetingRows as unknown as { id: string }[]).map((m) => m.id);

    if (meetingIds.length > 0) {
      const { data: reportRows, error: reportErr } = await supabase
        .from("teaching_reports")
        .select("id")
        .in("meetingId", meetingIds);
      if (reportErr) throw reportErr;
      const reportIds = (reportRows as unknown as { id: string }[]).map((r) => r.id);

      if (reportIds.length > 0) {
        const { data: followUpRows, error: fuErr } = await supabase
          .from("student_follow_ups")
          .select("note, students(fullName)")
          .in("teachingReportId", reportIds)
          .is("resolvedAt", null)
          .order("createdAt", { ascending: false })
          .limit(10);
        if (fuErr) throw fuErr;

        followUps = (
          followUpRows as unknown as { note: string; students: { fullName: string } | { fullName: string }[] | null }[]
        ).map((row) => ({ studentName: toOne(row.students)?.fullName ?? "-", note: row.note }));
      }
    }
  }

  return {
    originalTeacherName,
    currentLesson: current
      ? { meetingNumber: current.meetingNumber, topic: current.topic, scheduledDate: current.scheduledDate }
      : null,
    previousLesson: previous
      ? { meetingNumber: previous.meetingNumber, topic: previous.topic, scheduledDate: previous.scheduledDate }
      : null,
    previousReport,
    nextLesson: next
      ? { meetingNumber: next.meetingNumber, topic: next.topic, scheduledDate: next.scheduledDate }
      : null,
    followUps,
  };
}
