import { z } from "zod";

export const ATTENDANCE_STATUS_OPTIONS = ["PRESENT", "ABSENT", "EXCUSED", "LATE"] as const;

export const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Hadir",
  ABSENT: "Tidak Hadir",
  EXCUSED: "Izin",
  LATE: "Terlambat",
};

export const attendanceSchema = z.object({
  meetingId: z.string().min(1),
  studentId: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUS_OPTIONS),
  notes: z.string().optional(),
});
export type AttendanceInput = z.infer<typeof attendanceSchema>;

export const bulkAttendanceSchema = z.object({
  meetingId: z.string().min(1),
  entries: z.array(z.object({
    studentId: z.string().min(1),
    status: z.enum(ATTENDANCE_STATUS_OPTIONS),
    notes: z.string().optional(),
  })),
});
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;

export interface Attendance {
  id: string;
  meetingId: string;
  studentId: string;
  studentName: string;
  nis: string | null;
  status: string;
  notes: string | null;
}
