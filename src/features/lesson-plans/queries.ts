import { createClient } from "@/lib/supabase/client";
import { isHoliday } from "@/features/holidays/queries";
import type { LessonPlan, LessonPlanInput, StageEntry } from "./schema";

interface LessonPlanRow {
  id: string;
  classId: string;
  meetingNumber: number;
  week: number;
  scheduledDate: string;
  level: string | null;
  topic: string;
  learningObjectives: string[] | null;
  skills: string[];
  method: string | null;
  procedure: string | null;
  materialsRequired: string[];
  vocabularyFocus: string | null;
  stages: StageEntry[] | null;
  questionsToAsk: string[];
  differentiationSupport: string | null;
  differentiationExtension: string | null;
  differentiationHomework: string | null;
  moduleDriveFileId: string | null;
  moduleFileName: string | null;
  createdAt: string;
  classes: { name: string } | null;
}

const SELECT = `
  id, classId, meetingNumber, week, scheduledDate, level, topic,
  learningObjectives, skills, method, procedure, materialsRequired,
  vocabularyFocus, stages, questionsToAsk, differentiationSupport,
  differentiationExtension, differentiationHomework, moduleDriveFileId,
  moduleFileName, createdAt,
  classes(name)
`;

/** `stages` is freeform Json — older rows were saved with separate
 * tutorActivity/studentActivity fields (pre-merge). Fold those into the
 * current single `activity` field instead of silently dropping them when
 * an old lesson plan is reopened. */
function normalizeStage(raw: unknown): StageEntry {
  const s = (raw ?? {}) as Record<string, unknown>;
  const legacyTutor = typeof s.tutorActivity === "string" ? s.tutorActivity : "";
  const legacyStudent = typeof s.studentActivity === "string" ? s.studentActivity : "";
  const legacyMerged = [legacyTutor, legacyStudent].filter(Boolean).join(" / ");
  return {
    stage: typeof s.stage === "string" ? s.stage : "",
    activity: typeof s.activity === "string" && s.activity ? s.activity : legacyMerged,
    media: typeof s.media === "string" ? s.media : "",
    assessment: typeof s.assessment === "string" ? s.assessment : "",
  };
}

function mapRow(row: LessonPlanRow): LessonPlan {
  return {
    id: row.id,
    classId: row.classId,
    className: row.classes?.name ?? "-",
    meetingNumber: row.meetingNumber,
    week: row.week,
    scheduledDate: row.scheduledDate,
    level: row.level,
    topic: row.topic,
    learningObjectives: row.learningObjectives ?? [],
    skills: row.skills ?? [],
    method: row.method,
    procedure: row.procedure,
    materialsRequired: row.materialsRequired ?? [],
    vocabularyFocus: row.vocabularyFocus,
    stages: (row.stages ?? []).map(normalizeStage),
    questionsToAsk: row.questionsToAsk ?? [],
    differentiationSupport: row.differentiationSupport,
    differentiationExtension: row.differentiationExtension,
    differentiationHomework: row.differentiationHomework,
    moduleDriveFileId: row.moduleDriveFileId,
    moduleFileName: row.moduleFileName,
    createdAt: row.createdAt,
  };
}

export async function fetchLessonPlans(): Promise<LessonPlan[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lesson_plans")
    .select(SELECT)
    .is("deletedAt", null)
    .order("scheduledDate");
  if (error) throw error;
  return (data as unknown as LessonPlanRow[]).map(mapRow);
}

export async function fetchLessonPlan(id: string): Promise<LessonPlan> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("lesson_plans")
    .select(SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  return mapRow(data as unknown as LessonPlanRow);
}

function toPayload(input: LessonPlanInput) {
  return {
    classId: input.classId,
    meetingNumber: input.meetingNumber,
    week: input.week,
    scheduledDate: input.scheduledDate,
    level: input.level || null,
    topic: input.topic,
    learningObjectives: input.learningObjectives.map((o) => o.trim()).filter(Boolean),
    skills: input.skills,
    method: input.method || null,
    procedure: input.procedure || null,
    materialsRequired: input.materialsRequired,
    vocabularyFocus: input.vocabularyFocus || null,
    stages: input.stages,
    questionsToAsk: (input.questionsToAsk ?? "")
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean),
    differentiationSupport: input.differentiationSupport || null,
    differentiationExtension: input.differentiationExtension || null,
    differentiationHomework: input.differentiationHomework || null,
    moduleDriveFileId: input.moduleDriveFileId || null,
    moduleFileName: input.moduleFileName || null,
  };
}

async function assertNotHoliday(classId: string, scheduledDate: string) {
  const supabase = createClient();
  const { data: cls, error } = await supabase
    .from("classes")
    .select("schoolId")
    .eq("id", classId)
    .single();
  if (error) throw error;

  const schoolId = (cls as { schoolId: string }).schoolId;
  if (await isHoliday(scheduledDate, schoolId)) {
    throw new Error("Tanggal ini adalah hari libur, tidak bisa membuat lesson plan");
  }
}

export async function createLessonPlan(
  input: LessonPlanInput,
  createdByTeacherId: string,
) {
  await assertNotHoliday(input.classId, input.scheduledDate);

  const supabase = createClient();
  const { error } = await supabase
    .from("lesson_plans")
    .insert({ ...toPayload(input), createdByTeacherId });
  if (error) throw error;
}

export async function updateLessonPlan(id: string, input: LessonPlanInput) {
  await assertNotHoliday(input.classId, input.scheduledDate);

  const supabase = createClient();
  const { error } = await supabase
    .from("lesson_plans")
    .update(toPayload(input))
    .eq("id", id);
  if (error) throw error;
}
