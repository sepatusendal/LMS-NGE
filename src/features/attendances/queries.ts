import { createClient } from "@/lib/supabase/client";
import type { Attendance, AttendanceInput, BulkAttendanceInput } from "./schema";

interface AttendanceRow {
  id: string;
  meetingId: string;
  studentId: string;
  status: string;
  notes: string | null;
  students: { fullName: string; nis: string | null } | null;
}

const SELECT = `id, meetingId, studentId, status, notes, students(fullName, nis)`;

function mapRow(row: AttendanceRow): Attendance {
  return {
    id: row.id,
    meetingId: row.meetingId,
    studentId: row.studentId,
    studentName: row.students?.fullName ?? "-",
    nis: row.students?.nis ?? null,
    status: row.status,
    notes: row.notes,
  };
}

export async function fetchAttendances(meetingId: string): Promise<Attendance[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("attendances")
    .select(SELECT)
    .eq("meetingId", meetingId)
    .order("createdAt");
  if (error) throw error;
  return (data as unknown as AttendanceRow[]).map(mapRow);
}

export async function upsertAttendance(input: AttendanceInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from("attendances")
    .upsert({
      meetingId: input.meetingId,
      studentId: input.studentId,
      status: input.status,
      notes: input.notes ?? null,
    }, { onConflict: "meetingId, studentId" });
  if (error) throw error;
}

/** Submits the roster's attendance AND checks the teacher out in one atomic
 * call — collapses what used to be two separate manual steps ("Simpan
 * Absensi" then a separate "Check-out") into the single action a teacher
 * actually thinks of as "I'm done with this class". Duration is computed
 * server-side from check_ins.checkInTime. See
 * submit_attendance_and_checkout() in
 * 20260911020000_editable_reports_and_draft_plans. Returns the computed
 * duration in minutes. */
export async function submitAttendanceAndCheckout(
  input: BulkAttendanceInput & { teacherId: string; notes?: string },
): Promise<number> {
  const supabase = createClient();
  const entries = input.entries.map((e) => ({
    studentId: e.studentId,
    status: e.status,
    notes: e.notes ?? null,
  }));
  const { data, error } = await supabase.rpc("submit_attendance_and_checkout", {
    p_meeting_id: input.meetingId,
    p_teacher_id: input.teacherId,
    p_entries: entries,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as number;
}
