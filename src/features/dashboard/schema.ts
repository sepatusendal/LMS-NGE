export interface TeacherAttendanceRow {
  teacherId: string;
  teacherName: string;
  totalSessions: number;
  onTimeCount: number;
  lateCount: number;
  onTimeRate: number;
}

export interface ReportDayPoint {
  date: string;
  submitted: number;
}

export interface ReportStats {
  totalCompletedMeetings: number;
  totalReportsSubmitted: number;
  previousReportsSubmitted: number;
  totalPendingReports: number;
  objectives: { label: string; value: number }[];
  trend: ReportDayPoint[];
}

export interface FollowUpRow {
  studentName: string;
  className: string;
  note: string;
  createdAt: string;
}

export interface ScheduleDayPoint {
  day: string;
  count: number;
}

export interface ReportNoteRow {
  className: string;
  note: string;
  date: string;
}
