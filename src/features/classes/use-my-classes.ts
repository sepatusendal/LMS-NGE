import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { parseLocalDate, todayLocalDateStr } from "@/lib/date";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import { getSlotForDay, type ScheduleSlot } from "./schema";

export interface ClassModule {
  driveFileId: string;
  fileName: string;
  curriculumName: string;
}

/** One date this teacher covers a class as a one-off substitute: a meeting
 * whose actualTeacherId is them while someone else is its assignedTeacherId
 * (admin "Substitute Teachers"). Unlike an override or a temporary schedule it
 * belongs to a single meeting, so it drops off by itself once `date` passes. */
export interface MySubstitution {
  meetingId: string;
  lessonPlanId: string;
  /** "YYYY-MM-DD" */
  date: string;
  /** The class's window on that date, resolved like the Status Board does
   * (temporary schedule for the date, else that weekday's override, else the
   * class's own slot). Null if the class has no window that day. */
  startTime: string | null;
  endTime: string | null;
  /** The teacher this meeting was originally assigned to — who they cover for. */
  coveringForName: string | null;
}

export interface MyClass {
  id: string;
  name: string;
  schoolName: string;
  scheduleDaysOfWeek: number[];
  scheduleSlots: ScheduleSlot[];
  room: string | null;
  /** False for a class reached only via a ClassScheduleOverride (a covering
   * teacher on one weekday), a class_temporary_schedules row (Jadwal
   * Sementara) or a one-off substitute meeting — only an outright class owner
   * is the "primary" teacher. Browsing/reading is fine either way; see
   * canAuthorLessonPlans for whether this teacher may create/edit a lesson
   * plan for it. */
  isPrimary: boolean;
  /** Whether this teacher may create a lesson plan for this class at all —
   * true for the primary teacher, a ClassScheduleOverride substitute
   * (recurring weekly split-class cover, e.g. "Houstan": Bu Eni Wed, guru
   * pengganti Sat), and a class_temporary_schedules substitute. The DB-level
   * RLS check is actually per-date (scheduledDate must fall on the
   * override's dayOfWeek, or match the temporary schedule's exact date), so
   * picking this class doesn't guarantee every date will be accepted — just
   * that at least one date will be. False for a class reached ONLY as a
   * one-off substitute for a meeting: they can't create plans for it, but they
   * can edit the content of the plan of each meeting they cover (see
   * `substitutions` and substitute_update_covered_lesson_plans). */
  canAuthorLessonPlans: boolean;
  /** Upcoming (today or later) one-off substitute meetings for this class,
   * soonest first. Empty for a class this teacher doesn't cover that way. */
  substitutions: MySubstitution[];
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

interface SubstituteMeetingRow {
  id: string;
  lessonPlanId: string;
  lesson_plans: { classId: string; scheduledDate: string } | { classId: string; scheduledDate: string }[] | null;
  assignedTeacher:
    | { users: { fullName: string } | null }
    | { users: { fullName: string } | null }[]
    | null;
}

interface SubstituteMeeting {
  meetingId: string;
  lessonPlanId: string;
  classId: string;
  date: string;
  coveringForName: string | null;
}

const SELECT =
  "id, name, scheduleDaysOfWeek, room, schools(name), class_schedule_slots(dayOfWeek, startTime, endTime), curriculums(name, moduleDriveFileId, moduleFileName, reportFormat)";

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/** Fills in each one-off substitute meeting's time window and groups them by
 * class. Batched (one query per source, not per meeting) because this runs on
 * every refetch of the teacher's class list. The precedence matches
 * fetchStatusBoard / resolveClassTimeWindowForDate: a temporary schedule on
 * that exact date, else the override for that weekday, else the class's own
 * slot for it. */
async function resolveSubstitutions(
  supabase: ReturnType<typeof createClient>,
  meetings: SubstituteMeeting[],
  classRows: MyClassRow[],
): Promise<Map<string, MySubstitution[]>> {
  const byClass = new Map<string, MySubstitution[]>();
  if (meetings.length === 0) return byClass;

  const classIds = [...new Set(meetings.map((m) => m.classId))];
  const dates = [...new Set(meetings.map((m) => m.date))];
  const [tempResult, overrideResult] = await Promise.all([
    supabase
      .from("class_temporary_schedules")
      .select("classId, date, startTime, endTime")
      .in("classId", classIds)
      .in("date", dates),
    supabase
      .from("class_schedule_overrides")
      .select("classId, dayOfWeek, startTime, endTime")
      .in("classId", classIds),
  ]);
  if (tempResult.error) throw tempResult.error;
  if (overrideResult.error) throw overrideResult.error;

  const tempByClassDate = new Map<string, { startTime: string; endTime: string }>();
  (tempResult.data as unknown as { classId: string; date: string; startTime: string; endTime: string }[]).forEach(
    (t) => tempByClassDate.set(`${t.classId}:${t.date}`, t),
  );
  const overrideByClassDay = new Map<string, { startTime: string; endTime: string }>();
  (overrideResult.data as unknown as (ScheduleSlot & { classId: string })[]).forEach((o) =>
    overrideByClassDay.set(`${o.classId}:${o.dayOfWeek}`, o),
  );
  const slotsByClass = new Map(classRows.map((r) => [r.id, r.class_schedule_slots ?? []]));

  for (const m of meetings) {
    const day = parseLocalDate(m.date).getDay();
    const window =
      tempByClassDate.get(`${m.classId}:${m.date}`) ??
      overrideByClassDay.get(`${m.classId}:${day}`) ??
      getSlotForDay(slotsByClass.get(m.classId) ?? [], day);
    const list = byClass.get(m.classId) ?? [];
    list.push({
      meetingId: m.meetingId,
      lessonPlanId: m.lessonPlanId,
      date: m.date,
      startTime: window?.startTime ?? null,
      endTime: window?.endTime ?? null,
      coveringForName: m.coveringForName,
    });
    byClass.set(m.classId, list);
  }
  for (const list of byClass.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));
  }
  return byClass;
}

