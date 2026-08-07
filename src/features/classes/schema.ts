import { z } from "zod";

export const DAY_OPTIONS = [
  { value: "1", label: "Senin" },
  { value: "2", label: "Selasa" },
  { value: "3", label: "Rabu" },
  { value: "4", label: "Kamis" },
  { value: "5", label: "Jumat" },
  { value: "6", label: "Sabtu" },
  { value: "0", label: "Minggu" },
];

export const DAY_LABEL: Record<string, string> = Object.fromEntries(
  DAY_OPTIONS.map((d) => [d.value, d.label]),
);

export const DAY_LABEL_SHORT: Record<string, string> = Object.fromEntries(
  DAY_OPTIONS.map((d) => [d.value, d.label.slice(0, 3)]),
);

export interface ScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export const classSchema = z
  .object({
    name: z.string().min(1, "Nama kelas wajib diisi"),
    schoolId: z.string().min(1, "Sekolah wajib dipilih"),
    teacherId: z.string().min(1, "Teacher wajib dipilih"),
    curriculumId: z.string().optional(),
    room: z.string().optional(),
    scheduleDaysOfWeek: z.array(z.string()).min(1, "Pilih minimal 1 hari"),
    scheduleTimes: z.record(
      z.string(),
      z.object({
        startTime: z.string().min(1, "Jam mulai wajib diisi"),
        endTime: z.string().min(1, "Jam selesai wajib diisi"),
      }),
    ),
  })
  .refine(
    (data) => data.scheduleDaysOfWeek.every((d) => data.scheduleTimes[d]?.startTime && data.scheduleTimes[d]?.endTime),
    {
      message: "Isi jam mulai & selesai untuk setiap hari yang dipilih di atas",
      path: ["scheduleTimes"],
    },
  );

export type ClassInput = z.infer<typeof classSchema>;

export interface Class {
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  teacherId: string;
  teacherName: string;
  curriculumId: string | null;
  curriculumName: string | null;
  room: string | null;
  scheduleDaysOfWeek: number[];
  scheduleSlots: ScheduleSlot[];
  isActive: boolean;
  createdAt: string;
}

/** The slot for a specific day, if the class meets that day. */
export function getSlotForDay(slots: ScheduleSlot[], dayOfWeek: number): ScheduleSlot | null {
  return slots.find((s) => s.dayOfWeek === dayOfWeek) ?? null;
}

/** Human-readable "Sen 08:00-09:00, Kam 15:00-16:00" for lists/tables. */
export function formatScheduleSlots(slots: ScheduleSlot[]): string {
  if (slots.length === 0) return "-";
  return [...slots]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((s) => `${DAY_LABEL_SHORT[String(s.dayOfWeek)]} ${s.startTime}-${s.endTime}`)
    .join(", ");
}
