import { z } from "zod";

export const LEVEL_OPTIONS = ["SD", "SMP", "SMA"];
export const SKILL_OPTIONS = ["Listening", "Speaking", "Writing", "Reading"];
export const MATERIAL_OPTIONS = [
  "Whiteboard",
  "Markers",
  "Flashcards",
  "PowerPoint",
  "Worksheet",
  "Audio",
  "Video",
  "Printed Pictures",
  "Props",
];
export const PROCEDURE_OPTIONS = [
  "PPP (Presentation Practice Product)",
  "ESA (Engage Study Activate)",
];

export const STAGE_NAMES = [
  "Warm-up / Icebreaker",
  "Presentation",
  "Guided Practice",
  "Speaking Practice",
  "Game / Pair Work",
  "Production / Role Play",
  "Reflection & Homework",
] as const;

export const stageEntrySchema = z.object({
  stage: z.string(),
  tutorActivity: z.string().optional(),
  studentActivity: z.string().optional(),
  media: z.string().optional(),
  assessment: z.string().optional(),
});
export type StageEntry = z.infer<typeof stageEntrySchema>;

export function emptyStages(): StageEntry[] {
  return STAGE_NAMES.map((stage) => ({
    stage,
    tutorActivity: "",
    studentActivity: "",
    media: "",
    assessment: "",
  }));
}

export const lessonPlanSchema = z.object({
  classId: z.string().min(1, "Kelas wajib dipilih"),
  meetingNumber: z.coerce.number().int().min(1, "Meeting number wajib diisi"),
  week: z.coerce.number().int().min(1, "Minggu wajib diisi"),
  scheduledDate: z.string().min(1, "Tanggal wajib diisi"),
  level: z.string().optional(),
  topic: z.string().min(1, "Topic wajib diisi"),
  learningObjectives: z.string().optional(),
  skills: z.array(z.string()),
  method: z.string().optional(),
  procedure: z.string().optional(),
  materialsRequired: z.array(z.string()),
  vocabularyFocus: z.string().optional(),
  stages: z.array(stageEntrySchema),
  questionsToAsk: z.string().optional(),
  differentiationSupport: z.string().optional(),
  differentiationExtension: z.string().optional(),
  differentiationHomework: z.string().optional(),
});

export type LessonPlanInput = z.infer<typeof lessonPlanSchema>;

export interface LessonPlan {
  id: string;
  classId: string;
  className: string;
  meetingNumber: number;
  week: number;
  scheduledDate: string;
  level: string | null;
  topic: string;
  learningObjectives: string | null;
  skills: string[];
  method: string | null;
  procedure: string | null;
  materialsRequired: string[];
  vocabularyFocus: string | null;
  stages: StageEntry[];
  questionsToAsk: string[];
  differentiationSupport: string | null;
  differentiationExtension: string | null;
  differentiationHomework: string | null;
  createdAt: string;
}