export async function fetchMyClasses(teacherId: string): Promise<MyClass[]> {
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
  // below can't resolve it at all. Plus (d) classes where admin's
  // "Substitute Teachers" made them the actual teacher of one specific
  // upcoming meeting: /today already shows those on their date, but without
  // this the weekly Jadwal/Kelas/Lesson Plan lists stayed empty for a
  // teacher whose only classes were such substitutions (a brand-new teacher
  // covering for the day). They can't author lesson plans for it.
  const [ownedResult, overrideResult, temporaryScheduleResult, substituteResult] = await Promise.all([
    supabase
      .from("classes")
      .select(SELECT)
      .eq("teacherId", teacherId)
      .eq("isActive", true)
      .is("deletedAt", null),
    supabase
      .from("class_schedule_overrides")
      .select("classId, dayOfWeek, startTime, endTime")
      .eq("teacherId", teacherId),
    supabase
      .from("class_temporary_schedules")
      .select("classId")
      .eq("teacherId", teacherId),
    supabase
      .from("meetings")
      .select(
        "id, lessonPlanId, lesson_plans!inner(classId, scheduledDate), assignedTeacher:teachers!meetings_assignedTeacherId_fkey(users(fullName))",
      )
      .eq("actualTeacherId", teacherId)
      .neq("assignedTeacherId", teacherId)
      .neq("status", "CANCELLED")
      .gte("lesson_plans.scheduledDate", todayLocalDateStr()),
  ]);
  if (ownedResult.error) throw ownedResult.error;
  if (overrideResult.error) throw overrideResult.error;
  if (temporaryScheduleResult.error) throw temporaryScheduleResult.error;
  if (substituteResult.error) throw substituteResult.error;

  const ownedRows = ownedResult.data as unknown as MyClassRow[];
  const ownedIds = new Set(ownedRows.map((r) => r.id));

  const overrideRows = overrideResult.data as unknown as (ScheduleSlot & { classId: string })[];
  // classId -> the exact day(s)/time(s) THIS teacher covers via override —
  // used below so a class reached only as a covering teacher shows just
  // their own slot on the Jadwal page, not the class's entire default
  // weekly pattern (which may include days taught by someone else).
  const myOverrideSlotsByClass = new Map<string, ScheduleSlot[]>();
  overrideRows.forEach((o) => {
    const arr = myOverrideSlotsByClass.get(o.classId) ?? [];
    arr.push({ dayOfWeek: o.dayOfWeek, startTime: o.startTime, endTime: o.endTime });
    myOverrideSlotsByClass.set(o.classId, arr);
  });
  const overrideClassIds = [...myOverrideSlotsByClass.keys()].filter((id) => !ownedIds.has(id));

  const temporaryScheduleClassIds = (
    temporaryScheduleResult.data as unknown as { classId: string }[]
  )
    .map((o) => o.classId)
    .filter((id) => !ownedIds.has(id));

  const substituteMeetings = (substituteResult.data as unknown as SubstituteMeetingRow[]).flatMap(
    (m): SubstituteMeeting[] => {
      const lp = toOne(m.lesson_plans);
      if (!lp) return [];
      return [
        {
          meetingId: m.id,
          lessonPlanId: m.lessonPlanId,
          classId: lp.classId,
          date: lp.scheduledDate,
          coveringForName: toOne(m.assignedTeacher)?.users?.fullName ?? null,
        },
      ];
    },
  );
  const substituteClassIds = [...new Set(substituteMeetings.map((m) => m.classId))].filter((id) => !ownedIds.has(id));

  // Reaching a class through an override or a temporary schedule lets this
  // teacher write its lesson plans (per-date RLS); reaching it only as a
  // one-off substitute for a meeting does not.
  const authorableMissingIds = new Set([...overrideClassIds, ...temporaryScheduleClassIds]);
  const missingIds = [...new Set([...overrideClassIds, ...temporaryScheduleClassIds, ...substituteClassIds])];

  // A day of one of *my own* classes that's been handed to a different
  // teacher via override no longer belongs on my schedule either — without
  // this, an owned class kept showing its full default weekly pattern even
  // on days a covering teacher had taken over.
  const awayDaysByOwnedClass = new Map<string, Set<number>>();
  if (ownedIds.size > 0) {
    const { data: ownedOverrides, error: ownedOvErr } = await supabase
      .from("class_schedule_overrides")
      .select("classId, dayOfWeek, teacherId")
      .in("classId", [...ownedIds]);
    if (ownedOvErr) throw ownedOvErr;
    (ownedOverrides as unknown as { classId: string; dayOfWeek: number; teacherId: string }[]).forEach((o) => {
      if (o.teacherId === teacherId) return;
      const set = awayDaysByOwnedClass.get(o.classId) ?? new Set<number>();
      set.add(o.dayOfWeek);
      awayDaysByOwnedClass.set(o.classId, set);
    });
  }

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

  const substitutionsByClass = await resolveSubstitutions(supabase, substituteMeetings, [
    ...ownedRows,
    ...missingRows,
  ]);

  const toMyClass = (
    row: MyClassRow,
    isPrimary: boolean,
    canAuthorLessonPlans: boolean,
    effectiveSlots: ScheduleSlot[],
  ): MyClass => ({
    id: row.id,
    name: row.name,
    schoolName: row.schools?.name ?? "-",
    scheduleDaysOfWeek: row.scheduleDaysOfWeek,
    scheduleSlots: effectiveSlots,
    room: row.room,
    isPrimary,
    canAuthorLessonPlans,
    substitutions: substitutionsByClass.get(row.id) ?? [],
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
    ...ownedRows.map((r) =>
      toMyClass(
        r,
        true,
        true,
        (r.class_schedule_slots ?? []).filter((s) => !awayDaysByOwnedClass.get(r.id)?.has(s.dayOfWeek)),
      ),
    ),
    ...missingIds.map((id) => {
      const row = missingRowsById.get(id);
      if (!row) return null;
      // A recurring override slot if this teacher covers this class on a
      // specific weekday every week; otherwise they only reach this class
      // via a one-off Jadwal Sementara date or a one-off substitute meeting,
      // which doesn't belong on a *weekly* schedule view — leave it empty
      // rather than showing the class's unrelated default weekly pattern as
      // if it were theirs.
      return toMyClass(row, false, authorableMissingIds.has(id), myOverrideSlotsByClass.get(id) ?? []);
    }),
  ]
    .filter((c): c is MyClass => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @param enabled Set to false when the caller already knows the current
 * user isn't a teacher (e.g. an admin-only screen) — skips the underlying
 * useCurrentTeacher() lookup too, which would otherwise 406 (no matching
 * teachers row) on every render. Defaults to true for every teacher-facing
 * caller. */
export function useMyClasses(enabled = true) {
  const { data: teacher } = useCurrentTeacher(enabled);
  return useQuery({
    queryKey: ["my-classes", teacher?.teacherId],
    queryFn: () => fetchMyClasses(teacher!.teacherId),
    enabled: enabled && Boolean(teacher?.teacherId),
    // A schedule change made elsewhere (admin device) can't invalidate this
    // browser's cache directly — refetch when the teacher comes back to the
    // tab so an override/temp-schedule edit shows up without a manual reload.
    refetchOnWindowFocus: true,
  });
}
