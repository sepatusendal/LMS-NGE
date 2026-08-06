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

export const classSchema = z.object({
  name: z.string().min(1, "Nama kelas wajib diisi"),
  schoolId: z.string().min(1, "Sekolah wajib dipilih"),
  teacherId: z.string().min(1, "Teacher wajib dipilih"),
  curriculumId: z.string().optional(),
  room: z.string().optional(),
  scheduleDaysOfWeek: z
    .array(z.string())
    .min(1, "Pilih minimal 1 hari"),
  scheduleStartTime: z.string().min(1, "Jam mulai wajib diisi"),
  scheduleEndTime: z.string().min(1, "Jam selesai wajib diisi"),
});

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
  scheduleStartTime: string;
  scheduleEndTime: string;
  isActive: boolean;
  createdAt: string;
}
