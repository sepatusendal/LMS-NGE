import { createClient } from "@/lib/supabase/client";
import type { Class, ClassInput } from "./schema";

interface ClassRow {
  id: string;
  name: string;
  schoolId: string;
  teacherId: string;
  curriculumId: string | null;
  room: string | null;
  scheduleDaysOfWeek: number[];
  scheduleStartTime: string;
  scheduleEndTime: string;
  isActive: boolean;
  createdAt: string;
  schools: { name: string } | null;
  curriculums: { name: string } | null;
  teachers: { users: { fullName: string } | null } | null;
}

const SELECT = `
  id, name, schoolId, teacherId, curriculumId, room, scheduleDaysOfWeek,
  scheduleStartTime, scheduleEndTime, isActive, createdAt,
  schools(name), curriculums(name), teachers(users(fullName))
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
    scheduleStartTime: row.scheduleStartTime,
    scheduleEndTime: row.scheduleEndTime,
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
    scheduleStartTime: input.scheduleStartTime,
    scheduleEndTime: input.scheduleEndTime,
  };
}

export async function createClassRecord(input: ClassInput) {
  const supabase = createClient();
  const { error } = await supabase.from("classes").insert(toPayload(input));
  if (error) throw error;
}

export async function updateClassRecord(id: string, input: ClassInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from("classes")
    .update(toPayload(input))
    .eq("id", id);
  if (error) throw error;
}

export async function setClassActive(id: string, isActive: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("classes")
    .update({ isActive })
    .eq("id", id);
  if (error) throw error;
}
