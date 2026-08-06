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

export async function bulkUpsertAttendance(input: BulkAttendanceInput) {
  const supabase = createClient();
  const rows = input.entries.map((e) => ({
    meetingId: input.meetingId,
    studentId: e.studentId,
    status: e.status,
    notes: e.notes ?? null,
  }));
  const { error } = await supabase.from("attendances").upsert(rows, {
    onConflict: "meetingId, studentId",
  });
  if (error) throw error;
}
