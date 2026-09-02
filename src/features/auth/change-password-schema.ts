import { z } from "zod";

export function buildChangePasswordSchema(t: (key: string) => string) {
  return z
    .object({
      currentPassword: z.string().min(1, t("validation.currentPasswordRequired")),
      newPassword: z.string().min(6, t("validation.newPasswordMin")),
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t("validation.confirmPasswordMismatch"),
      path: ["confirmPassword"],
    });
}

export type ChangePasswordInput = z.infer<ReturnType<typeof buildChangePasswordSchema>>;
