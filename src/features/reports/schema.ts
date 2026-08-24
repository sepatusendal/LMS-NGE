import { z } from "zod";

export const OBJECTIVES_OPTIONS = ["YES", "PARTIALLY", "NO"] as const;
export type ObjectivesAchieved = (typeof OBJECTIVES_OPTIONS)[number];

export const OBJECTIVES_LABEL: Record<ObjectivesAchieved, string> = {
  YES: "Tercapai",
  PARTIALLY: "Sebagian",
  NO: "Belum Tercapai",
};

export const SKILL_OPTIONS = ["Listening", "Speaking", "Writing", "Reading"] as const;

export interface ReportObjectiveInput {
  text: string;
  achieved: boolean;
}

export const reportSchema = z
  .object({
    meetingId: z.string().min(1),
    skills: z.array(z.string()).default([]),
    objectives: z
      .array(z.object({ text: z.string().min(1), achieved: z.boolean() }))
      .default([]),
    whatWentWell: z.string().optional(),
    whatNeedsImprovement: z.string().optional(),
    // Required whenever whatNeedsImprovement is filled in (see superRefine
    // below) — a "needs improvement" note like "be more patient" needs a
    // follow-up on *how* that will be practiced next class.
    actionPlan: z.string().optional(),
    nextLessonNotes: z.string().optional(),
    homeworkAssigned: z.string().optional(),
    // Albright-curriculum-only fields — see ReportForm's curriculumReportFormat prop.
    languageSkillsFocus: z.string().optional(),
    activitiesLog: z.string().optional(),
    resourcesUsed: z.string().optional(),
    followUps: z.array(z.object({
      studentId: z.string().min(1),
      note: z.string().min(1, "Catatan wajib diisi"),
    })).default([]),
  })
  .superRefine((data, ctx) => {
    if ((data.whatNeedsImprovement ?? "").trim() && !(data.actionPlan ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actionPlan"],
        message: "Action plan wajib diisi kalau ada catatan yang perlu ditingkatkan",
      });
    }
  });
export type ReportInput = z.infer<typeof reportSchema>;

export interface TeachingReport {
  id: string;
  meetingId: string;
  originalTeacherId: string;
  substituteTeacherId: string | null;
  replacementReason: string | null;
  actualTeachingDate: string;
  skills: string[];
  objectivesAchieved: ObjectivesAchieved | null;
  objectives: { objectiveText: string; achieved: boolean }[];
  whatWentWell: string | null;
  whatNeedsImprovement: string | null;
  actionPlan: string | null;
  nextLessonNotes: string | null;
  homeworkAssigned: string | null;
  languageSkillsFocus: string | null;
  activitiesLog: string | null;
  resourcesUsed: string | null;
  photoDriveFileId: string | null;
  photoFileName: string | null;
  summary: string | null;
  createdAt: string;
}
