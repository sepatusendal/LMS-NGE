import { z } from "zod";

export const ALL_SCHOOLS_VALUE = "ALL";

export function buildHolidaySchema(t: (key: string) => string) {
  return z
    .object({
      dateFrom: z.string().min(1, t("validation.dateFromRequired")),
      dateTo: z.string().min(1, t("validation.dateToRequired")),
      name: z.string().min(1, t("validation.nameRequired")),
      schoolId: z.string().nullable(),
    })
    .refine((v) => v.dateTo >= v.dateFrom, {
      message: t("validation.dateToBeforeDateFrom"),
      path: ["dateTo"],
    });
}

export type HolidayInput = z.infer<ReturnType<typeof buildHolidaySchema>>;

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
