import { z } from "zod";

export const ALL_SCHOOLS_VALUE = "ALL";

export const holidaySchema = z
  .object({
    dateFrom: z.string().min(1, "Tanggal mulai wajib diisi"),
    dateTo: z.string().min(1, "Tanggal selesai wajib diisi"),
    name: z.string().min(1, "Nama libur wajib diisi"),
    schoolId: z.string().nullable(),
  })
  .refine((v) => v.dateTo >= v.dateFrom, {
    message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
    path: ["dateTo"],
  });

export type HolidayInput = z.infer<typeof holidaySchema>;

/** Inclusive list of ISO date strings from dateFrom to dateTo. */
export function dateRange(dateFrom: string, dateTo: string): string[] {
  const [fy, fm, fd] = dateFrom.split("-").map(Number);
  const [ty, tm, td] = dateTo.split("-").map(Number);
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);

  const dates: string[] = [];
  for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return dates;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  schoolId: string | null;
  schoolName: string | null;
  createdAt: string;
}
