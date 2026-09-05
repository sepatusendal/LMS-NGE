import { z } from "zod";

export function buildLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().min(1, t("validation.emailRequired")).email(t("validation.emailInvalid")),
    password: z.string().min(6, t("validation.passwordMin")),
  });
}

export type LoginInput = z.infer<ReturnType<typeof buildLoginSchema>>;
