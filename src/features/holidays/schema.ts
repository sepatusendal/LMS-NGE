import { z } from "zod";

export const ALL_SCHOOLS_VALUE = "ALL";

export const holidaySchema = z.object({
  date: z.string().min(1, "Tanggal wajib diisi"),
  name: z.string().min(1, "Nama libur wajib diisi"),
  schoolId: z.string().nullable(),
});

export type HolidayInput = z.infer<typeof holidaySchema>;

export interface Holiday {
  id: string;
  date: string;
  name: string;
  schoolId: string | null;
  schoolName: string | null;
  createdAt: string;
}
