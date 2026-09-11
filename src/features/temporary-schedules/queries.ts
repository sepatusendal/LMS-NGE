import { createClient } from "@/lib/supabase/client";
import { dateRange } from "@/features/holidays/schema";
import { parseLocalDate } from "@/lib/date";
import { findRecurringScheduleConflict, timeRangesOverlap } from "@/lib/schedule-conflict";
import type { TemporaryScheduleBatch, TemporaryScheduleInput } from "./schema";

interface TemporaryScheduleRow {
  batchId: string;
  classId: string;
  date: string;
  startTime: string;
  endTime: string;
  label: string | null;
  createdAt: string;
  teacherId: string | null;
  teachers: { users: { fullName: string } | null } | { users: { fullName: string } | null }[] | null;
  classes: { name: string } | { name: string }[] | null;
}

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/** Inclusive date range restricted to the given weekdays ("0".."6", Sunday..Saturday). */
function datesForWeekdays(dateFrom: string, dateTo: string, daysOfWeek: string[]): string[] {
  const allowed = new Set(daysOfWeek.map(Number));
  return dateRange(dateFrom, dateTo).filter((d) => allowed.has(parseLocalDate(d).getDay()));
}

export async function fetchTemporaryScheduleBatches(): Promise<TemporaryScheduleBatch[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_temporary_schedules")
    .select("batchId, classId, date, startTime, endTime, label, createdAt, teacherId, teachers(users(fullName)), classes(name)")
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
      const daysOfWeek = [...new Set(dates.map((d) => parseLocalDate(d).getDay()))].sort((a, b) => a - b);
      const substituteTeacherByClass: TemporaryScheduleBatch["substituteTeacherByClass"] = {};
      batchRows.forEach((r) => {
        if (!r.teacherId || substituteTeacherByClass[r.classId]) return;
        substituteTeacherByClass[r.classId] = {
          teacherId: r.teacherId,
          teacherName: toOne(r.teachers)?.users?.fullName ?? "-",
        };
      });
      return {
        batchId,
        label: batchRows[0].label,
        classIds,
        classNames,
        dateFrom: dates[0],
        dateTo: dates[dates.length - 1],
        daysOfWeek,
        startTime: batchRows[0].startTime,
        endTime: batchRows[0].endTime,
        createdAt: batchRows[0].createdAt,
        substituteTeacherByClass,
      };
    })
    .sort((a, b) => b.dateFrom.localeCompare(a.dateFrom));
}

/** Every conflict a candidate batch would create, keyed by the class it
 * affects (one message per class — first conflict found wins). Checks three
 * layers: (1) two selected classes sharing a teacher — since every class in
 * the batch gets the same new time on the same dates, that's an automatic
 * clash; (2) each teacher's OTHER recurring weekly commitments (their own
 * classes, or classes handed to them via override), on the actual weekdays
 * this batch's dates fall on; (3) any OTHER still-active temporary-schedule
 * batch that already claims that teacher's time on one of these dates.
 * `excludeBatchId` skips a batch's own rows in check (3) — pass the batch's
 * id when re-checking it during an edit, otherwise it always "conflicts"
 * with itself. */
async function collectTemporaryScheduleConflicts(
  input: TemporaryScheduleInput,
  dates: string[],
  excludeBatchId?: string,
): Promise<Map<string, string>> {
  const conflicts = new Map<string, string>();
  if (dates.length === 0 || input.classIds.length === 0) return conflicts;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, name, teacherId")
    .in("id", input.classIds);
  if (error) throw error;
  const rawClasses = data as unknown as { id: string; name: string; teacherId: string }[];
  // Effective teacher for THIS batch: the substitute picked for that class,
  // or the class's usual teacher if no substitute was assigned to it.
  const classes = rawClasses.map((c) => ({
    ...c,
    teacherId: input.teacherOverrides[c.id] ?? c.teacherId,
  }));

  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const a = classes[i];
      const b = classes[j];
      if (a.teacherId !== b.teacherId) continue;
      const message = `Guru yang sama mengajar ${a.name} dan ${b.name} — kalau dilanjutkan, keduanya bakal dijadwalkan jam yang sama (${input.startTime}-${input.endTime}) di periode ini.`;
      conflicts.set(a.id, message);
      conflicts.set(b.id, message);
    }
  }

  const effectiveDays = [...new Set(dates.map((d) => parseLocalDate(d).getDay()))];
  for (const c of classes) {
    if (conflicts.has(c.id)) continue;
    for (const day of effectiveDays) {
      const conflict = await findRecurringScheduleConflict({
        teacherId: c.teacherId,
        dayOfWeek: day,
        startTime: input.startTime,
        endTime: input.endTime,
        excludeClassId: c.id,
      });
      if (conflict) {
        conflicts.set(
          c.id,
          `Guru kelas ${c.name} sudah mengajar ${conflict.className} (${conflict.startTime}-${conflict.endTime}) di hari yang sama.`,
        );
        break;
      }
    }
  }

  const { data: otherData, error: otherError } = await supabase
    .from("class_temporary_schedules")
    .select("classId, batchId, date, startTime, endTime, teacherId, classes(name, teacherId)")
    .in("date", dates);
  if (otherError) throw otherError;
  const otherRows = otherData as unknown as {
    classId: string;
    batchId: string;
    date: string;
    startTime: string;
    endTime: string;
    teacherId: string | null;
    classes: { name: string; teacherId: string } | { name: string; teacherId: string }[] | null;
  }[];

  for (const c of classes) {
    if (conflicts.has(c.id)) continue;
    for (const row of otherRows) {
      if (row.batchId === excludeBatchId) continue;
      if (row.classId === c.id) continue;
      const other = toOne(row.classes);
      if (!other) continue;
      // The other row's effective teacher: its own substitute if it has
      // one, else that class's usual teacher.
      const otherEffectiveTeacherId = row.teacherId ?? other.teacherId;
      if (otherEffectiveTeacherId !== c.teacherId) continue;
      if (!timeRangesOverlap(input.startTime, input.endTime, row.startTime, row.endTime)) continue;
      conflicts.set(
        c.id,
        `Guru kelas ${c.name} sudah punya jadwal sementara lain (${other.name}, ${row.startTime}-${row.endTime}) di tanggal ${row.date}.`,
      );
      break;
    }
  }

  return conflicts;
}

