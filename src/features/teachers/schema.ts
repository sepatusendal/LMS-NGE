import { z } from "zod";

const feePerMeetingField = z
  .string()
  .optional()
  .refine((v) => !v || /^\d+$/.test(v), {
    message: "Fee harus angka Rupiah bulat, tidak boleh negatif",
  });

export const teacherCreateSchema = z.object({
  fullName: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(1, "Email wajib diisi").email("Format email salah"),
  tutorId: z.string().optional(),
  feePerMeeting: feePerMeetingField,
  phone: z.string().optional(),
  password: z.string().min(6, "Password minimal 6 karakter"),
});
export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>;

export const teacherEditSchema = z.object({
  fullName: z.string().min(1, "Nama wajib diisi"),
  tutorId: z.string().optional(),
  feePerMeeting: feePerMeetingField,
  phone: z.string().optional(),
});
export type TeacherEditInput = z.infer<typeof teacherEditSchema>;

export const teacherResetPasswordSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter"),
});
export type TeacherResetPasswordInput = z.infer<typeof teacherResetPasswordSchema>;

export interface Teacher {
  id: string;
  userId: string;
  tutorId: string | null;
  feePerMeeting: number | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  fullName: string;
  email: string;
}
