import { createClient } from "@/lib/supabase/client";
import type { Class, ClassInput, ScheduleSlot } from "./schema";

interface ClassRow {
  id: string;
  name: string;
  schoolId: string;
  teacherId: string;
  curriculumId: string | null;
  room: string | null;
  scheduleDaysOfWeek: number[];
  isActive: boolean;
  createdAt: string;
  schools: { name: string } | null;
  curriculums: { name: string } | null;
  teachers: { users: { fullName: string } | null } | null;
  class_schedule_slots: { dayOfWeek: number; startTime: string; endTime: string }[];
}

const SELECT = `
  id, name, schoolId, teacherId, curriculumId, room, scheduleDaysOfWeek,
  isActive, createdAt,
  schools(name), curriculums(name), teachers(users(fullName)),
  class_schedule_slots(dayOfWeek, startTime, endTime)
`;

export async function fetchClasses(): Promise<Class[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .select(SELECT)
    .is("deletedAt", null)
    .order("name");
  if (error) throw error;

  return (data as unknown as ClassRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    schoolId: row.schoolId,
    schoolName: row.schools?.name ?? "-",
    teacherId: row.teacherId,
    teacherName: row.teachers?.users?.fullName ?? "-",
    curriculumId: row.curriculumId,
    curriculumName: row.curriculums?.name ?? null,
    room: row.room,
    scheduleDaysOfWeek: row.scheduleDaysOfWeek,
    scheduleSlots: row.class_schedule_slots ?? [],
    isActive: row.isActive,
    createdAt: row.createdAt,
  }));
}

function toPayload(input: ClassInput) {
  return {
    name: input.name,
    schoolId: input.schoolId,
    teacherId: input.teacherId,
    curriculumId: input.curriculumId || null,
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

export async function createClassRecord(input: ClassInput) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .insert(toPayload(input))
    .select("id")
    .single();
  if (error) throw error;

  await syncScheduleSlots(supabase, (data as { id: string }).id, input);
}

export async function updateClassRecord(id: string, input: ClassInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from("classes")
    .update(toPayload(input))
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
