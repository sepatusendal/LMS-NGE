import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import type { ScheduleSlot } from "./schema";

export interface MyClass {
  id: string;
  name: string;
  schoolName: string;
  scheduleDaysOfWeek: number[];
  scheduleSlots: ScheduleSlot[];
  room: string | null;
}

interface MyClassRow {
  id: string;
  name: string;
  scheduleDaysOfWeek: number[];
  room: string | null;
  schools: { name: string } | null;
  class_schedule_slots: ScheduleSlot[];
}

async function fetchMyClasses(teacherId: string): Promise<MyClass[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, scheduleDaysOfWeek, room, schools(name), class_schedule_slots(dayOfWeek, startTime, endTime)")
    .eq("teacherId", teacherId)
    .eq("isActive", true)
    .is("deletedAt", null)
    .order("name");
  if (error) throw error;

  return (data as unknown as MyClassRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    schoolName: row.schools?.name ?? "-",
    scheduleDaysOfWeek: row.scheduleDaysOfWeek,
    scheduleSlots: row.class_schedule_slots ?? [],
    room: row.room,
  }));
}

export function useMyClasses() {
  const { data: teacher } = useCurrentTeacher();
  return useQuery({
    queryKey: ["my-classes", teacher?.teacherId],
    queryFn: () => fetchMyClasses(teacher!.teacherId),
    enabled: Boolean(teacher?.teacherId),
  });
}
