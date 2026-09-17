import { z } from "zod";

export const analyticsFiltersSchema = z.object({
  dateFrom: z.string().min(1),
  dateTo: z.string().min(1),
  schoolId: z.string().optional(),
  classId: z.string().optional(),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
});

export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;

export interface AnalyticsColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
}

export const TUTOR_ATTENDANCE_COLUMNS: AnalyticsColumnDef[] = [
  { key: "date", label: "Date", defaultVisible: true },
  { key: "teacher", label: "Teacher", defaultVisible: true },
  { key: "school", label: "School", defaultVisible: true },
  { key: "class", label: "Class", defaultVisible: true },
  { key: "meetingNumber", label: "Meeting", defaultVisible: true },
  { key: "scheduledTime", label: "Scheduled Time", defaultVisible: true },
  { key: "checkInTime", label: "Check-in Time", defaultVisible: true },
  { key: "isLate", label: "Late", defaultVisible: true },
  { key: "hasPhoto", label: "Check-in Photo", defaultVisible: false },
  { key: "checkOutTime", label: "Check-out Time", defaultVisible: true },
  { key: "durationMinutes", label: "Duration (min)", defaultVisible: false },
  { key: "isSubstitute", label: "Substitute", defaultVisible: true },
  { key: "coveringFor", label: "Covering For", defaultVisible: true },
  { key: "notes", label: "Notes", defaultVisible: false },
];

export const STUDENT_ATTENDANCE_COLUMNS: AnalyticsColumnDef[] = [
  { key: "date", label: "Date", defaultVisible: true },
  { key: "school", label: "School", defaultVisible: true },
  { key: "class", label: "Class", defaultVisible: true },
  { key: "meetingNumber", label: "Meeting", defaultVisible: true },
  { key: "student", label: "Student", defaultVisible: true },
  { key: "nis", label: "NIS", defaultVisible: false },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "notes", label: "Notes", defaultVisible: false },
];

export const STUDENT_ATTENDANCE_SUMMARY_COLUMNS: AnalyticsColumnDef[] = [
  { key: "student", label: "Student", defaultVisible: true },
  { key: "nis", label: "NIS", defaultVisible: false },
  { key: "present", label: "Present", defaultVisible: true },
  { key: "late", label: "Late", defaultVisible: true },
  { key: "excused", label: "Excused", defaultVisible: true },
  { key: "absent", label: "Absent", defaultVisible: true },
  { key: "totalMeetings", label: "Total Meetings", defaultVisible: true },
  { key: "attendanceRate", label: "Attendance Rate", defaultVisible: true },
];

export const DAILY_TEACHING_REPORT_COLUMNS: AnalyticsColumnDef[] = [
  { key: "date", label: "Date", defaultVisible: true },
  { key: "school", label: "School", defaultVisible: true },
  { key: "class", label: "Class", defaultVisible: true },
  { key: "teacher", label: "Teacher", defaultVisible: true },
  { key: "substitute", label: "Substitute", defaultVisible: false },
  { key: "meetingNumber", label: "Meeting", defaultVisible: true },
  { key: "topic", label: "Topic", defaultVisible: true },
  { key: "skills", label: "Skills Taught", defaultVisible: false },
  { key: "attendance", label: "Attendance", defaultVisible: true },
  { key: "objectives", label: "Objectives Achieved", defaultVisible: true },
  { key: "summary", label: "Summary", defaultVisible: false },
];

export const LESSON_PLAN_COLUMNS: AnalyticsColumnDef[] = [
  { key: "date", label: "Scheduled Date", defaultVisible: true },
  { key: "school", label: "School", defaultVisible: true },
  { key: "class", label: "Class", defaultVisible: true },
  { key: "teacher", label: "Teacher", defaultVisible: true },
  { key: "meetingNumber", label: "Meeting", defaultVisible: true },
  { key: "topic", label: "Topic", defaultVisible: true },
  { key: "materialsRequired", label: "Materials Required", defaultVisible: false },
  { key: "vocabularyFocus", label: "Vocabulary Focus", defaultVisible: false },
  { key: "differentiationSupport", label: "Differentiation (Support)", defaultVisible: false },
  { key: "differentiationExtension", label: "Differentiation (Extension)", defaultVisible: false },
  { key: "differentiationHomework", label: "Differentiation (Homework)", defaultVisible: false },
  { key: "hasModule", label: "Module Attached", defaultVisible: true },
  { key: "isDraft", label: "Draft", defaultVisible: true },
  { key: "isAdminEntered", label: "Admin Entered", defaultVisible: false },
  { key: "compliant", label: "Compliant", defaultVisible: true },
];

export const CLASSES_REPORT_COLUMNS: AnalyticsColumnDef[] = [
  { key: "class", label: "Class", defaultVisible: true },
  { key: "school", label: "School", defaultVisible: true },
  { key: "teacher", label: "Teacher", defaultVisible: true },
  { key: "curriculum", label: "Curriculum", defaultVisible: true },
  { key: "schedule", label: "Schedule", defaultVisible: true },
  { key: "enrollment", label: "Enrollment", defaultVisible: true },
  { key: "attendanceRate", label: "Attendance Rate", defaultVisible: true },
  { key: "complianceRate", label: "Lesson Plan Compliance", defaultVisible: true },
  { key: "reportsFiled", label: "Reports Filed", defaultVisible: true },
  { key: "isActive", label: "Active", defaultVisible: true },
];

export function defaultVisibilityFor(columns: AnalyticsColumnDef[]): Record<string, boolean> {
  return Object.fromEntries(columns.map((c) => [c.key, c.defaultVisible]));
}
