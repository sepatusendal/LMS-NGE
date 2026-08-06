import { z } from "zod";

export const OBJECTIVES_OPTIONS = ["YES", "PARTIALLY", "NO"] as const;
export type ObjectivesAchieved = (typeof OBJECTIVES_OPTIONS)[number];

export const OBJECTIVES_LABEL: Record<ObjectivesAchieved, string> = {
  YES: "Tercapai",
  PARTIALLY: "Sebagian",
  NO: "Belum Tercapai",
};

export const SKILL_OPTIONS = ["Listening", "Speaking", "Writing", "Reading"] as const;

export const reportSchema = z.object({
  meetingId: z.string().min(1),
  skills: z.array(z.string()).default([]),
  objectivesAchieved: z.enum(OBJECTIVES_OPTIONS).optional(),
  whatWentWell: z.string().optional(),
  whatNeedsImprovement: z.string().optional(),
  nextLessonNotes: z.string().optional(),
  homeworkAssigned: z.string().optional(),
  followUps: z.array(z.object({
    studentId: z.string().min(1),
    note: z.string().min(1, "Catatan wajib diisi"),
  })).default([]),
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
  whatWentWell: string | null;
  whatNeedsImprovement: string | null;
  nextLessonNotes: string | null;
  homeworkAssigned: string | null;
  photoDriveFileId: string | null;
  photoFileName: string | null;
  summary: string | null;
  createdAt: string;
}
