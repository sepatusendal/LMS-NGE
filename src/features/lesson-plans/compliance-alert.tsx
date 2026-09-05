"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClasses } from "@/features/classes/use-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";
import { useAdminReports } from "@/features/reports/use-admin-reports";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import type { ExcelColumn } from "@/lib/export-excel";
import { parseLocalDate } from "@/lib/date";
import { getClassComplianceStatus } from "./compliance";

interface NonCompliantClass {
  id: string;
  name: string;
  classType: "REGULAR" | "TEACHER_TRAINING";
  schoolName: string;
  teacherId: string;
  teacherName: string;
  latestDate: string | null;
  daysLeft: number;
}

interface LessonPlanComplianceRow extends NonCompliantClass {
  isCompliant: boolean;
}

interface TeacherComplianceRow {
  teacherId: string;
  teacherName: string;
  lateCount: number;
  worstClassName: string;
  worstDaysLeft: number;
}

function buildTeacherComplianceColumns(
  t: (key: string) => string,
): ExcelColumn<TeacherComplianceRow>[] {
  return [
    { header: "Teacher", key: "teacher", width: 22, value: (r) => r.teacherName },
    { header: t("lateClassCount"), key: "count", width: 18, value: (r) => r.lateCount },
    { header: t("worstClass"), key: "worstClass", width: 22, value: (r) => r.worstClassName },
    { header: t("daysLeftOrLate"), key: "worstDays", width: 16, value: (r) => r.worstDaysLeft },
  ];
}

interface ReportComplianceRow {
  className: string;
  schoolName: string;
  teacherName: string;
  totalReports: number;
  latestReportDate: string | null;
  daysSinceLastReport: number | null;
}

function buildLpComplianceColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  locale: string,
): ExcelColumn<LessonPlanComplianceRow>[] {
  return [
    { header: t("class"), key: "class", width: 22, value: (r) => r.name },
    { header: t("classTypeHeader"), key: "type", width: 16, value: (r) => (r.classType === "TEACHER_TRAINING" ? t("classTypeTraining") : t("classTypeRegular")) },
    { header: tCommon("school"), key: "school", width: 22, value: (r) => r.schoolName },
    { header: "Teacher", key: "teacher", width: 22, value: (r) => r.teacherName },
    {
      header: t("furthestLessonPlan"),
      key: "latestDate",
      width: 18,
      value: (r) =>
        r.latestDate
          ? parseLocalDate(r.latestDate).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" })
          : t("none"),
    },
    { header: t("daysLeft"), key: "daysLeft", width: 12, value: (r) => r.daysLeft },
    { header: tCommon("status"), key: "status", width: 14, value: (r) => (r.isCompliant ? t("compliant") : t("needsAttention")) },
  ];
}

function buildReportComplianceColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  locale: string,
): ExcelColumn<ReportComplianceRow>[] {
  return [
    { header: t("class"), key: "class", width: 22, value: (r) => r.className },
    { header: tCommon("school"), key: "school", width: 22, value: (r) => r.schoolName },
    { header: "Teacher", key: "teacher", width: 22, value: (r) => r.teacherName },
    { header: t("totalReports"), key: "total", width: 14, value: (r) => r.totalReports },
    {
      header: t("lastReport"),
      key: "latest",
      width: 18,
      value: (r) =>
        r.latestReportDate
          ? parseLocalDate(r.latestReportDate).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" })
          : t("never"),
    },
    { header: t("daysSinceLastReport"), key: "daysSince", width: 20, value: (r) => r.daysSinceLastReport ?? "-" },
  ];
}

