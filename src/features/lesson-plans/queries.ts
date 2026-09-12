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
  isDraft: boolean;
  classes: { name: string } | null;
  createdByTeacher: { users: { fullName: string } | { fullName: string }[] | null } | { users: { fullName: string } | { fullName: string }[] | null }[] | null;
}

const SELECT = `
  id, classId, meetingNumber, week, scheduledDate, level, topic,
  learningObjectives, skills, method, procedure, materialsRequired,
  vocabularyFocus, stages, questionsToAsk, differentiationSupport,
  differentiationExtension, differentiationHomework, moduleDriveFileId,
  moduleFileName, createdAt, isDraft,
  classes(name),
  createdByTeacher:teachers!lesson_plans_createdByTeacherId_fkey(users(fullName))
`;

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

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
    createdByTeacherName: toOne(toOne(row.createdByTeacher)?.users)?.fullName ?? "-",
    createdAt: row.createdAt,
    isDraft: row.isDraft,
  };
}

/** Creates a placeholder ("draft") lesson plan for the next meeting slot a
 * class doesn't have one for yet — the admin-side counterpart to
 * check_in_with_draft_plan() (see 20260911020000_editable_reports_and_draft_plans),
 * used when assigning a substitute for a class that has no lesson plan at
 * all yet (e.g. the absent teacher hadn't written one, and admins mark
 * absences before anyone would ever have checked in). `createdByTeacherId`
 * is attributed to the class's normal teacher, not the admin — admins have
 * no Teacher record of their own, same convention as adminMode in
 * LessonPlanForm. Admin bypasses the teacher_insert_own_lesson_plans RLS
 * policy via admin_all_lesson_plans, so no special DB function is needed
 * here (unlike the teacher-facing RPC, which has to satisfy RLS as the
 * calling teacher). */
export async function createDraftLessonPlan(
  classId: string,
  createdByTeacherId: string,
  scheduledDate: string,
): Promise<string> {
  const supabase = createClient();
  const { data: existing, error: existingErr } = await supabase
    .from("lesson_plans")
    .select("meetingNumber")
    .eq("classId", classId)
    .is("deletedAt", null)
    .order("meetingNumber", { ascending: false })
    .limit(1);
  if (existingErr) throw existingErr;
  const nextNumber = ((existing?.[0] as { meetingNumber: number } | undefined)?.meetingNumber ?? 0) + 1;

  const { data, error } = await supabase
    .from("lesson_plans")
    .insert({
      classId,
      createdByTeacherId,
      meetingNumber: nextNumber,
      week: Math.ceil(nextNumber / 2),
      scheduledDate,
      topic: "(Belum diisi)",
      isDraft: true,
    })
    .select("id")
    .single();
  if (error) throw mapLessonPlanWriteError(error);
  return (data as { id: string }).id;
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
    .is("deletedAt", null)
    .single();
  if (error) throw error;
  return mapRow(data as unknown as LessonPlanRow);
}

function toPayload(input: LessonPlanInput) {
  return {
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
    // A teacher who opens and saves the form is no longer leaving this as a
    // placeholder — clears the "draft" flag check_in_with_draft_plan() sets
    // (harmless to set on an already-non-draft plan).
    isDraft: false,
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
    throw new Error("HOLIDAY_NO_LESSON_PLAN");
  }
}

/** Remap raw DB errors from a lesson-plan write into something a teacher can
 * act on: (classId, meetingNumber) uniqueness violations, and RLS rejecting
 * the insert outright (e.g. a teacher who isn't the class's primary teacher
 * and has no class_temporary_schedules row for the chosen date — a real
 * support case we hit with a Jadwal Sementara substitute picking the wrong
 * date). Without this, the teacher sees a raw
 * 'new row violates row-level security policy' message. */
function mapLessonPlanWriteError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("DUPLICATE_MEETING_NUMBER");
  }
  if (error.code === "42501") {
    return new Error("NOT_AUTHORIZED_FOR_CLASS");
  }
  return error instanceof Error ? error : new Error(error.message);
}

export async function createLessonPlan(
  input: LessonPlanInput,
  createdByTeacherId: string,
) {
  await assertNotHoliday(input.classId, input.scheduledDate);

  const supabase = createClient();
  const { error } = await supabase
    .from("lesson_plans")
    .insert({ ...toPayload(input), classId: input.classId, createdByTeacherId });
  if (error) throw mapLessonPlanWriteError(error);
}

// `classId` is intentionally excluded from the update payload — RLS's
// update WITH CHECK only re-validates createdByTeacherId, not classId, so a
// crafted update could otherwise reparent the plan to a class the teacher
// doesn't own. classId is immutable after creation at the app layer (the
// form also renders it read-only in edit mode).
export async function updateLessonPlan(id: string, input: LessonPlanInput) {
  await assertNotHoliday(input.classId, input.scheduledDate);

  const supabase = createClient();
  // .select() so we can tell "RLS silently matched 0 rows" (edit window
  // expired, or not the owner) apart from a real success — a plain
  // .update() with no .select() reports neither as an error.
  const { data, error } = await supabase
    .from("lesson_plans")
    .update(toPayload(input))
    .eq("id", id)
    .select("id");
  if (error) throw mapLessonPlanWriteError(error);
  if (!data || data.length === 0) throw new Error("EDIT_WINDOW_EXPIRED");
}

/** Admin-only — teachers have no delete path for lesson plans by design.
 * Soft delete: RLS allows admin writes, and the meeting/report chain (if
 * any) already references lessonPlanId, so this is left as a soft delete
 * rather than cascading a hard delete through meetings/check-ins/reports. */
export async function deleteLessonPlan(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("lesson_plans")
    .update({ deletedAt: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
