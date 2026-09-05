import { z } from "zod";

export function buildSchoolSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    address: z.string().optional(),
    picName: z.string().optional(),
    picPhone: z.string().optional(),
  });
}

export type SchoolInput = z.infer<ReturnType<typeof buildSchoolSchema>>;

export interface School {
  id: string;
  name: string;
  address: string | null;
  picName: string | null;
  picPhone: string | null;
  isActive: boolean;
  createdAt: string;
}
