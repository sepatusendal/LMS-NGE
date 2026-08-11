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
  /** False for a class reached only via a ClassScheduleOverride (a covering
   * teacher on one weekday) — lesson-plan authorship is restricted to the
   * class's primary teacher at the DB level, so callers that create/edit
   * lesson plans should filter to isPrimary classes only. Browsing/reading
   * is fine for either. */
  isPrimary: boolean;
}

interface MyClassRow {
  id: string;
  name: string;
  scheduleDaysOfWeek: number[];
  room: string | null;
  schools: { name: string } | null;
  class_schedule_slots: ScheduleSlot[];
}

const SELECT =
  "id, name, scheduleDaysOfWeek, room, schools(name), class_schedule_slots(dayOfWeek, startTime, endTime)";

async function fetchMyClasses(teacherId: string): Promise<MyClass[]> {
  const supabase = createClient();

  // A teacher's classes are (a) classes they own outright, plus (b) classes
  // where a ClassScheduleOverride hands them a specific weekday every week
  // (a recurring covering-teacher arrangement, not a one-off substitute
  // event) — see prisma/schema.prisma's ClassScheduleOverride doc comment.
  // Without (b), a teacher covering a class every week could never select
  // it here to write a lesson plan for it.
  const [ownedResult, overrideResult] = await Promise.all([
    supabase
      .from("classes")
      .select(SELECT)
      .eq("teacherId", teacherId)
      .eq("isActive", true)
      .is("deletedAt", null),
    supabase
      .from("class_schedule_overrides")
      .select("classId")
      .eq("teacherId", teacherId),
  ]);
  if (ownedResult.error) throw ownedResult.error;
  if (overrideResult.error) throw overrideResult.error;

  const ownedRows = ownedResult.data as unknown as MyClassRow[];
  const overrideClassIds = (overrideResult.data as unknown as { classId: string }[]).map(
    (o) => o.classId,
  );
  const ownedIds = new Set(ownedRows.map((r) => r.id));
  const missingIds = overrideClassIds.filter((id) => !ownedIds.has(id));

  let overrideRows: MyClassRow[] = [];
  if (missingIds.length > 0) {
    const { data, error } = await supabase
      .from("classes")
      .select(SELECT)
      .in("id", missingIds)
      .eq("isActive", true)
      .is("deletedAt", null);
    if (error) throw error;
    overrideRows = data as unknown as MyClassRow[];
  }

  const toMyClass = (row: MyClassRow, isPrimary: boolean): MyClass => ({
    id: row.id,
    name: row.name,
    schoolName: row.schools?.name ?? "-",
    scheduleDaysOfWeek: row.scheduleDaysOfWeek,
    scheduleSlots: row.class_schedule_slots ?? [],
    room: row.room,
    isPrimary,
  });

  return [
    ...ownedRows.map((r) => toMyClass(r, true)),
    ...overrideRows.map((r) => toMyClass(r, false)),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

export function useMyClasses() {
  const { data: teacher } = useCurrentTeacher();
  return useQuery({
    queryKey: ["my-classes", teacher?.teacherId],
    queryFn: () => fetchMyClasses(teacher!.teacherId),
    enabled: Boolean(teacher?.teacherId),
  });
}
