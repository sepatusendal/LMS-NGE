import { z } from "zod";

export const MANAGEABLE_ROLES = ["ADMIN", "COORDINATOR"] as const;
export type ManageableRole = (typeof MANAGEABLE_ROLES)[number];

export const ROLE_LABEL: Record<ManageableRole, string> = {
  ADMIN: "Admin",
  COORDINATOR: "Coordinator",
};

export function buildUserCreateSchema(t: (key: string) => string) {
  return z.object({
    fullName: z.string().min(1, t("validation.nameRequired")),
    email: z.string().min(1, t("validation.emailRequired")).email(t("validation.emailInvalid")),
    role: z.enum(MANAGEABLE_ROLES),
    password: z.string().min(6, t("validation.passwordMin")),
  });
}
export type UserCreateInput = z.infer<ReturnType<typeof buildUserCreateSchema>>;

export function buildUserEditSchema(t: (key: string) => string) {
  return z.object({
    fullName: z.string().min(1, t("validation.nameRequired")),
  });
}
export type UserEditInput = z.infer<ReturnType<typeof buildUserEditSchema>>;

export function buildUserResetPasswordSchema(t: (key: string) => string) {
  return z.object({
    password: z.string().min(6, t("validation.passwordMin")),
  });
}
export type UserResetPasswordInput = z.infer<ReturnType<typeof buildUserResetPasswordSchema>>;

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  role: ManageableRole;
  isActive: boolean;
  createdAt: string;
}
