import { z } from "zod";

export const studentSchema = z.object({
  fullName: z.string().min(1, "Nama siswa wajib diisi"),
  schoolId: z.string().min(1, "Sekolah wajib dipilih"),
  nis: z.string().optional(),
});

export type StudentInput = z.infer<typeof studentSchema>;

export interface Student {
  id: string;
  fullName: string;
  schoolId: string;
  schoolName: string;
  nis: string | null;
  isActive: boolean;
  createdAt: string;
}
