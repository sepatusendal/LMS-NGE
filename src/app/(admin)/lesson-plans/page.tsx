"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, School, ChevronDown, ChevronRight, Clock, Plus, FileSpreadsheet, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { downloadAlbrightTeachingRecords } from "@/features/lesson-plans/albright-export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchools } from "@/features/schools/use-schools";
import { useClasses } from "@/features/classes/use-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";
import { formatScheduleSlots } from "@/features/classes/schema";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import type { ExcelColumn } from "@/lib/export-excel";
import type { LessonPlan } from "@/features/lesson-plans/schema";
import type { Class } from "@/features/classes/schema";

function buildLessonPlanColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  locale: string,
  classById: Map<string, Class>,
): ExcelColumn<LessonPlan>[] {
  return [
    { header: tCommon("school"), key: "school", width: 22, value: (p) => classById.get(p.classId)?.schoolName ?? "-" },
    { header: t("class"), key: "class", width: 22, value: (p) => p.className },
    { header: "Meeting", key: "meeting", width: 10, value: (p) => p.meetingNumber },
    { header: t("week"), key: "week", width: 10, value: (p) => p.week },
    { header: t("date"), key: "date", width: 14, value: (p) => new Date(p.scheduledDate).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" }) },
    { header: "Level", key: "level", width: 10, value: (p) => p.level ?? "-" },
    { header: "Topic", key: "topic", width: 26, value: (p) => p.topic },
    { header: "Learning Objectives", key: "objectives", width: 40, value: (p) => p.learningObjectives.filter(Boolean).join(" | ") || "-" },
    { header: "Skills", key: "skills", width: 26, value: (p) => p.skills.join(", ") || "-" },
    { header: "Materials", key: "materials", width: 26, value: (p) => p.materialsRequired.join(", ") || "-" },
    { header: "Vocabulary Focus", key: "vocab", width: 26, value: (p) => p.vocabularyFocus ?? "-" },
    { header: "Differentiation - Support", key: "diffSupport", width: 30, value: (p) => p.differentiationSupport ?? "-" },
    { header: "Differentiation - Extension", key: "diffExtension", width: 30, value: (p) => p.differentiationExtension ?? "-" },
    { header: "Differentiation - Homework", key: "diffHomework", width: 30, value: (p) => p.differentiationHomework ?? "-" },
    { header: t("module"), key: "module", width: 24, value: (p) => p.moduleFileName ?? "-" },
    { header: t("createdBy"), key: "createdBy", width: 22, value: (p) => p.createdByTeacherName },
    { header: t("createdAtHeader"), key: "createdAt", width: 16, value: (p) => new Date(p.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" }) },
  ];
}

function AlbrightExportButton({
  classId,
  className,
  level,
}: {
  classId: string;
  className: string;
  level: string;
}) {
  const t = useTranslations("admin.lessonPlans");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadAlbrightTeachingRecords(classId, className, level);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
      {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
      {t("downloadAlbright")}
    </Button>
  );
}

export default function AdminLessonPlansPage() {
  const t = useTranslations("admin.lessonPlans");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const { data: lessonPlans, isLoading } = useLessonPlans();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const schoolClasses = (classes ?? []).filter(
    (c) => c.schoolId === selectedSchoolId && c.isActive,
  );
  const classById = useMemo(() => new Map((classes ?? []).map((c) => [c.id, c])), [classes]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton
            filename="lesson-plan"
            sheets={[
              { name: t("title"), columns: buildLessonPlanColumns(t, tCommon, locale, classById), rows: lessonPlans ?? [] },
            ]}
          />
          <Link href="/lesson-plan/new" className={buttonVariants({ variant: "default" })}>
            <Plus className="size-4" />
            {t("addTitle")}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <School className="text-muted-foreground size-4 shrink-0" />
        <Select
          items={schools?.map((s) => ({ value: s.id, label: s.name })) ?? []}
          value={selectedSchoolId}
          onValueChange={(v) => {
            if (v) setSelectedSchoolId(v);
            setExpandedClassId(null);
          }}
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder={t("selectSchoolEllipsis")} />
          </SelectTrigger>
          <SelectContent>
            {schools?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedSchoolId ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-full">
            <Search className="text-muted-foreground size-6" />
          </div>
          <p className="text-muted-foreground text-sm">{t("selectSchoolPrompt")}</p>
        </div>
      ) : isLoading ? (
        <p className="text-muted-foreground text-sm">{tCommon("dataTable.loading")}</p>
      ) : schoolClasses.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noClassesInSchool")}</p>
      ) : (
        <div className="space-y-2">
          {schoolClasses.map((cls) => {
            const classPlans = (lessonPlans ?? [])
              .filter((p) => p.classId === cls.id)
              .sort(
                (a, b) =>
                  a.meetingNumber - b.meetingNumber,
              );
            const isExpanded = expandedClassId === cls.id;

            return (
              <Card key={cls.id}>
                <CardContent className="space-y-3 pt-4">
                  <button
                    className="flex w-full items-center justify-between text-left"
                    onClick={() =>
                      setExpandedClassId(isExpanded ? null : cls.id)
                    }
                  >
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {cls.teacherName} ·{" "}
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatScheduleSlots(cls.scheduleSlots)}
                        </span>
                        {cls.room ? ` · R.${cls.room}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {t("lessonPlanCount", { count: classPlans.length })}
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 border-t pt-3">
                      {cls.curriculumReportFormat === "ALBRIGHT" && (
                        <AlbrightExportButton
                          classId={cls.id}
                          className={cls.name}
                          level={cls.curriculumGradeLevel ?? cls.curriculumName ?? "Albright"}
                        />
                      )}
                      {classPlans.length === 0 ? (
                        <p className="text-muted-foreground text-xs">{t("noLessonPlans")}</p>
                      ) : (
                        classPlans.map((plan) => (
                          <Link
                            key={plan.id}
                            href={`/lesson-plan/${plan.id}`}
                            className="hover:bg-muted flex items-center justify-between rounded-md px-3 py-2 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                Meeting {plan.meetingNumber} — {plan.topic}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {t("weekLabel", { week: plan.week })} ·{" "}
                                {new Date(plan.scheduledDate).toLocaleDateString(
                                  locale === "en" ? "en-US" : "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {t("submittedBy", { name: plan.createdByTeacherName })} ·{" "}
                                {new Date(plan.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {t("levelLabel", { level: plan.level || "-" })}
                            </Badge>
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
