import type { ExcelColumn } from "@/lib/export-excel";
import {
  CLASSES_REPORT_COLUMNS,
  DAILY_TEACHING_REPORT_COLUMNS,
  LESSON_PLAN_COLUMNS,
  STUDENT_ATTENDANCE_COLUMNS,
  TUTOR_ATTENDANCE_COLUMNS,
  type AnalyticsColumnDef,
} from "./schema";
import type {
  ClassesReportRow,
  LessonPlanReportRow,
  StudentAttendanceReportRow,
  StudentAttendanceSummaryRow,
  TutorAttendanceReportRow,
} from "./admin-queries";
import type { AdminReportListItem } from "@/features/reports/admin-queries";

type Translate = (key: string) => string;

function pick<T>(
  columns: AnalyticsColumnDef[],
  visibleKeys: Set<string>,
  t: Translate,
  widths: Record<string, number>,
  valueByKey: Record<string, (row: T) => string | number | null>,
): ExcelColumn<T>[] {
  return columns
    .filter((c) => visibleKeys.has(c.key))
    .filter((c) => valueByKey[c.key])
    .map((c) => ({ header: t(c.key), key: c.key, width: widths[c.key] ?? 20, value: valueByKey[c.key] }));
}

export function buildTutorAttendanceExportColumns(
  t: Translate,
  tCommon: Translate,
  formatDateTime: (d: string | null) => string,
  visibleKeys: Set<string>,
): ExcelColumn<TutorAttendanceReportRow>[] {
  return pick<TutorAttendanceReportRow>(
    TUTOR_ATTENDANCE_COLUMNS,
    visibleKeys,
    t,
    { class: 24, school: 22, notes: 30 },
    {
      date: (r) => r.date,
      teacher: (r) => r.teacherName,
      school: (r) => r.schoolName,
      class: (r) => r.className,
      meetingNumber: (r) => r.meetingNumber,
      scheduledTime: (r) => r.scheduledTime,
      checkInTime: (r) => formatDateTime(r.checkInTime),
      isLate: (r) => (r.isLate ? tCommon("yes") : tCommon("no")),
      hasPhoto: (r) => (r.hasPhoto ? tCommon("yes") : tCommon("no")),
      checkOutTime: (r) => formatDateTime(r.checkOutTime),
      durationMinutes: (r) => r.durationMinutes,
      isSubstitute: (r) => (r.isSubstitute ? tCommon("yes") : tCommon("no")),
      coveringFor: (r) => r.assignedTeacherName ?? "-",
      notes: (r) => r.notes ?? "-",
    },
  );
}

export function buildStudentAttendanceExportColumns(
  t: Translate,
  visibleKeys: Set<string>,
): ExcelColumn<StudentAttendanceReportRow>[] {
  return pick<StudentAttendanceReportRow>(
    STUDENT_ATTENDANCE_COLUMNS,
    visibleKeys,
    t,
    { class: 24, school: 22, student: 24, notes: 30 },
    {
      date: (r) => r.date,
      school: (r) => r.schoolName,
      class: (r) => r.className,
      meetingNumber: (r) => r.meetingNumber,
      student: (r) => r.studentName,
      nis: (r) => r.nis ?? "-",
      status: (r) => r.status,
      notes: (r) => r.notes ?? "-",
    },
  );
}

export function buildStudentAttendanceSummaryExportColumns(t: Translate): ExcelColumn<StudentAttendanceSummaryRow>[] {
  return [
    { header: t("student"), key: "student", width: 24, value: (r) => r.studentName },
    { header: t("nis"), key: "nis", width: 14, value: (r) => r.nis ?? "-" },
    { header: t("present"), key: "present", width: 10, value: (r) => r.present },
    { header: t("late"), key: "late", width: 10, value: (r) => r.late },
    { header: t("excused"), key: "excused", width: 10, value: (r) => r.excused },
    { header: t("absent"), key: "absent", width: 10, value: (r) => r.absent },
    { header: t("totalMeetings"), key: "totalMeetings", width: 14, value: (r) => r.totalMeetings },
    { header: t("attendanceRate"), key: "attendanceRate", width: 14, value: (r) => `${r.attendanceRate}%` },
  ];
}

