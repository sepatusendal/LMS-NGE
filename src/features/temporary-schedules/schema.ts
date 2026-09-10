import { z } from "zod";

export function buildTemporaryScheduleSchema(t: (key: string) => string) {
  return z
    .object({
      classIds: z.array(z.string()).min(1, t("validation.classesRequired")),
      label: z.string().optional(),
      dateFrom: z.string().min(1, t("validation.dateFromRequired")),
      dateTo: z.string().min(1, t("validation.dateToRequired")),
      startTime: z.string().min(1, t("validation.startTimeRequired")),
      endTime: z.string().min(1, t("validation.endTimeRequired")),
    })
    .refine((v) => v.dateTo >= v.dateFrom, {
      message: t("validation.dateToBeforeDateFrom"),
      path: ["dateTo"],
    });
}

export type TemporaryScheduleInput = z.infer<ReturnType<typeof buildTemporaryScheduleSchema>>;

/** One admin action (`createTemporarySchedules`) produces N rows — one per
 * (class × date) — that all share a `batchId`; this is that batch collapsed
 * back into a single displayable unit for the list page. */
export interface TemporaryScheduleBatch {
  batchId: string;
  label: string | null;
  classIds: string[];
  classNames: string[];
  dateFrom: string;
  dateTo: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}
