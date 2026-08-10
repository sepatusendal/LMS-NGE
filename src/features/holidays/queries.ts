import { createClient } from "@/lib/supabase/client";
import { dateRange } from "./schema";
import type { Holiday, HolidayInput } from "./schema";

interface HolidayRow {
  id: string;
  date: string;
  name: string;
  schoolId: string | null;
  createdAt: string;
  schools: { name: string } | { name: string }[] | null;
}

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

function mapRow(row: HolidayRow): Holiday {
  return {
    id: row.id,
    date: row.date,
    name: row.name,
    schoolId: row.schoolId,
    schoolName: toOne(row.schools)?.name ?? null,
    createdAt: row.createdAt,
  };
}

export async function fetchHolidays(): Promise<Holiday[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("holidays")
    .select("id, date, name, schoolId, createdAt, schools(name)")
    .order("date");
  if (error) throw error;
  return (data as unknown as HolidayRow[]).map(mapRow);
}

/** Creates one holiday row per date in [dateFrom, dateTo] — school holidays
 * are usually a contiguous stretch (cuti bersama, libur semester), and the
 * rest of the app (isHoliday/fetchHolidaySchoolsForDate) checks a single
 * date at a time, so a range is just N single-date rows sharing a name. */
export async function createHoliday(input: HolidayInput): Promise<void> {
  const supabase = createClient();
  const dates = dateRange(input.dateFrom, input.dateTo);
  const rows = dates.map((date) => ({
    date,
    name: input.name,
    schoolId: input.schoolId,
  }));
  const { error } = await supabase.from("holidays").insert(rows);
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "Sudah ada hari libur untuk salah satu tanggal di rentang ini dan sekolah ini",
      );
    }
    throw error;
  }
}

export async function deleteHoliday(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("holidays").delete().eq("id", id);
  if (error) throw error;
}

/** Is `date` a holiday for `schoolId` — either a school-specific holiday or
 * a global one (schoolId IS NULL applies to every school). */
export async function isHoliday(date: string, schoolId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("holidays")
    .select("id")
    .eq("date", date)
    .or(`schoolId.is.null,schoolId.eq.${schoolId}`)
    .limit(1);
  if (error) throw error;
  return (data as unknown[]).length > 0;
}

/** Holiday dates (as a Set of ISO date strings) on `date` across a list of
 * schools — used to filter/annotate classes when resolving "which classes
 * meet on date X" for more than one school at once. Returns a map of
 * schoolId -> true for schools on holiday on that date (a global holiday
 * marks every schoolId in `schoolIds`). */
export async function fetchHolidaySchoolsForDate(
  date: string,
  schoolIds: string[],
): Promise<Set<string>> {
  if (schoolIds.length === 0) return new Set();
  const supabase = createClient();
  const uniqueIds = [...new Set(schoolIds)];
  const { data, error } = await supabase
    .from("holidays")
    .select("schoolId")
    .eq("date", date)
    .or(`schoolId.is.null,schoolId.in.(${uniqueIds.join(",")})`);
  if (error) throw error;

  const rows = data as unknown as { schoolId: string | null }[];
  const isGlobalHoliday = rows.some((r) => r.schoolId === null);
  if (isGlobalHoliday) return new Set(uniqueIds);
  return new Set(rows.map((r) => r.schoolId).filter((id): id is string => Boolean(id)));
}
