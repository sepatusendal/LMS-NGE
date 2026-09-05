import { z } from "zod";

export function buildStudentSchema(t: (key: string) => string) {
  return z.object({
    fullName: z.string().min(1, t("validation.fullNameRequired")),
    schoolId: z.string().min(1, t("validation.schoolRequired")),
    nis: z.string().optional(),
    /** Only used on create, to auto-enroll the new student — not a students
     * table column, so it's stripped out before insert/update. */
    classId: z.string().optional(),
  });
}

export type StudentInput = z.infer<ReturnType<typeof buildStudentSchema>>;

export interface Student {
  id: string;
  fullName: string;
  schoolId: string;
  schoolName: string;
  nis: string | null;
  isActive: boolean;
  createdAt: string;
}
