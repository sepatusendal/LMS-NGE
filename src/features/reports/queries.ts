import { createClient } from "@/lib/supabase/client";
import type { TeachingReport } from "./schema";

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
  objectivesAchieved?: string;
  whatWentWell?: string;
  whatNeedsImprovement?: string;
  nextLessonNotes?: string;
  homeworkAssigned?: string;
  followUps: { studentId: string; note: string }[];
}) {
  const supabase = createClient();

  const { data: meeting, error: meetErr } = await supabase
    .from("meetings")
    .select("assignedTeacherId")
    .eq("id", input.meetingId)
    .single();
  if (meetErr) throw meetErr;

  const isSubstitute =
    input.originalTeacherId !== (meeting as { assignedTeacherId: string }).assignedTeacherId;

  const { data: report, error: reportErr } = await supabase
    .from("teaching_reports")
    .insert({
      meetingId: input.meetingId,
      originalTeacherId: (meeting as { assignedTeacherId: string }).assignedTeacherId,
      substituteTeacherId: isSubstitute ? input.originalTeacherId : null,
      actualTeachingDate: new Date().toISOString().slice(0, 10),
      skills: input.skills,
      objectivesAchieved: input.objectivesAchieved || null,
      whatWentWell: input.whatWentWell || null,
      whatNeedsImprovement: input.whatNeedsImprovement || null,
      nextLessonNotes: input.nextLessonNotes || null,
      homeworkAssigned: input.homeworkAssigned || null,
    })
    .select("id")
    .single();
  if (reportErr) throw reportErr;

  if (input.followUps.length > 0) {
    const rows = input.followUps.map((f) => ({
      teachingReportId: (report as { id: string }).id,
      studentId: f.studentId,
      note: f.note,
    }));
    const { error: fuErr } = await supabase.from("student_follow_ups").insert(rows);
    if (fuErr) throw fuErr;
  }

  await supabase
    .from("meetings")
    .update({ status: "COMPLETED" })
    .eq("id", input.meetingId);
}
