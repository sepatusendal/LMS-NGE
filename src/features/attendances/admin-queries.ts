import { createClient } from "@/lib/supabase/client";

export interface StudentAbsence {
  meetingId: string;
  meetingNumber: number;
  topic: string;
  scheduledDate: string;
  status: "ABSENT" | "EXCUSED";
}

export interface StudentAttendanceSummary {
  studentId: string;
  studentName: string;
  nis: string | null;
  present: number;
  late: number;
  excused: number;
  absent: number;
  totalMeetings: number;
  attendanceRate: number;
  absences: StudentAbsence[];
}

interface MeetingRow {
  id: string;
  lessonPlanId: string;
}

interface LessonPlanRow {
  id: string;
  meetingNumber: number;
  topic: string;
  scheduledDate: string;
}

interface AttendanceRow {
  meetingId: string;
  studentId: string;
  status: string;
  students: { fullName: string; nis: string | null } | null;
}

/** Per-student attendance breakdown for a class, across every meeting that
 * has attendance recorded so far — lets admin/coordinator spot students who
 * are frequently absent without opening each meeting individually. */
export async function fetchClassAttendanceSummary(
  classId: string,
): Promise<StudentAttendanceSummary[]> {
  const supabase = createClient();

  const { data: lessonPlans, error: lpErr } = await supabase
    .from("lesson_plans")
    .select("id, meetingNumber, topic, scheduledDate")
    .eq("classId", classId)
    .is("deletedAt", null);
  if (lpErr) throw lpErr;
  const lpById = new Map(
    (lessonPlans as unknown as LessonPlanRow[]).map((lp) => [lp.id, lp]),
  );
  if (lpById.size === 0) return [];

  const { data: meetings, error: meetErr } = await supabase
    .from("meetings")
    .select("id, lessonPlanId")
    .in("lessonPlanId", [...lpById.keys()]);
  if (meetErr) throw meetErr;
  const lpByMeeting = new Map(
    (meetings as unknown as MeetingRow[]).map((m) => [m.id, lpById.get(m.lessonPlanId)]),
  );
  const meetingIds = [...lpByMeeting.keys()];
  if (meetingIds.length === 0) return [];

  const { data: attendances, error: attErr } = await supabase
    .from("attendances")
    .select("meetingId, studentId, status, students(fullName, nis)")
    .in("meetingId", meetingIds);
  if (attErr) throw attErr;

  const byStudent = new Map<string, StudentAttendanceSummary>();
  (attendances as unknown as AttendanceRow[]).forEach((a) => {
    const lp = lpByMeeting.get(a.meetingId);
    let entry = byStudent.get(a.studentId);
    if (!entry) {
      entry = {
        studentId: a.studentId,
        studentName: a.students?.fullName ?? "-",
        nis: a.students?.nis ?? null,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        totalMeetings: 0,
        attendanceRate: 0,
        absences: [],
      };
      byStudent.set(a.studentId, entry);
    }
    entry.totalMeetings += 1;
    if (a.status === "PRESENT") entry.present += 1;
    else if (a.status === "LATE") entry.late += 1;
    else if (a.status === "EXCUSED") entry.excused += 1;
    else if (a.status === "ABSENT") entry.absent += 1;

    if ((a.status === "ABSENT" || a.status === "EXCUSED") && lp) {
      entry.absences.push({
        meetingId: a.meetingId,
        meetingNumber: lp.meetingNumber,
        topic: lp.topic,
        scheduledDate: lp.scheduledDate,
        status: a.status as "ABSENT" | "EXCUSED",
      });
    }
  });

  return [...byStudent.values()]
    .map((s) => ({
      ...s,
      attendanceRate: s.totalMeetings > 0 ? (s.present + s.late) / s.totalMeetings : 0,
      absences: s.absences.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate)),
    }))
    .sort((a, b) => b.absent - a.absent || a.studentName.localeCompare(b.studentName));
}
