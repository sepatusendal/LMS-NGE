import { z } from "zod";

export const MEETING_STATUS = ["not_started", "checked_in", "attendance_done", "checked_out", "report_submitted", "no_plan_today"] as const;

export const checkInSchema = z.object({
  meetingId: z.string().min(1),
  teacherId: z.string().min(1),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  notes: z.string().optional(),
});
export type CheckInInput = z.infer<typeof checkInSchema>;

export interface TodayClass {
  classId: string;
  className: string;
  schoolName: string;
  curriculumReportFormat: "STANDARD" | "ALBRIGHT";
  scheduleStartTime: string;
  scheduleEndTime: string;
  room: string | null;
  lessonPlanId: string | null;
  meetingNumber: number;
  topic: string | null;
  scheduledDate: string | null;
  skills: string[];
  learningObjectives: string[];
  moduleDriveFileId: string | null;
  moduleFileName: string | null;
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
  /** True when today's own meeting is fully handled but the *next* lesson
   * plan (typically next week's) hasn't been written yet — a forward-looking
   * reminder only. Never true at the same time as meetingStatus
   * "no_plan_today" (that one already has its own call-to-action). */
  needsNextLessonPlan: boolean;
  /** What check_in_with_draft_plan() should number/date a placeholder plan
   * as, if the teacher checks in without one existing yet — only actually
   * used when meetingStatus is "no_plan_today". */
  draftMeetingNumber: number;
  draftWeek: number;
  /** True when checking in today via the auto-draft flow would create a
   * lesson plan numbered after one that's already scheduled further in the
   * future — corrupting meetingNumber/scheduledDate order. Only meaningful
   * when meetingStatus is "no_plan_today"; the teacher must write today's
   * plan manually instead (see queries.ts's draftCheckInBlocked comment). */
  draftCheckInBlocked: boolean;
  /** A past meeting (not today's) that was checked out but never got its
   * report filed — surfaced as its own reminder instead of being shown as
   * today's status, since it has nothing to do with today's class. Null
   * when there's no such stale meeting. */
  pendingReportMeetingId: string | null;
  pendingReportMeetingNumber: number | null;
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
