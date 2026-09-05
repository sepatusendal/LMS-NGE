import { z } from "zod";

export const DAY_OPTIONS = [
  { value: "1", label: "Senin" },
  { value: "2", label: "Selasa" },
  { value: "3", label: "Rabu" },
  { value: "4", label: "Kamis" },
  { value: "5", label: "Jumat" },
  { value: "6", label: "Sabtu" },
  { value: "0", label: "Minggu" },
];

export const DAY_LABEL: Record<string, string> = Object.fromEntries(
  DAY_OPTIONS.map((d) => [d.value, d.label]),
);

export const DAY_LABEL_SHORT: Record<string, string> = Object.fromEntries(
  DAY_OPTIONS.map((d) => [d.value, d.label.slice(0, 3)]),
);

// value -> translation key, for teacher-facing i18n displays (e.g. Jadwal).
export const DAY_KEY: Record<string, string> = {
  "1": "monday",
  "2": "tuesday",
  "3": "wednesday",
  "4": "thursday",
  "5": "friday",
  "6": "saturday",
  "0": "sunday",
};

/** DAY_OPTIONS order (Senin..Minggu), for admin i18n displays. */
export const DAY_VALUES = DAY_OPTIONS.map((d) => d.value);

/** Sunday-first order (0..6), matching dashboard chart/list layouts. */
export const DAY_VALUES_SUNDAY_FIRST = ["0", "1", "2", "3", "4", "5", "6"];

/** Build translated { value, label } day options. Pass a t scoped to the
 * "jadwal.day" namespace (e.g. useTranslations("jadwal.day")). */
export function buildDayOptions(t: (key: string) => string) {
  return DAY_VALUES.map((value) => ({ value, label: t(DAY_KEY[value]) }));
}

/** Build a value -> translated label map, in DAY_OPTIONS order. */
export function buildDayLabel(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(DAY_VALUES.map((v) => [v, t(DAY_KEY[v])]));
}

/** Build a value -> translated short label (first 3 chars) map. */
export function buildDayLabelShort(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(DAY_VALUES.map((v) => [v, t(DAY_KEY[v]).slice(0, 3)]));
}

/** Sunday-first array of translated full day names, for dashboard charts. */
export function buildDayLabelsSundayFirst(t: (key: string) => string): string[] {
  return DAY_VALUES_SUNDAY_FIRST.map((v) => t(DAY_KEY[v]));
}

export interface ScheduleSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export function buildClassSchema(t: (key: string) => string) {
  return z
    .object({
      name: z.string().min(1, t("validation.nameRequired")),
      schoolId: z.string().min(1, t("validation.schoolRequired")),
      teacherId: z.string().min(1, t("validation.teacherRequired")),
      curriculumId: z.string().optional(),
      room: z.string().optional(),
      scheduleDaysOfWeek: z.array(z.string()).min(1, t("validation.daySelectionRequired")),
      scheduleTimes: z.record(
        z.string(),
        z.object({
          startTime: z.string().min(1, t("validation.startTimeRequired")),
          endTime: z.string().min(1, t("validation.endTimeRequired")),
        }),
      ),
    })
    .refine(
      (data) => data.scheduleDaysOfWeek.every((d) => data.scheduleTimes[d]?.startTime && data.scheduleTimes[d]?.endTime),
      {
        message: t("validation.scheduleTimesRequired"),
        path: ["scheduleTimes"],
      },
    );
}

export type ClassInput = z.infer<ReturnType<typeof buildClassSchema>>;

export type ClassType = "REGULAR" | "TEACHER_TRAINING";

export interface Class {
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  teacherId: string;
  teacherName: string;
  curriculumId: string | null;
  curriculumName: string | null;
  curriculumGradeLevel: string | null;
  curriculumReportFormat: "STANDARD" | "ALBRIGHT";
  classType: ClassType;
  room: string | null;
  scheduleDaysOfWeek: number[];
  scheduleSlots: ScheduleSlot[];
  isActive: boolean;
  createdAt: string;
}

/** The slot for a specific day, if the class meets that day. */
export function getSlotForDay(slots: ScheduleSlot[], dayOfWeek: number): ScheduleSlot | null {
  return slots.find((s) => s.dayOfWeek === dayOfWeek) ?? null;
}

/** Human-readable "Sen 08:00-09:00, Kam 15:00-16:00" for lists/tables. */
export function formatScheduleSlots(slots: ScheduleSlot[], dayLabels: Record<string, string> = DAY_LABEL_SHORT): string {
  if (slots.length === 0) return "-";
  return [...slots]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((s) => `${dayLabels[String(s.dayOfWeek)]} ${s.startTime}-${s.endTime}`)
    .join(", ");
}
