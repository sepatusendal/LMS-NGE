import type { ExcelColumn } from "@/lib/export-excel";
import { formatScheduleSlots, type Class } from "./schema";

export function buildClassExportColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  locale: string,
): ExcelColumn<Class>[] {
  return [
    { header: t("nameHeader"), key: "name", width: 22, value: (c) => c.name },
    { header: tCommon("school"), key: "school", width: 22, value: (c) => c.schoolName },
    {
      header: t("classTypeHeader"),
      key: "type",
      width: 16,
      value: (c) => (c.classType === "TEACHER_TRAINING" ? t("classTypeTraining") : t("classTypeRegular")),
    },
    { header: "Teacher", key: "teacher", width: 22, value: (c) => c.teacherName },
    { header: t("curriculumHeader"), key: "curriculum", width: 22, value: (c) => c.curriculumName ?? "-" },
    { header: t("room"), key: "room", width: 14, value: (c) => c.room ?? "-" },
    { header: t("schedule"), key: "schedule", width: 30, value: (c) => formatScheduleSlots(c.scheduleSlots) },
    { header: tCommon("status"), key: "status", width: 12, value: (c) => (c.isActive ? tCommon("active") : tCommon("inactive")) },
    {
      header: t("createdAtHeader"),
      key: "createdAt",
      width: 16,
      value: (c) =>
        new Date(c.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
  ];
}
