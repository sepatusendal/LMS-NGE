import { parseLocalDate } from "@/lib/date";
import type { LessonPlan } from "./schema";

export const LESSON_PLAN_COMPLIANCE_HORIZON_MS = 14 * 24 * 60 * 60 * 1000;

export interface ClassComplianceStatus {
  isCompliant: boolean;
  latestDate: string | null;
  daysLeft: number;
}

/** A class is compliant when its furthest-scheduled lesson plan reaches at
 * least 2 weeks out. Shared by `ComplianceAlert` (per-class list) and
 * `TodayCard` (aggregate rate) so both surfaces agree on one definition. */
export function getClassComplianceStatus(
  classId: string,
  lessonPlans: LessonPlan[],
  now = Date.now(),
): ClassComplianceStatus {
  const threshold = now + LESSON_PLAN_COMPLIANCE_HORIZON_MS;
  const classPlans = lessonPlans
    .filter((p) => p.classId === classId)
    .sort((a, b) => parseLocalDate(b.scheduledDate).getTime() - parseLocalDate(a.scheduledDate).getTime());

  const latest = classPlans[0];
  if (!latest) {
    return { isCompliant: false, latestDate: null, daysLeft: -1 };
  }

  const latestMs = parseLocalDate(latest.scheduledDate).getTime();
  const daysLeft = Math.ceil((latestMs - now) / (24 * 60 * 60 * 1000));
  return { isCompliant: latestMs >= threshold, latestDate: latest.scheduledDate, daysLeft };
}

export function computeComplianceRate(
  classIds: string[],
  lessonPlans: LessonPlan[],
): number | null {
  if (classIds.length === 0) return null;
  const now = Date.now();
  const compliant = classIds.filter(
    (id) => getClassComplianceStatus(id, lessonPlans, now).isCompliant,
  ).length;
  return Math.round((compliant / classIds.length) * 100);
}
