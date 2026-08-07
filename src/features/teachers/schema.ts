import { z } from "zod";

export const teacherCreateSchema = z.object({
  fullName: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(1, "Email wajib diisi").email("Format email salah"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password minimal 6 karakter"),
});
export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>;

export const teacherEditSchema = z.object({
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
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  fullName: string;
  email: string;
}
