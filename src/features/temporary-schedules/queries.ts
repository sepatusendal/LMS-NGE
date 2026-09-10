import { createClient } from "@/lib/supabase/client";
import { dateRange } from "@/features/holidays/schema";
import { findRecurringScheduleConflict, ScheduleConflictError } from "@/lib/schedule-conflict";
import type { TemporaryScheduleBatch, TemporaryScheduleInput } from "./schema";

interface TemporaryScheduleRow {
  batchId: string;
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string | null;
  createdAt: string;
  classes: { name: string } | { name: string }[] | null;
}

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export async function fetchTemporaryScheduleBatches(): Promise<TemporaryScheduleBatch[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_temporary_schedules")
    .select("batchId, classId, date, startTime, endTime, label, createdAt, classes(name)")
    .order("date");
  if (error) throw error;

  const rows = data as unknown as TemporaryScheduleRow[];
  const byBatch = new Map<string, TemporaryScheduleRow[]>();
  rows.forEach((row) => {
    const arr = byBatch.get(row.batchId) ?? [];
    arr.push(row);
    byBatch.set(row.batchId, arr);
  });

  return [...byBatch.entries()]
    .map(([batchId, batchRows]): TemporaryScheduleBatch => {
      const dates = batchRows.map((r) => r.date).sort();
      const classIds = [...new Set(batchRows.map((r) => r.classId))];
      const classNames = [
        ...new Set(batchRows.map((r) => toOne(r.classes)?.name ?? "-")),
      ];
      return {
        batchId,
        label: batchRows[0].label,
        classIds,
        classNames,
        dateFrom: dates[0],
        dateTo: dates[dates.length - 1],
        startTime: batchRows[0].startTime,
        endTime: batchRows[0].endTime,
        createdAt: batchRows[0].createdAt,
      };
    })
    .sort((a, b) => b.dateFrom.localeCompare(a.dateFrom));
}

/** Checks the new date-range time window against every selected class's
 * teacher for a schedule clash — both against classes NOT in this batch
 * (their normal recurring schedule) and against each other within the batch
 * (every class in a batch shares the same new time, so two batch classes
 * sharing a teacher on an overlapping weekday would double-book them). */
async function assertNoTemporaryScheduleConflicts(input: TemporaryScheduleInput) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, teacherId, scheduleDaysOfWeek")
    .in("id", input.classIds);
  if (error) throw error;
  const classes = data as unknown as { id: string; name: string; teacherId: string; scheduleDaysOfWeek: number[] }[];

  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const a = classes[i];
      const b = classes[j];
      if (a.teacherId !== b.teacherId) continue;
      const sharesDay = a.scheduleDaysOfWeek.some((d) => b.scheduleDaysOfWeek.includes(d));
      if (sharesDay) {
        throw new ScheduleConflictError(
          { classId: b.id, className: b.name, startTime: input.startTime, endTime: input.endTime },
          `Guru yang sama mengajar ${a.name} dan ${b.name} di hari yang sama — kalau dilanjutkan, keduanya bakal dijadwalkan jam yang sama (${input.startTime}-${input.endTime}) di periode ini.`,
        );
      }
    }
  }

  for (const c of classes) {
    for (const day of c.scheduleDaysOfWeek) {
      const conflict = await findRecurringScheduleConflict({
        teacherId: c.teacherId,
        dayOfWeek: day,
        startTime: input.startTime,
        endTime: input.endTime,
        excludeClassId: c.id,
      });
      if (conflict) throw new ScheduleConflictError(conflict);
    }
  }
}

export async function createTemporarySchedules(input: TemporaryScheduleInput): Promise<void> {
  await assertNoTemporaryScheduleConflicts(input);

  const supabase = createClient();
  const dates = dateRange(input.dateFrom, input.dateTo);
  const batchId = crypto.randomUUID();

  const rows = input.classIds.flatMap((classId) =>
    dates.map((date) => ({
      batchId,
      classId,
      date,
      startTime: input.startTime,
      endTime: input.endTime,
      label: input.label || null,
    })),
  );

  const { error } = await supabase.from("class_temporary_schedules").insert(rows);
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Salah satu kelas yang dipilih sudah punya jadwal sementara di salah satu tanggal pada rentang ini — hapus jadwal lamanya dulu.",
      );
    }
    throw error;
  }
}

export async function deleteTemporaryScheduleBatch(batchId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("class_temporary_schedules").delete().eq("batchId", batchId);
  if (error) throw error;
}

/** classId -> {startTime, endTime} for every class in `classIds` that has a
 * temporary schedule override covering `date` — the meetings/check-in and
 * monitoring time-resolution logic look this up and, when present, prefer it
 * over the class's normal recurring slot/teacher-override time. */
export async function fetchTemporaryScheduleTimesForDate(
  classIds: string[],
  date: string,
): Promise<Map<string, { startTime: string; endTime: string }>> {
  if (classIds.length === 0) return new Map();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_temporary_schedules")
    .select("classId, startTime, endTime")
    .in("classId", [...new Set(classIds)])
    .eq("date", date);
  if (error) throw error;

  const map = new Map<string, { startTime: string; endTime: string }>();
  (data as unknown as { classId: string; startTime: string; endTime: string }[]).forEach((row) =>
    map.set(row.classId, { startTime: row.startTime, endTime: row.endTime }),
  );
  return map;
}
