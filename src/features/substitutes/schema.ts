export const ABSENCE_REASONS = [
  "SICK_LEAVE",
  "EMERGENCY",
  "PERSONAL_LEAVE",
  "OFFICIAL_DUTY",
  "SCHEDULE_CONFLICT",
] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

export const ABSENCE_REASON_LABEL: Record<string, string> = {
  SICK_LEAVE: "Sakit",
  EMERGENCY: "Darurat",
  PERSONAL_LEAVE: "Izin Pribadi",
  OFFICIAL_DUTY: "Tugas Dinas",
  SCHEDULE_CONFLICT: "Bentrok Jadwal",
};

export interface CurrentMeetingInfo {
  lessonPlanId: string;
  meetingNumber: number;
  topic: string;
  meetingId: string | null;
  hasCheckIn: boolean;
  effectiveTeacherId: string;
  effectiveTeacherName: string;
  isSubstituted: boolean;
  substituteTeacherId: string | null;
  substituteTeacherName: string | null;
  substituteReason: string | null;
}

export interface HandoverSummary {
  originalTeacherName: string;
  currentLesson: { meetingNumber: number; topic: string; scheduledDate: string } | null;
  previousLesson: { meetingNumber: number; topic: string; scheduledDate: string } | null;
  previousReport: {
    whatWentWell: string | null;
    whatNeedsImprovement: string | null;
    nextLessonNotes: string | null;
    homeworkAssigned: string | null;
  } | null;
  nextLesson: { meetingNumber: number; topic: string; scheduledDate: string } | null;
  followUps: { studentName: string; note: string }[];
}
