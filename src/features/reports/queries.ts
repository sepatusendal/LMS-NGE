import { createClient } from "@/lib/supabase/client";
import type { TeachingReport, ObjectivesAchieved } from "./schema";

export async function fetchReport(meetingId: string): Promise<TeachingReport | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teaching_reports")
    .select("*")
    .eq("meetingId", meetingId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as unknown as TeachingReport;
}

export async function createReport(input: {
  meetingId: string;
  originalTeacherId: string;
  skills: string[];
  objectivesAchieved?: ObjectivesAchieved;
  whatWentWell?: string;
  whatNeedsImprovement?: string;
  nextLessonNotes?: string;
  homeworkAssigned?: string;
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
    p_objectives_achieved: input.objectivesAchieved || null,
    p_what_went_well: input.whatWentWell || null,
    p_what_needs_improvement: input.whatNeedsImprovement || null,
    p_next_lesson_notes: input.nextLessonNotes || null,
    p_homework_assigned: input.homeworkAssigned || null,
    p_photo_drive_file_id: input.photoDriveFileId || null,
    p_photo_file_name: input.photoFileName || null,
    p_follow_ups: input.followUps.map((f) => ({ studentId: f.studentId, note: f.note })),
  });
  if (error) throw error;
}
