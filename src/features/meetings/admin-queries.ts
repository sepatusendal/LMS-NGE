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
  /** True when this whole meeting was backfilled by an admin via
   * backfill_meeting_admin() — see 20260915000000 — rather than started by
   * the tutor's own check-in. Drives the "Diisi Admin" badges on the
   * check-in/check-out sections below (those two tables don't carry their
   * own copy of the flag). */
  isAdminEntered: boolean;
  adminNote: string | null;
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
  reportId: string | null;
  attendanceCount: number;
}

export async function fetchMeetingAdminDetail(meetingId: string): Promise<MeetingAdminDetail> {
  const supabase = createClient();
  const [{ data: meeting, error: meetingError }, { count: attendanceCount }] = await Promise.all([
    supabase
      .from("meetings")
      .select(`
        id, status, "isAdminEntered", "adminNote",
        checkIn:check_ins(id, checkInTime, isLate, notes),
        checkOut:check_outs(id, checkOutTime, durationMinutes, notes),
        teachingReport:teaching_reports(id)
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
    isAdminEntered: boolean;
    adminNote: string | null;
    checkIn: ToOne<{ id: string; checkInTime: string; isLate: boolean; notes: string | null }>;
    checkOut: ToOne<{ id: string; checkOutTime: string; durationMinutes: number; notes: string | null }>;
    teachingReport: ToOne<{ id: string }>;
  };

  return {
    meetingId: row.id,
    meetingStatus: row.status,
    isAdminEntered: row.isAdminEntered,
    adminNote: row.adminNote,
    checkIn: toOne(row.checkIn),
    checkOut: toOne(row.checkOut),
    reportId: toOne(row.teachingReport)?.id ?? null,
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

// Runs atomically inside delete_check_in_admin() (20260915100000) — refuses
// the delete (CHECKOUT_EXISTS) when a check-out already exists for the same
// meeting. check_ins/check_outs have no FK to each other, so deleting only
// the check-in would leave a meeting that reads as "checked out" with no
// check-in at all: hasCheckOut is checked before hasCheckIn everywhere
// meetingStatus is derived, so the tutor's own /absensi card would show the
// "Check-out" badge with no check-in time shown. Use "Reset Meeting" for a
// meeting that already has a check-out.
export async function deleteCheckInAdmin(id: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_check_in_admin", { p_check_in_id: id });
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

// Runs atomically inside delete_check_out_admin() (20260916010000) — refuses
// the delete (REPORT_EXISTS) when a teaching report already exists for the
// same meeting. Deleting the check-out alone would leave a meeting that
// reads as fully COMPLETED (report on file) with no check-out/duration at
// all. Use "Reset Meeting" for a meeting that already has a report.
export async function deleteCheckOutAdmin(id: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_check_out_admin", { p_check_out_id: id });
  if (error) throw error;
}

// Report edits now go through ReportForm (features/meetings/report-form.tsx)
// -> update_teaching_report()/create_teaching_report() RPCs directly, for
// full field parity with the tutor's own form — see 20260915000000's admin
// bypass. This file keeps only delete, which has no RPC equivalent.

// Runs atomically inside delete_teaching_report_admin() (20260915090000) —
// report_learning_objectives/student_follow_ups/progress_records all
// reference teachingReportId with no ON DELETE CASCADE, so a plain delete
// on teaching_reports directly fails with a foreign-key violation for any
// report that has them (any report with at least one present student).
export async function deleteTeachingReportAdmin(id: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_teaching_report_admin", { p_report_id: id });
  if (error) throw error;
}

/** Deletes the meeting's check-in, check-out, attendances, and report (if
 * any) and resets status back to SCHEDULED — lets the tutor redo the whole
 * meeting from scratch. Runs atomically inside reset_meeting_admin()
 * (20260915070000) — the previous 5-separate-calls version could leave the
 * meeting stuck "COMPLETED" with its child rows already gone if any one
 * step failed partway. */
export async function resetMeetingAdmin(meetingId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("reset_meeting_admin", { p_meeting_id: meetingId });
  if (error) throw error;
}
