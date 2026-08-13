// Admin-only correction tools for the daily teaching workflow. Check-ins,
// check-outs, and teaching reports are intentionally insert-only/immutable
// for teachers (context.md 5.1–5.4 — one per meeting, audit trail) with no
// `deletedAt` column at all, so "delete" here is a real hard delete, not a
// soft one. RLS already grants ADMIN unrestricted access to these tables;
// this file is the missing application layer, not a permissions change.
import { createClient } from "@/lib/supabase/client";

export interface MeetingAdminDetail {
  meetingId: string;
  meetingStatus: string;
  checkIn: {
    id: string;
    checkInTime: string;
    isLate: boolean;
    notes: string | null;
  } | null;
  checkOut: {
    id: string;
    checkOutTime: string;
    durationMinutes: number;
    notes: string | null;
  } | null;
  report: {
    id: string;
    actualTeachingDate: string;
    skills: string[];
    objectivesAchieved: string | null;
    whatWentWell: string | null;
    whatNeedsImprovement: string | null;
    nextLessonNotes: string | null;
    homeworkAssigned: string | null;
    summary: string | null;
  } | null;
  attendanceCount: number;
}

export async function fetchMeetingAdminDetail(meetingId: string): Promise<MeetingAdminDetail> {
  const supabase = createClient();
  const [{ data: meeting, error: meetingError }, { count: attendanceCount }] = await Promise.all([
    supabase
      .from("meetings")
      .select(`
        id, status,
        checkIn:check_ins(id, checkInTime, isLate, notes),
        checkOut:check_outs(id, checkOutTime, durationMinutes, notes),
        teachingReport:teaching_reports(id, actualTeachingDate, skills, objectivesAchieved, whatWentWell, whatNeedsImprovement, nextLessonNotes, homeworkAssigned, summary)
      `)
      .eq("id", meetingId)
      .single(),
    supabase
      .from("attendances")
      .select("*", { count: "exact", head: true })
      .eq("meetingId", meetingId),
  ]);
  if (meetingError) throw meetingError;

  type ToOne<T> = T | T[] | null;
  const toOne = <T,>(rel: ToOne<T>): T | null => (Array.isArray(rel) ? (rel[0] ?? null) : rel);

  const row = meeting as unknown as {
    id: string;
    status: string;
    checkIn: ToOne<{ id: string; checkInTime: string; isLate: boolean; notes: string | null }>;
    checkOut: ToOne<{ id: string; checkOutTime: string; durationMinutes: number; notes: string | null }>;
    teachingReport: ToOne<{
      id: string;
      actualTeachingDate: string;
      skills: string[];
      objectivesAchieved: string | null;
      whatWentWell: string | null;
      whatNeedsImprovement: string | null;
      nextLessonNotes: string | null;
      homeworkAssigned: string | null;
      summary: string | null;
    }>;
  };

  return {
    meetingId: row.id,
    meetingStatus: row.status,
    checkIn: toOne(row.checkIn),
    checkOut: toOne(row.checkOut),
    report: toOne(row.teachingReport),
    attendanceCount: attendanceCount ?? 0,
  };
}

export interface CheckInUpdate {
  checkInTime: string;
  isLate: boolean;
  notes: string;
}

export async function updateCheckInAdmin(id: string, input: CheckInUpdate) {
  const supabase = createClient();
  const { error } = await supabase
    .from("check_ins")
    .update({
      checkInTime: input.checkInTime,
      isLate: input.isLate,
      notes: input.notes || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCheckInAdmin(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("check_ins").delete().eq("id", id);
  if (error) throw error;
}

export interface CheckOutUpdate {
  checkOutTime: string;
  durationMinutes: number;
  notes: string;
}

export async function updateCheckOutAdmin(id: string, input: CheckOutUpdate) {
  const supabase = createClient();
  const { error } = await supabase
    .from("check_outs")
    .update({
      checkOutTime: input.checkOutTime,
      durationMinutes: input.durationMinutes,
      notes: input.notes || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCheckOutAdmin(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("check_outs").delete().eq("id", id);
  if (error) throw error;
}

export interface TeachingReportUpdate {
  actualTeachingDate: string;
  skills: string[];
  objectivesAchieved: string;
  whatWentWell: string;
  whatNeedsImprovement: string;
  nextLessonNotes: string;
  homeworkAssigned: string;
  summary: string;
}

export async function updateTeachingReportAdmin(id: string, input: TeachingReportUpdate) {
  const supabase = createClient();
  const { error } = await supabase
    .from("teaching_reports")
    .update({
      actualTeachingDate: input.actualTeachingDate,
      skills: input.skills,
      objectivesAchieved: input.objectivesAchieved || null,
      whatWentWell: input.whatWentWell || null,
      whatNeedsImprovement: input.whatNeedsImprovement || null,
      nextLessonNotes: input.nextLessonNotes || null,
      homeworkAssigned: input.homeworkAssigned || null,
      summary: input.summary || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTeachingReportAdmin(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("teaching_reports").delete().eq("id", id);
  if (error) throw error;
}

/** Deletes the meeting's check-in, check-out, attendances, and report (if
 * any) and resets status back to SCHEDULED — lets the tutor redo the whole
 * meeting from scratch. */
export async function resetMeetingAdmin(meetingId: string) {
  const supabase = createClient();
  const [checkInRes, checkOutRes, attendanceRes, reportRes] = await Promise.all([
    supabase.from("check_ins").delete().eq("meetingId", meetingId),
    supabase.from("check_outs").delete().eq("meetingId", meetingId),
    supabase.from("attendances").delete().eq("meetingId", meetingId),
    supabase.from("teaching_reports").delete().eq("meetingId", meetingId),
  ]);
  for (const res of [checkInRes, checkOutRes, attendanceRes, reportRes]) {
    if (res.error) throw res.error;
  }

  const { error: statusError } = await supabase
    .from("meetings")
    .update({ status: "SCHEDULED" })
    .eq("id", meetingId);
  if (statusError) throw statusError;
}
