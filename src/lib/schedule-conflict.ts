import { createClient } from "@/lib/supabase/client";

/** A recurring class occupying a teacher on a given weekday, with the time
 * window that overlapped the one being checked. */
export interface ScheduleConflictInfo {
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
}

/** Half-open interval overlap: [aStart, aEnd) intersects [bStart, bEnd).
 * Times are "HH:MM" strings, which compare correctly lexicographically. */
export function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/** Thrown by any assignment/scheduling flow that would double-book a
 * teacher. `conflict` carries the specific class/time that collided, so
 * callers can build their own message if the default isn't specific enough
 * for their UI; `code` lets callers detect this case programmatically
 * (e.g. `error instanceof ScheduleConflictError` or `error.code === "SCHEDULE_CONFLICT"`). */
export class ScheduleConflictError extends Error {
  code = "SCHEDULE_CONFLICT" as const;
  conflict: ScheduleConflictInfo;

  constructor(conflict: ScheduleConflictInfo, message?: string) {
    super(
      message ??
        `Guru ini sudah mengajar kelas lain (${conflict.className}, ${conflict.startTime}–${conflict.endTime}) pada waktu yang sama.`,
    );
    this.name = "ScheduleConflictError";
    this.conflict = conflict;
  }
}

/**
 * Finds a *recurring* class (the teacher's own weekly slot, or a class
 * handed to them that weekday by a `class_schedule_overrides` row) whose
 * time window on `dayOfWeek` overlaps [startTime, endTime) — i.e. an
 * existing standing commitment that a new assignment would collide with.
 *
 * `excludeClassId` skips the class being created/edited/assigned itself
 * (its own slot obviously "overlaps" itself and isn't a real conflict).
 *
 * This only looks at the recurring weekly pattern — it does NOT account for
 * one-off substitute meetings on a specific date (a teacher temporarily
 * covering someone else's single meeting). Callers that need date-specific
 * coverage (see `assignSubstituteForLessonPlan` in
 * `src/features/substitutes/queries.ts`) layer that check on top of this
 * one.
 */
export async function findRecurringScheduleConflict(params: {
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  excludeClassId?: string;
}): Promise<ScheduleConflictInfo | null> {
  const { teacherId, dayOfWeek, startTime, endTime, excludeClassId } = params;
  const supabase = createClient();

  const { data: ownClasses, error: ownErr } = await supabase
    .from("classes")
    .select("id, name, class_schedule_slots(dayOfWeek, startTime, endTime)")
    .eq("teacherId", teacherId)
    .eq("isActive", true)
    .is("deletedAt", null);
  if (ownErr) throw ownErr;
  const ownClassRows = ownClasses as unknown as {
    id: string;
    name: string;
    class_schedule_slots: { dayOfWeek: number; startTime: string; endTime: string }[];
  }[];

  const { data: overridesToday, error: ovErr } = await supabase
    .from("class_schedule_overrides")
    .select("classId, teacherId, startTime, endTime, classes(id, name)")
    .eq("dayOfWeek", dayOfWeek);
  if (ovErr) throw ovErr;
  const overrideRows = overridesToday as unknown as {
    classId: string;
    teacherId: string;
    startTime: string;
    endTime: string;
    classes: { id: string; name: string } | { id: string; name: string }[] | null;
  }[];
  const overrideByClass = new Map(overrideRows.map((o) => [o.classId, o]));

  const candidates: ScheduleConflictInfo[] = [];

  // The teacher's own classes on this weekday — an override for the class
  // (if any) is authoritative and may hand the slot to someone else.
  for (const c of ownClassRows) {
    if (c.id === excludeClassId) continue;
    const ov = overrideByClass.get(c.id);
    if (ov) {
      if (ov.teacherId === teacherId) {
        candidates.push({ classId: c.id, className: c.name, startTime: ov.startTime, endTime: ov.endTime });
      }
      continue;
    }
    const slot = c.class_schedule_slots.find((s) => s.dayOfWeek === dayOfWeek);
    if (slot) candidates.push({ classId: c.id, className: c.name, startTime: slot.startTime, endTime: slot.endTime });
  }

  // Classes handed to this teacher that weekday even though it isn't their
  // own class (split/Houstan-Canberra-style classes).
  for (const ov of overrideRows) {
    if (ov.teacherId !== teacherId) continue;
    if (ov.classId === excludeClassId) continue;
    if (candidates.some((cand) => cand.classId === ov.classId)) continue;
    const cls = toOne(ov.classes);
    candidates.push({ classId: ov.classId, className: cls?.name ?? "-", startTime: ov.startTime, endTime: ov.endTime });
  }

  return candidates.find((cand) => timeRangesOverlap(startTime, endTime, cand.startTime, cand.endTime)) ?? null;
}
