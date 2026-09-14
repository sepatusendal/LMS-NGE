export interface ClassStatusRow {
  classId: string;
  className: string;
  classType: "REGULAR" | "TEACHER_TRAINING";
  schoolId: string;
  schoolName: string;
  teacherId: string;
  teacherName: string;
  room: string | null;
  scheduleStartTime: string;
  scheduleEndTime: string;
  lessonPlanId: string | null;
  meetingNumber: number;
  topic: string;
  hasLessonPlan: boolean;
  meetingId: string | null;
  meetingStatus: "not_started" | "checked_in" | "attendance_done" | "checked_out" | "report_submitted";
  checkInTime: string | null;
  checkOutTime: string | null;
  isLate: boolean | null;
  isSubstitute: boolean;
  isTeacherSwapped: boolean;
  originalTeacherName: string | null;
  substituteTeacherName: string | null;
  substituteReason: string | null;
  attendanceTotal: number;
  attendancePresent: number;
  isOverdueCheckIn: boolean;
  isReportMissing: boolean;
  isHoliday: boolean;
  /** True when this meeting was backfilled by an admin (or its check-in/out
   * was) rather than started by the tutor — see 20260915000000. */
  isAdminEntered: boolean;
}

/** One row per tutor whose recent pattern suggests they aren't using the
 * LMS at all (as opposed to Status Board's "late today") — see
 * fetchDormantTutors(). */
export interface DormantTutorRow {
  teacherId: string;
  teacherName: string;
  classNames: string[];
  expectedSessions: number;
  missedSessions: number;
  /** Most recent scheduledDate this teacher has ever authored a lesson plan
   * for, within the lookback window queried — null means none found in that
   * window (effectively "never"). */
  lastActiveDate: string | null;
}

export interface AnalyticsPoint {
  date: string;
  scheduledCount: number;
  completedCount: number;
  completionRate: number;
  attendanceTotal: number;
  attendancePresent: number;
  attendanceRate: number;
}
