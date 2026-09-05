import { z } from "zod";

export const REPORT_FORMAT_OPTIONS = ["STANDARD", "ALBRIGHT"] as const;
export type CurriculumReportFormat = (typeof REPORT_FORMAT_OPTIONS)[number];

export const REPORT_FORMAT_LABEL: Record<CurriculumReportFormat, string> = {
  STANDARD: "Standard (Daily Teaching Report NUFA)",
  ALBRIGHT: "Albright (Unit & Topic, Activities, Resources)",
};

/** Build translated report-format labels. Pass a t scoped to
 * "admin.curriculum". */
export function buildReportFormatLabel(
  t: (key: string) => string,
): Record<CurriculumReportFormat, string> {
  return {
    STANDARD: t("reportFormatStandard"),
    ALBRIGHT: t("reportFormatAlbright"),
  };
}

export function buildCurriculumSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    gradeLevel: z.string().min(1, t("validation.gradeLevelRequired")),
    description: z.string().optional(),
    reportFormat: z.enum(REPORT_FORMAT_OPTIONS),
  });
}

export type CurriculumInput = z.infer<ReturnType<typeof buildCurriculumSchema>>;

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