/** Live-preview version for the form UI: returns every conflict found so
 * each affected class can be flagged, instead of stopping at the first one. */
export async function findTemporaryScheduleConflicts(
  input: TemporaryScheduleInput,
  excludeBatchId?: string,
): Promise<{ classId: string; message: string }[]> {
  const dates = datesForWeekdays(input.dateFrom, input.dateTo, input.daysOfWeek);
  const conflicts = await collectTemporaryScheduleConflicts(input, dates, excludeBatchId);
  return [...conflicts.entries()].map(([classId, message]) => ({ classId, message }));
}

async function assertNoTemporaryScheduleConflicts(
  input: TemporaryScheduleInput,
  dates: string[],
  excludeBatchId?: string,
) {
  const conflicts = await collectTemporaryScheduleConflicts(input, dates, excludeBatchId);
  const first = conflicts.values().next().value;
  if (first) throw new Error(first);
}

function buildTemporaryScheduleRows(input: TemporaryScheduleInput, dates: string[], batchId: string) {
  return input.classIds.flatMap((classId) =>
    dates.map((date) => ({
      batchId,
      classId,
      date,
      startTime: input.startTime,
      endTime: input.endTime,
      label: input.label || null,
      teacherId: input.teacherOverrides[classId] ?? null,
    })),
  );
}

const DUPLICATE_SCHEDULE_MESSAGE =
  "Salah satu kelas yang dipilih sudah punya jadwal sementara di salah satu tanggal pada rentang ini — hapus jadwal lamanya dulu.";

export async function createTemporarySchedules(input: TemporaryScheduleInput): Promise<void> {
  const dates = datesForWeekdays(input.dateFrom, input.dateTo, input.daysOfWeek);
  if (dates.length === 0) {
    throw new Error("Tidak ada tanggal yang cocok dengan hari yang dipilih dalam rentang ini.");
  }
  await assertNoTemporaryScheduleConflicts(input, dates);

  const supabase = createClient();
  const batchId = crypto.randomUUID();
  const rows = buildTemporaryScheduleRows(input, dates, batchId);

  const { error } = await supabase.from("class_temporary_schedules").insert(rows);
  if (error) {
    if (error.code === "23505") throw new Error(DUPLICATE_SCHEDULE_MESSAGE);
    throw error;
  }
}

/** Replaces every row of an existing batch with a freshly generated set —
 * there's no per-field "update" since the model is one row per (class ×
 * date); editing means regenerating that set under the same `batchId` so the
 * list page keeps showing it as one entry. Conflict checks exclude the
 * batch's own existing rows so editing it doesn't fail by "conflicting with
 * itself". */
export async function updateTemporarySchedule(batchId: string, input: TemporaryScheduleInput): Promise<void> {
  const dates = datesForWeekdays(input.dateFrom, input.dateTo, input.daysOfWeek);
  if (dates.length === 0) {
    throw new Error("Tidak ada tanggal yang cocok dengan hari yang dipilih dalam rentang ini.");
  }
  await assertNoTemporaryScheduleConflicts(input, dates, batchId);

  const supabase = createClient();
  const { error: deleteError } = await supabase.from("class_temporary_schedules").delete().eq("batchId", batchId);
  if (deleteError) throw deleteError;

  const rows = buildTemporaryScheduleRows(input, dates, batchId);
  const { error: insertError } = await supabase.from("class_temporary_schedules").insert(rows);
  if (insertError) {
    if (insertError.code === "23505") throw new Error(DUPLICATE_SCHEDULE_MESSAGE);
    throw insertError;
  }
}

export async function deleteTemporaryScheduleBatch(batchId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("class_temporary_schedules").delete().eq("batchId", batchId);
  if (error) throw error;
}

/** classId -> {startTime, endTime, teacherId} for every class in `classIds`
 * that has a temporary schedule override covering `date` — the
 * meetings/check-in and monitoring time-resolution logic look this up and,
 * when present, prefer its time over the class's normal recurring
 * slot/teacher-override time. `teacherId` is null unless a substitute
 * teacher was assigned for this class on this date; callers that only care
 * about timing can ignore it. */
export async function fetchTemporaryScheduleTimesForDate(
  classIds: string[],
  date: string,
): Promise<Map<string, { startTime: string; endTime: string; teacherId: string | null }>> {
  if (classIds.length === 0) return new Map();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("class_temporary_schedules")
    .select("classId, startTime, endTime, teacherId")
    .in("classId", [...new Set(classIds)])
    .eq("date", date);
  if (error) throw error;

  const map = new Map<string, { startTime: string; endTime: string; teacherId: string | null }>();
  (data as unknown as { classId: string; startTime: string; endTime: string; teacherId: string | null }[]).forEach(
    (row) => map.set(row.classId, { startTime: row.startTime, endTime: row.endTime, teacherId: row.teacherId }),
  );
  return map;
}
