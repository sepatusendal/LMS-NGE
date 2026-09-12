import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import type { ScheduleSlot } from "./schema";

export interface ClassModule {
  driveFileId: string;
  fileName: string;
  curriculumName: string;
}

export interface MyClass {
  id: string;
  name: string;
  schoolName: string;
  scheduleDaysOfWeek: number[];
  scheduleSlots: ScheduleSlot[];
  room: string | null;
  /** False for a class reached only via a ClassScheduleOverride (a covering
   * teacher on one weekday) or a class_temporary_schedules row (Jadwal
   * Sementara) — only an outright class owner is the "primary" teacher.
   * Browsing/reading is fine either way; see canAuthorLessonPlans for
   * whether this teacher may create/edit a lesson plan for it. */
  isPrimary: boolean;
  /** Whether this teacher may create a lesson plan for this class at all —
   * true for the primary teacher, a ClassScheduleOverride substitute
   * (recurring weekly split-class cover, e.g. "Houstan": Bu Eni Wed, guru
   * pengganti Sat), and a class_temporary_schedules substitute. The DB-level
   * RLS check is actually per-date (scheduledDate must fall on the
   * override's dayOfWeek, or match the temporary schedule's exact date), so
   * picking this class doesn't guarantee every date will be accepted — just
   * that at least one date will be. */
  canAuthorLessonPlans: boolean;
  /** The reference module for this class's program (curriculum), stored in
   * Google Drive. Null if the class has no curriculum assigned yet, or the
   * curriculum has no module uploaded. */
  module: ClassModule | null;
  /** STANDARD (default) or ALBRIGHT — drives which Lesson Plan / Teaching
   * Report field set to render for this class. */
  curriculumReportFormat: "STANDARD" | "ALBRIGHT";
}

interface MyClassRow {
  id: string;
  name: string;
  scheduleDaysOfWeek: number[];
  room: string | null;
  schools: { name: string } | null;
  class_schedule_slots: ScheduleSlot[];
  curriculums: {
    name: string;
    moduleDriveFileId: string | null;
    moduleFileName: string | null;
    reportFormat: "STANDARD" | "ALBRIGHT";
  } | null;
}

const SELECT =
  "id, name, scheduleDaysOfWeek, room, schools(name), class_schedule_slots(dayOfWeek, startTime, endTime), curriculums(name, moduleDriveFileId, moduleFileName, reportFormat)";

async function fetchMyClasses(teacherId: string): Promise<MyClass[]> {
  const supabase = createClient();

  // A teacher's classes are (a) classes they own outright, plus (b) classes
  // where a ClassScheduleOverride hands them a specific weekday every week
  // (a recurring covering-teacher arrangement, not a one-off substitute
  // event) — see prisma/schema.prisma's ClassScheduleOverride doc comment.
  // Without (b), a teacher covering a class every week could never select
  // it here to write a lesson plan for it. Plus (c) classes where a
  // class_temporary_schedules row (Jadwal Sementara) names them as the
  // substitute for a specific date — lesson-plan authorship for those is
  // allowed for that date only (see teacher_insert_own_lesson_plans RLS),
  // but the class still needs to appear here or the form/module lookups
  // below can't resolve it at all.
  const [ownedResult, overrideResult, temporaryScheduleResult] = await Promise.all([
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
    supabase
      .from("class_temporary_schedules")
      .select("classId")
      .eq("teacherId", teacherId),
  ]);
  if (ownedResult.error) throw ownedResult.error;
  if (overrideResult.error) throw overrideResult.error;
  if (temporaryScheduleResult.error) throw temporaryScheduleResult.error;

  const ownedRows = ownedResult.data as unknown as MyClassRow[];
  const ownedIds = new Set(ownedRows.map((r) => r.id));
  const overrideClassIds = (overrideResult.data as unknown as { classId: string }[])
    .map((o) => o.classId)
    .filter((id) => !ownedIds.has(id));
  const temporaryScheduleClassIds = (
    temporaryScheduleResult.data as unknown as { classId: string }[]
  )
    .map((o) => o.classId)
    .filter((id) => !ownedIds.has(id));
  const missingIds = [...new Set([...overrideClassIds, ...temporaryScheduleClassIds])];

  let missingRows: MyClassRow[] = [];
  if (missingIds.length > 0) {
    const { data, error } = await supabase
      .from("classes")
      .select(SELECT)
      .in("id", missingIds)
      .eq("isActive", true)
      .is("deletedAt", null);
    if (error) throw error;
    missingRows = data as unknown as MyClassRow[];
  }
  const missingRowsById = new Map(missingRows.map((r) => [r.id, r]));

  const toMyClass = (
    row: MyClassRow,
    isPrimary: boolean,
    canAuthorLessonPlans: boolean,
  ): MyClass => ({
    id: row.id,
    name: row.name,
    schoolName: row.schools?.name ?? "-",
    scheduleDaysOfWeek: row.scheduleDaysOfWeek,
    scheduleSlots: row.class_schedule_slots ?? [],
    room: row.room,
    isPrimary,
    canAuthorLessonPlans,
    module:
      row.curriculums?.moduleDriveFileId && row.curriculums.moduleFileName
        ? {
            driveFileId: row.curriculums.moduleDriveFileId,
            fileName: row.curriculums.moduleFileName,
            curriculumName: row.curriculums.name,
          }
        : null,
    curriculumReportFormat: row.curriculums?.reportFormat ?? "STANDARD",
  });

  return [
    ...ownedRows.map((r) => toMyClass(r, true, true)),
    ...missingIds.map((id) => {
      const row = missingRowsById.get(id);
      return row ? toMyClass(row, false, true) : null;
    }),
  ]
    .filter((c): c is MyClass => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function useMyClasses() {
  const { data: teacher } = useCurrentTeacher();
  return useQuery({
    queryKey: ["my-classes", teacher?.teacherId],
    queryFn: () => fetchMyClasses(teacher!.teacherId),
    enabled: Boolean(teacher?.teacherId),
  });
}
