import { z } from "zod";

function buildFeePerMeetingField(t: (key: string) => string) {
  return z
    .string()
    .optional()
    .refine((v) => !v || /^\d+$/.test(v), {
      message: t("validation.feeInvalid"),
    });
}

export function buildTeacherCreateSchema(t: (key: string) => string) {
  return z.object({
    fullName: z.string().min(1, t("validation.nameRequired")),
    email: z.string().min(1, t("validation.emailRequired")).email(t("validation.emailInvalid")),
    tutorId: z.string().optional(),
    feePerMeeting: buildFeePerMeetingField(t),
    phone: z.string().optional(),
    password: z.string().min(6, t("validation.passwordMin")),
  });
}
export type TeacherCreateInput = z.infer<ReturnType<typeof buildTeacherCreateSchema>>;

export function buildTeacherEditSchema(t: (key: string) => string) {
  return z.object({
    fullName: z.string().min(1, t("validation.nameRequired")),
    tutorId: z.string().optional(),
    feePerMeeting: buildFeePerMeetingField(t),
    phone: z.string().optional(),
  });
}
export type TeacherEditInput = z.infer<ReturnType<typeof buildTeacherEditSchema>>;

export function buildTeacherResetPasswordSchema(t: (key: string) => string) {
  return z.object({
    password: z.string().min(6, t("validation.passwordMin")),
  });
}
export type TeacherResetPasswordInput = z.infer<ReturnType<typeof buildTeacherResetPasswordSchema>>;

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