export function ComplianceAlert() {
  const t = useTranslations("admin.complianceAlert");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: lessonPlans, isLoading: plansLoading } = useLessonPlans();
  const { data: reports } = useAdminReports();
  const [view, setView] = useState<"class" | "teacher">("class");

  const { nonCompliant, allCompliance } = useMemo(() => {
    if (!classes || !lessonPlans) return { nonCompliant: [], allCompliance: [] };
    const now = Date.now();

    const all: LessonPlanComplianceRow[] = classes.map((c) => {
      const status = getClassComplianceStatus(c.id, lessonPlans, now);
      return {
        id: c.id,
        name: c.name,
        classType: c.classType,
        schoolName: c.schoolName,
        teacherId: c.teacherId,
        teacherName: c.teacherName,
        latestDate: status.latestDate,
        daysLeft: status.daysLeft,
        isCompliant: status.isCompliant,
      };
    });

    const bad = all.filter((c) => !c.isCompliant).sort((a, b) => a.daysLeft - b.daysLeft);
    return { nonCompliant: bad, allCompliance: all };
  }, [classes, lessonPlans]);

  const byTeacher = useMemo((): TeacherComplianceRow[] => {
    const grouped = new Map<string, NonCompliantClass[]>();
    for (const c of nonCompliant) {
      const list = grouped.get(c.teacherId) ?? [];
      list.push(c);
      grouped.set(c.teacherId, list);
    }
    return Array.from(grouped.entries())
      .map(([teacherId, list]) => {
        const worst = list.reduce((a, b) => (a.daysLeft <= b.daysLeft ? a : b));
        return {
          teacherId,
          teacherName: list[0].teacherName,
          lateCount: list.length,
          worstClassName: worst.name,
          worstDaysLeft: worst.daysLeft,
        };
      })
      .sort((a, b) => a.worstDaysLeft - b.worstDaysLeft || b.lateCount - a.lateCount);
  }, [nonCompliant]);

  const reportCompliance = useMemo((): ReportComplianceRow[] => {
    if (!classes) return [];
    const now = Date.now();
    const byClass = new Map<string, { count: number; latest: string | null }>();
    (reports ?? []).forEach((r) => {
      const cur = byClass.get(r.classId) ?? { count: 0, latest: null };
      cur.count += 1;
      if (!cur.latest || r.actualTeachingDate > cur.latest) cur.latest = r.actualTeachingDate;
      byClass.set(r.classId, cur);
    });

    return classes.map((c) => {
      const info = byClass.get(c.id) ?? { count: 0, latest: null };
      const daysSince = info.latest ? Math.floor((now - parseLocalDate(info.latest).getTime()) / (24 * 60 * 60 * 1000)) : null;
      return {
        className: c.name,
        schoolName: c.schoolName,
        teacherName: c.teacherName,
        totalReports: info.count,
        latestReportDate: info.latest,
        daysSinceLastReport: daysSince,
      };
    });
  }, [classes, reports]);

  const isLoading = classesLoading || plansLoading;
  const daysLeftLabel = (days: number) =>
    days < 0 ? t("lateByDays", { days: Math.abs(days) }) : t("daysLeftShort", { days });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="text-destructive size-4" />
          {t("title")}
          {!isLoading && (
            <span className="text-muted-foreground ml-auto text-xs font-normal">
              {t("needAttentionCount", { count: nonCompliant.length, total: classes?.length ?? 0 })}
            </span>
          )}
          <ExportExcelButton
            filename="kepatuhan-lesson-plan-report"
            disabled={isLoading}
            sheets={[
              { name: t("title"), columns: buildLpComplianceColumns(t, tCommon, locale), rows: allCompliance },
              { name: t("recapPerTeacher"), columns: buildTeacherComplianceColumns(t), rows: byTeacher },
              { name: t("dailyReportComplianceTitle"), columns: buildReportComplianceColumns(t, tCommon, locale), rows: reportCompliance },
            ]}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{tCommon("dataTable.loading")}</p>
        ) : nonCompliant.length === 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="size-4" style={{ color: "var(--status-good)" }} />
            <span>{t("allSafe")}</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-muted inline-flex items-center gap-0.5 rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setView("class")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  view === "class" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {t("perClass")}
              </button>
              <button
                type="button"
                onClick={() => setView("teacher")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  view === "teacher" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                {t("perTeacher")}
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border">
              {view === "class" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("class")}</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-right">{tCommon("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonCompliant.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {c.name}
                          {c.classType === "TEACHER_TRAINING" && (
                            <Badge variant="secondary" className="ml-1.5 text-[10px]">
                              {t("classTypeTraining")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {c.teacherName}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={c.latestDate === null ? "destructive" : "secondary"} className="text-xs">
                            {c.latestDate === null ? t("none") : daysLeftLabel(c.daysLeft)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-right">{t("lateClassCount")}</TableHead>
                      <TableHead className="text-right">{t("worstClass")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byTeacher.map((row) => (
                      <TableRow key={row.teacherId}>
                        <TableCell className="font-medium whitespace-nowrap">{row.teacherName}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={row.lateCount > 1 ? "destructive" : "secondary"} className="text-xs">
                            {t("classCount", { count: row.lateCount })}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right whitespace-nowrap text-xs">
                          {row.worstClassName} ({daysLeftLabel(row.worstDaysLeft)})
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
