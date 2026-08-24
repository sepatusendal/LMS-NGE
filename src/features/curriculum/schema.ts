import { z } from "zod";

export const REPORT_FORMAT_OPTIONS = ["STANDARD", "ALBRIGHT"] as const;
export type CurriculumReportFormat = (typeof REPORT_FORMAT_OPTIONS)[number];

export const REPORT_FORMAT_LABEL: Record<CurriculumReportFormat, string> = {
  STANDARD: "Standard (Daily Teaching Report NUFA)",
  ALBRIGHT: "Albright (Unit & Topic, Activities, Resources)",
};

export const curriculumSchema = z.object({
  name: z.string().min(1, "Nama kurikulum wajib diisi"),
  gradeLevel: z.string().min(1, "Grade level wajib diisi"),
  description: z.string().optional(),
  reportFormat: z.enum(REPORT_FORMAT_OPTIONS),
});

export type CurriculumInput = z.infer<typeof curriculumSchema>;

export interface Curriculum {
  id: string;
  name: string;
  gradeLevel: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  moduleDriveFileId: string | null;
  moduleFileName: string | null;
  moduleFileSize: number | null;
  moduleUpdatedAt: string | null;
  reportFormat: CurriculumReportFormat;
}
