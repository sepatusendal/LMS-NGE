import { createClient } from "@/lib/supabase/client";
import type { TeachingReport, ReportObjectiveInput } from "./schema";

export interface ReportPageContext {
  classId: string;
  className: string;
  meetingNumber: number;
  topic: string;
  scheduledDate: string;
  learningObjectives: string[];
  curriculumReportFormat: "STANDARD" | "ALBRIGHT";
}

function toOne<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/** Everything the report page needs about a meeting besides the report
 * itself (used both right after check-out in the live wizard, and when
 * editing a past meeting's report from a class's "Riwayat" tab). */
export async function fetchReportPageContext(meetingId: string): Promise<ReportPageContext> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select(
      "lesson_plans(classId, meetingNumber, topic, scheduledDate, learningObjectives, classes(name, curriculums(reportFormat)))",
    )
    .eq("id", meetingId)
    .single();
  if (error) throw error;

  type ClassRow = { name: string; curriculums: { reportFormat: "STANDARD" | "ALBRIGHT" } | { reportFormat: "STANDARD" | "ALBRIGHT" }[] | null };
  type LessonPlanRow = {
    classId: string;
    meetingNumber: number;
    topic: string;
    scheduledDate: string;
    learningObjectives: string[] | null;
    classes: ClassRow | ClassRow[] | null;
  };
  const lp = toOne((data as unknown as { lesson_plans: LessonPlanRow | LessonPlanRow[] | null }).lesson_plans);
  if (!lp) throw new Error("Meeting has no lesson plan");
  const cls = toOne(lp.classes);
  const curriculum = toOne(cls?.curriculums ?? null);

  return {
    classId: lp.classId,
    className: cls?.name ?? "-",
    meetingNumber: lp.meetingNumber,
    topic: lp.topic,
    scheduledDate: lp.scheduledDate,
    learningObjectives: lp.learningObjectives ?? [],
    curriculumReportFormat: curriculum?.reportFormat ?? "STANDARD",
  };
}

export async function fetchReport(meetingId: string): Promise<TeachingReport | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teaching_reports")
    .select(
      "*, objectives:report_learning_objectives(objectiveText, achieved), followUps:student_follow_ups(studentId, note, students(fullName))",
    )
    .eq("meetingId", meetingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  type RawFollowUp = { studentId: string; note: string; students: { fullName: string } | { fullName: string }[] | null };
  const raw = data as unknown as Omit<TeachingReport, "followUps"> & { followUps: RawFollowUp[] };
  return {
    ...raw,
    followUps: raw.followUps.map((f) => ({
      studentId: f.studentId,
      note: f.note,
      studentName: toOne(f.students)?.fullName ?? "-",
    })),
  };
}

export async function createReport(input: {
  meetingId: string;
  originalTeacherId: string;
  skills: string[];
  objectives: ReportObjectiveInput[];
  whatWentWell?: string;
  whatNeedsImprovement?: string;
  actionPlan?: string;
  nextLessonNotes?: string;
  homeworkAssigned?: string;
  languageSkillsFocus?: string;
  activitiesLog?: string;
  resourcesUsed?: string;
  photoDriveFileId?: string;
  photoFileName?: string;
  followUps: { studentId: string; note: string }[];
}) {
  const supabase = createClient();

  // All 4 writes (report, follow-ups, progress records, meeting status)
  // happen atomically inside this single Postgres function call — see
  // prisma/migrations/20260807010000_create_report_atomic. If any step
  // fails, the whole call rolls back, so we never end up with orphaned
  // report/follow-up/progress rows or a meeting stuck mid-workflow.
  const { error } = await supabase.rpc("create_teaching_report", {
    p_meeting_id: input.meetingId,
    p_original_teacher_id: input.originalTeacherId,
    p_skills: input.skills,
    p_what_went_well: input.whatWentWell || null,
    p_what_needs_improvement: input.whatNeedsImprovement || null,
    p_next_lesson_notes: input.nextLessonNotes || null,
    p_homework_assigned: input.homeworkAssigned || null,
    p_photo_drive_file_id: input.photoDriveFileId || null,
    p_photo_file_name: input.photoFileName || null,
    p_follow_ups: input.followUps.map((f) => ({ studentId: f.studentId, note: f.note })),
    p_objectives: input.objectives.map((o) => ({ text: o.text, achieved: o.achieved })),
    p_action_plan: input.actionPlan || null,
    p_language_skills_focus: input.languageSkillsFocus || null,
    p_activities_log: input.activitiesLog || null,
    p_resources_used: input.resourcesUsed || null,
  });
  if (error) throw error;
}

/** Edits an existing report — allowed for 7 days from the meeting's
 * scheduledDate (RLS-enforced; see update_teaching_report() in
 * 20260911020000_editable_reports_and_draft_plans). Does not touch
 * progress_records or meeting status, both already set from the original
 * submission. Rejects with "REPORT_EDIT_NOT_ALLOWED" once the window (or
 * ownership) doesn't check out — the RLS UPDATE matching zero rows raises
 * that inside the function rather than silently no-op-ing. */
export async function updateReport(
  reportId: string,
  input: {
    skills: string[];
    objectives: ReportObjectiveInput[];
    whatWentWell?: string;
    whatNeedsImprovement?: string;
    actionPlan?: string;
    nextLessonNotes?: string;
    homeworkAssigned?: string;
    languageSkillsFocus?: string;
    activitiesLog?: string;
    resourcesUsed?: string;
    photoDriveFileId?: string;
    photoFileName?: string;
    followUps: { studentId: string; note: string }[];
  },
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("update_teaching_report", {
    p_report_id: reportId,
    p_skills: input.skills,
    p_what_went_well: input.whatWentWell || null,
    p_what_needs_improvement: input.whatNeedsImprovement || null,
    p_next_lesson_notes: input.nextLessonNotes || null,
    p_homework_assigned: input.homeworkAssigned || null,
    p_photo_drive_file_id: input.photoDriveFileId || null,
    p_photo_file_name: input.photoFileName || null,
    p_follow_ups: input.followUps.map((f) => ({ studentId: f.studentId, note: f.note })),
    p_objectives: input.objectives.map((o) => ({ text: o.text, achieved: o.achieved })),
    p_action_plan: input.actionPlan || null,
    p_language_skills_focus: input.languageSkillsFocus || null,
    p_activities_log: input.activitiesLog || null,
    p_resources_used: input.resourcesUsed || null,
  });
  if (error) throw error;
}
