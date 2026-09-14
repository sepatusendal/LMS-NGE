import { createClient } from "@/lib/supabase/client";

export interface BackfillMeetingInput {
  classId: string;
  actualTeacherId: string;
  scheduledDate: string;
  topic: string;
  learningObjectives: string[];
  checkInTime: string | null;
  isLate: boolean;
  checkOutTime: string | null;
  attendance: { studentId: string; status: string; notes?: string }[];
  adminNote: string;
}

/** Creates an entire session (draft lesson plan + meeting + check-in +
 * check-out + attendance) in one atomic call, for a class/date the tutor
 * never touched at all — see backfill_meeting_admin() in
 * prisma/migrations/20260915000000_admin_backfill_audit_trail. Deliberately
 * does NOT also create the teaching report: once this returns a real
 * meetingId, the normal ReportForm flow (already admin-aware, see
 * report-form.tsx's adminOverride) handles that with full field parity
 * instead of duplicating report fields here. Returns the new meetingId. */
export async function backfillMeetingAdmin(input: BackfillMeetingInput): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("backfill_meeting_admin", {
    p_class_id: input.classId,
    p_actual_teacher_id: input.actualTeacherId,
    p_scheduled_date: input.scheduledDate,
    p_topic: input.topic,
    p_learning_objectives: input.learningObjectives,
    p_check_in_time: input.checkInTime,
    p_is_late: input.isLate,
    p_check_out_time: input.checkOutTime,
    p_attendance: input.attendance,
    p_admin_note: input.adminNote || null,
  });
  if (error) throw error;
  return data as string;
}
