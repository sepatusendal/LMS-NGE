import { z } from "zod";

export const MANAGEABLE_ROLES = ["ADMIN", "COORDINATOR"] as const;
export type ManageableRole = (typeof MANAGEABLE_ROLES)[number];

export const ROLE_LABEL: Record<ManageableRole, string> = {
  ADMIN: "Admin",
  COORDINATOR: "Coordinator",
};

export const userCreateSchema = z.object({
  fullName: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(1, "Email wajib diisi").email("Format email salah"),
  role: z.enum(MANAGEABLE_ROLES),
  password: z.string().min(6, "Password minimal 6 karakter"),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userResetPasswordSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter"),
});
export type UserResetPasswordInput = z.infer<typeof userResetPasswordSchema>;

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: ManageableRole;
  isActive: boolean;
  createdAt: string;
}
