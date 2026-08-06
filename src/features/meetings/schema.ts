import { z } from "zod";

export const MEETING_STATUS = ["not_started", "checked_in", "attendance_done", "checked_out", "report_submitted", "course_completed"] as const;

export const checkInSchema = z.object({
  meetingId: z.string().min(1),
  teacherId: z.string().min(1),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  notes: z.string().optional(),
});
export type CheckInInput = z.infer<typeof checkInSchema>;

export const checkOutSchema = z.object({
  meetingId: z.string().min(1),
  teacherId: z.string().min(1),
  notes: z.string().optional(),
});
export type CheckOutInput = z.infer<typeof checkOutSchema>;

export interface TodayClass {
  classId: string;
  className: string;
  schoolName: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  room: string | null;
  lessonPlanId: string | null;
  meetingNumber: number;
  topic: string | null;
  scheduledDate: string | null;
  skills: string[];
  learningObjectives: string | null;
  meetingId: string | null;
  meetingStatus: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  isLate: boolean | null;
  durationMinutes: number | null;
  hasAttendance: boolean;
  hasReport: boolean;
  isSubstitute: boolean;
  originalTeacherName: string | null;
  substituteReason: string | null;
  /** True when every lesson plan for this class has a COMPLETED meeting —
   * there is no "next" plan to teach. Distinguishes "course finished" from
   * "not started yet" so the UI doesn't show the last completed meeting as
   * if it were still pending (see meetingStatus "course_completed"). */
  courseCompleted: boolean;
}

export interface Meeting {
  id: string;
  lessonPlanId: string;
  assignedTeacherId: string;
  actualTeacherId: string | null;
  substituteReason: string | null;
  status: string;
  createdAt: string;
}