export function buildDailyTeachingReportExportColumns(
  t: Translate,
  tCommon: Translate,
  formatDate: (d: string) => string,
  visibleKeys: Set<string>,
): ExcelColumn<AdminReportListItem>[] {
  return pick<AdminReportListItem>(
    DAILY_TEACHING_REPORT_COLUMNS,
    visibleKeys,
    t,
    { class: 24, school: 22, topic: 28, skills: 26, summary: 34 },
    {
      date: (r) => formatDate(r.actualTeachingDate),
      school: (r) => r.schoolName,
      class: (r) => r.className,
      teacher: (r) => r.teacherName,
      substitute: (r) => (r.isSubstitute ? tCommon("yes") : tCommon("no")),
      meetingNumber: (r) => r.meetingNumber,
      topic: (r) => r.topic,
      skills: (r) => (r.skills.length > 0 ? r.skills.join(", ") : "-"),
      attendance: (r) => (r.attendanceTotal > 0 ? `${r.attendancePresent}/${r.attendanceTotal}` : "-"),
      objectives: (r) => r.objectivesAchieved ?? "-",
      summary: (r) => r.summary ?? "-",
    },
  );
}

export function buildLessonPlanExportColumns(
  t: Translate,
  tCommon: Translate,
  formatDate: (d: string) => string,
  visibleKeys: Set<string>,
): ExcelColumn<LessonPlanReportRow>[] {
  return pick<LessonPlanReportRow>(
    LESSON_PLAN_COLUMNS,
    visibleKeys,
    t,
    { class: 24, school: 22, topic: 28, materialsRequired: 26 },
    {
      date: (r) => formatDate(r.scheduledDate),
      school: (r) => r.schoolName,
      class: (r) => r.className,
      teacher: (r) => r.teacherName,
      meetingNumber: (r) => r.meetingNumber,
      topic: (r) => r.topic,
      materialsRequired: (r) => (r.materialsRequired.length > 0 ? r.materialsRequired.join(", ") : "-"),
      vocabularyFocus: (r) => r.vocabularyFocus ?? "-",
      differentiationSupport: (r) => r.differentiationSupport ?? "-",
      differentiationExtension: (r) => r.differentiationExtension ?? "-",
      differentiationHomework: (r) => r.differentiationHomework ?? "-",
      hasModule: (r) => (r.hasModule ? tCommon("yes") : tCommon("no")),
      isDraft: (r) => (r.isDraft ? tCommon("yes") : tCommon("no")),
      isAdminEntered: (r) => (r.isAdminEntered ? tCommon("yes") : tCommon("no")),
      compliant: (r) => (r.isCompliant ? tCommon("yes") : tCommon("no")),
    },
  );
}

export function buildClassesExportColumns(
  t: Translate,
  tCommon: Translate,
  visibleKeys: Set<string>,
): ExcelColumn<ClassesReportRow>[] {
  return pick<ClassesReportRow>(
    CLASSES_REPORT_COLUMNS,
    visibleKeys,
    t,
    { class: 24, school: 22, curriculum: 20, schedule: 28 },
    {
      class: (r) => r.className,
      school: (r) => r.schoolName,
      teacher: (r) => r.teacherName,
      curriculum: (r) => r.curriculumName ?? "-",
      schedule: (r) => r.schedule,
      enrollment: (r) => r.enrollmentCount,
      attendanceRate: (r) => (r.attendanceRate != null ? `${r.attendanceRate}%` : "-"),
      complianceRate: (r) => (r.complianceRate != null ? `${r.complianceRate}%` : "-"),
      reportsFiled: (r) => r.reportsFiledCount,
      isActive: (r) => (r.isActive ? tCommon("yes") : tCommon("no")),
    },
  );
}
