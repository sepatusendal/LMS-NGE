import { z } from "zod";
import { DAY_VALUES } from "@/features/classes/schema";

export function buildTemporaryScheduleSchema(t: (key: string) => string) {
  return z
    .object({
      classIds: z.array(z.string()).min(1, t("validation.classesRequired")),
      // classId -> substitute teacherId, only for classes whose teacher is
      // being changed for this batch. Empty/missing entry = original
      // teacher, unchanged (backward-compatible with schedules that only
      // ever moved the time).
      teacherOverrides: z.record(z.string(), z.string()),
      label: z.string().optional(),
      dateFrom: z.string().min(1, t("validation.dateFromRequired")),
      dateTo: z.string().min(1, t("validation.dateToRequired")),
      daysOfWeek: z.array(z.string()).min(1, t("validation.daysRequired")),
      startTime: z.string().min(1, t("validation.startTimeRequired")),
      endTime: z.string().min(1, t("validation.endTimeRequired")),
    })
    .refine((v) => v.dateTo >= v.dateFrom, {
      message: t("validation.dateToBeforeDateFrom"),
      path: ["dateTo"],
    });
}

export type TemporaryScheduleInput = z.infer<ReturnType<typeof buildTemporaryScheduleSchema>>;

/** Every weekday selected by default — matches the old behaviour (apply to
 * every date in the range) for anyone who doesn't touch the day picker. */
export const ALL_DAYS_OF_WEEK = [...DAY_VALUES];

/** One admin action (`createTemporarySchedules`) produces N rows — one per
 * (class × date) — that all share a `batchId`; this is that batch collapsed
 * back into a single displayable unit for the list page. `daysOfWeek` is
 * derived from which weekdays actually got a row, not a stored column. */
export interface TemporaryScheduleBatch {
  batchId: string;
  label: string | null;
  classIds: string[];
  classNames: string[];
  dateFrom: string;
  dateTo: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  createdAt: string;
  /** classId -> substitute teacher, for classes in this batch whose teacher
   * was changed. Missing entry = original teacher, unchanged. */
  substituteTeacherByClass: Record<string, { teacherId: string; teacherName: string }>;
}
