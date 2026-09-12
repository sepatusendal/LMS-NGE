import { createClient } from "@/lib/supabase/client";
import { findRecurringScheduleConflict, ScheduleConflictError, timeRangesOverlap } from "@/lib/schedule-conflict";
import { parseLocalDate, todayLocalDateStr } from "@/lib/date";

export interface ScheduleOverride {
  id: string;
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacherId: string;
  teacherName: string;
}

interface OverrideRow {
  id: string;
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacherId: string;
  teachers: { users: { fullName: string } | null } | null;
}

export async function fetchScheduleOverrides(classId: string): Promise<ScheduleOverride[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_schedule_overrides")
    .select("id, classId, dayOfWeek, startTime, endTime, teacherId, teachers(users(fullName))")
    .eq("classId", classId)
    .order("dayOfWeek");
  if (error) throw error;

  return (data as unknown as OverrideRow[]).map((row) => ({
    id: row.id,
    classId: row.classId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    teacherId: row.teacherId,
    teacherName: row.teachers?.users?.fullName ?? "-",
  }));
}

/** All overrides across every class — used where a teacher's *effective*
 * (split-day) classes need to be resolved, not just the ones they statically own. */
export async function fetchAllScheduleOverrides(): Promise<ScheduleOverride[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_schedule_overrides")
    .select("id, classId, dayOfWeek, startTime, endTime, teacherId, teachers(users(fullName))");
  if (error) throw error;

  return (data as unknown as OverrideRow[]).map((row) => ({
    id: row.id,
    classId: row.classId,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    teacherId: row.teacherId,
    teacherName: row.teachers?.users?.fullName ?? "-",
  }));
}

/** findRecurringScheduleConflict only looks at other recurring commitments
 * (a teacher's own classes + other overrides) — by its own doc comment, it
 * doesn't know about one-off `class_temporary_schedules` rows. Since a
 * ClassScheduleOverride repeats every week, it can still collide with a
 * *specific future date* that already has a Jadwal Sementara assignment
 * landing on the same weekday — e.g. an exam-week substitute booking for
 * every upcoming Wednesday would silently double-book if a new recurring
 * override also hands that teacher a Wednesday slot. Checked here as the
 * missing other half of the conflict check (the reverse direction — a new
 * temp schedule checked against recurring overrides — already happens in
 * collectTemporaryScheduleConflicts, temporary-schedules/queries.ts). */
async function findTemporaryScheduleConflictForRecurringSlot(params: {
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  excludeClassId?: string;
}): Promise<{ className: string; date: string; startTime: string; endTime: string } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_temporary_schedules")
    .select("classId, date, startTime, endTime, teacherId, classes(name, teacherId)")
    .gte("date", todayLocalDateStr());
  if (error) throw error;

  const rows = data as unknown as {
    classId: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId: string | null;
    classes: { name: string; teacherId: string } | { name: string; teacherId: string }[] | null;
  }[];

  for (const row of rows) {
    if (row.classId === params.excludeClassId) continue;
    if (parseLocalDate(row.date).getDay() !== params.dayOfWeek) continue;
    const cls = Array.isArray(row.classes) ? (row.classes[0] ?? null) : row.classes;
    if (!cls) continue;
    // The temp schedule's own substitute if it has one, else that class's usual teacher.
    const effectiveTeacherId = row.teacherId ?? cls.teacherId;
    if (effectiveTeacherId !== params.teacherId) continue;
    if (!timeRangesOverlap(params.startTime, params.endTime, row.startTime, row.endTime)) continue;
    return { className: cls.name, date: row.date, startTime: row.startTime, endTime: row.endTime };
  }
  return null;
}

export async function upsertScheduleOverride(input: {
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacherId: string;
}) {
  const conflict = await findRecurringScheduleConflict({
    teacherId: input.teacherId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    excludeClassId: input.classId,
  });
  if (conflict) throw new ScheduleConflictError(conflict);

  const tempConflict = await findTemporaryScheduleConflictForRecurringSlot({
    teacherId: input.teacherId,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    excludeClassId: input.classId,
  });
  if (tempConflict) {
    throw new ScheduleConflictError(
      {
        classId: input.classId,
        className: tempConflict.className,
        startTime: tempConflict.startTime,
        endTime: tempConflict.endTime,
      },
      `Guru ini sudah punya jadwal sementara (${tempConflict.className}, ${tempConflict.startTime}-${tempConflict.endTime}) di tanggal ${tempConflict.date}, yang jatuh di hari yang sama dengan jadwal tetap ini.`,
    );
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("class_schedule_overrides")
    .upsert(input, { onConflict: "classId,dayOfWeek" });
  if (error) throw error;
}

export async function deleteScheduleOverride(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("class_schedule_overrides").delete().eq("id", id);
  if (error) throw error;
}
