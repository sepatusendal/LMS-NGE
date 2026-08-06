import { z } from "zod";

export const curriculumSchema = z.object({
  name: z.string().min(1, "Nama kurikulum wajib diisi"),
  gradeLevel: z.string().min(1, "Grade level wajib diisi"),
  description: z.string().optional(),
});

export type CurriculumInput = z.infer<typeof curriculumSchema>;

export interface Curriculum {
  id: string;
  name: string;
  gradeLevel: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}
