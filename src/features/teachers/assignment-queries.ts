import { findTeacherWeeklyAssignments, type TeacherWeeklyAssignment } from "@/lib/schedule-conflict";
import { deleteScheduleOverride, upsertScheduleOverride } from "@/features/classes/schedule-override-queries";

export type { TeacherWeeklyAssignment };

export async function fetchTeacherAssignments(teacherId: string): Promise<TeacherWeeklyAssignment[]> {
  return findTeacherWeeklyAssignments(teacherId);
}

/** Assigns `teacherId` to teach `classId` on `dayOfWeek` — reuses the same
 * per-day override row (and conflict check) that the Class detail page's
 * schedule panel writes to, just entered from the Teacher side instead. */
export async function assignTeacherToClassDay(input: {
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacherId: string;
}) {
  return upsertScheduleOverride(input);
}

export async function unassignTeacherFromDay(overrideId: string) {
  return deleteScheduleOverride(overrideId);
}
