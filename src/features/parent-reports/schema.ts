export interface ParentReportListItem {
  id: string;
  studentId: string;
  studentName: string;
  schoolName: string;
  periodMonth: number;
  periodYear: number;
  status: "DRAFT" | "GENERATED";
  pdfDriveFileId: string | null;
  pdfFileName: string | null;
  generatedAt: string | null;
}

export interface StudentPeriodTeachingReport {
  meetingId: string;
  date: string;
  className: string;
  meetingNumber: number;
  topic: string;
  skills: string[];
  objectivesAchieved: "YES" | "PARTIALLY" | "NO" | null;
  whatWentWell: string | null;
  whatNeedsImprovement: string | null;
}

export interface StudentPeriodProgressNote {
  date: string;
  skillArea: string | null;
  note: string;
}

export interface StudentPeriodClassInfo {
  classId: string;
  className: string;
  curriculumName: string | null;
  gradeLevel: string | null;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  excused: number;
  late: number;
  total: number;
}

export interface StudentPeriodData {
  studentId: string;
  studentName: string;
  nis: string | null;
  schoolName: string;
  periodMonth: number;
  periodYear: number;
  classes: StudentPeriodClassInfo[];
  attendance: AttendanceSummary;
  lessonsCompleted: number;
  skillsCovered: string[];
  teachingReports: StudentPeriodTeachingReport[];
  progressNotes: StudentPeriodProgressNote[];
}

export interface ParentReportDraft {
  id: string;
  studentId: string;
  periodMonth: number;
  periodYear: number;
  status: "DRAFT" | "GENERATED";
  teacherCommentsFinal: string;
  pdfDriveFileId: string | null;
  pdfFileName: string | null;
  generatedAt: string | null;
  periodData: StudentPeriodData;
}

export const MONTH_LABEL: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};
