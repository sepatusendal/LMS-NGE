export interface ClassStatusRow {
  classId: string;
  className: string;
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
  attendanceTotal: number;
  attendancePresent: number;
  isOverdueCheckIn: boolean;
  isReportMissing: boolean;
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
