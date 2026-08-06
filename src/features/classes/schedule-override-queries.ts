import { createClient } from "@/lib/supabase/client";

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

export async function upsertScheduleOverride(input: {
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacherId: string;
}) {
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
