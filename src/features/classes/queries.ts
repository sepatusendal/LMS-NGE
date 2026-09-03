import { createClient } from "@/lib/supabase/client";
import { findRecurringScheduleConflict, ScheduleConflictError } from "@/lib/schedule-conflict";
import type { Class, ClassInput, ClassType, ScheduleSlot } from "./schema";

interface ClassRow {
  id: string;
  name: string;
  schoolId: string;
  teacherId: string;
  curriculumId: string | null;
  classType: ClassType;
  room: string | null;
  scheduleDaysOfWeek: number[];
  isActive: boolean;
  createdAt: string;
  schools: { name: string } | null;
  curriculums: { name: string; gradeLevel: string; reportFormat: "STANDARD" | "ALBRIGHT" } | null;
  teachers: { users: { fullName: string } | null } | null;
  class_schedule_slots: { dayOfWeek: number; startTime: string; endTime: string }[];
}

const SELECT = `
  id, name, schoolId, teacherId, curriculumId, classType, room, scheduleDaysOfWeek,
  isActive, createdAt,
  schools(name), curriculums(name, gradeLevel, reportFormat), teachers(users(fullName)),
  class_schedule_slots(dayOfWeek, startTime, endTime)
`;

function mapRow(row: ClassRow): Class {
  return {
    id: row.id,
    name: row.name,
    schoolId: row.schoolId,
    schoolName: row.schools?.name ?? "-",
    teacherId: row.teacherId,
    teacherName: row.teachers?.users?.fullName ?? "-",
    curriculumId: row.curriculumId,
    curriculumName: row.curriculums?.name ?? null,
    curriculumGradeLevel: row.curriculums?.gradeLevel ?? null,
    curriculumReportFormat: row.curriculums?.reportFormat ?? "STANDARD",
    classType: row.classType,
    room: row.room,
    scheduleDaysOfWeek: row.scheduleDaysOfWeek,
    scheduleSlots: row.class_schedule_slots ?? [],
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

/** Fetch a single class regardless of classType — used by the detail page,
 * which is shared between the Classes and Kelas Guru & Staff submenus. */
export async function fetchClassById(id: string): Promise<Class | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .select(SELECT)
    .eq("id", id)
    .is("deletedAt", null)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as unknown as ClassRow) : null;
}

/** Pass classType to scope the Classes / Kelas Guru & Staff list pages to
 * one type; omit it for admin-wide surfaces (dashboard, reports, lesson
 * plan compliance) that should still cover both. */
export async function fetchClasses(classType?: ClassType): Promise<Class[]> {
  const supabase = createClient();
  let query = supabase.from("classes").select(SELECT).is("deletedAt", null).order("name");
  if (classType) query = query.eq("classType", classType);
  const { data, error } = await query;
  if (error) throw error;

  return (data as unknown as ClassRow[]).map(mapRow);
}

function toPayload(input: ClassInput, classType: ClassType) {
  return {
    name: input.name,
    schoolId: input.schoolId,
    teacherId: input.teacherId,
    curriculumId: input.curriculumId || null,
    classType,
    room: input.room || null,
    scheduleDaysOfWeek: input.scheduleDaysOfWeek.map(Number),
  };
}

function toSlots(classId: string, input: ClassInput): (ScheduleSlot & { classId: string })[] {
  return input.scheduleDaysOfWeek.map((d) => ({
    classId,
    dayOfWeek: Number(d),
    startTime: input.scheduleTimes[d].startTime,
    endTime: input.scheduleTimes[d].endTime,
  }));
}

/** Blocks saving a class schedule that would double-book its teacher —
 * checked per selected day against every other active class (own recurring
 * slot, or a class handed to them that weekday by an override). Runs before
 * any write so a conflict never leaves a half-applied class/slot update.
 * `excludeClassId` is the class being edited itself (undefined on create). */
async function assertNoScheduleConflict(input: ClassInput, excludeClassId?: string) {
  for (const d of input.scheduleDaysOfWeek) {
    const times = input.scheduleTimes[d];
    if (!times) continue;
    const conflict = await findRecurringScheduleConflict({
      teacherId: input.teacherId,
      dayOfWeek: Number(d),
      startTime: times.startTime,
      endTime: times.endTime,
      excludeClassId,
    });
    if (conflict) throw new ScheduleConflictError(conflict);
  }
}

async function syncScheduleSlots(supabase: ReturnType<typeof createClient>, classId: string, input: ClassInput) {
  const days = input.scheduleDaysOfWeek.map(Number);

  const { error: deleteError } = await supabase
    .from("class_schedule_slots")
    .delete()
    .eq("classId", classId)
    .not("dayOfWeek", "in", `(${days.length ? days.join(",") : "-1"})`);
  if (deleteError) throw deleteError;

  const { error: upsertError } = await supabase
    .from("class_schedule_slots")
    .upsert(toSlots(classId, input), { onConflict: "classId,dayOfWeek" });
  if (upsertError) throw upsertError;
}

export async function createClassRecord(input: ClassInput, classType: ClassType = "REGULAR") {
  await assertNoScheduleConflict(input);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert(toPayload(input, classType))
    .select("id")
    .single();
  if (error) throw error;

  await syncScheduleSlots(supabase, (data as { id: string }).id, input);
}

export async function updateClassRecord(id: string, input: ClassInput, classType: ClassType = "REGULAR") {
  await assertNoScheduleConflict(input, id);

  const supabase = createClient();
  const { error } = await supabase
    .from("classes")
    .update(toPayload(input, classType))
    .eq("id", id);
  if (error) throw error;

  await syncScheduleSlots(supabase, id, input);
}

export async function setClassActive(id: string, isActive: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("classes")
    .update({ isActive })
    .eq("id", id);
  if (error) throw error;
}
