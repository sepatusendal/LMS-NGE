"use client";

import { useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { ReportFilterBar } from "@/components/shared/report-filter-bar";
import { ReportToolbar } from "@/components/shared/report-toolbar";
import { SummaryCards } from "@/features/analytics/summary-cards";
import { useLessonPlanReport } from "@/features/analytics/use-analytics";
import { useReportFilters } from "@/features/analytics/use-report-filters";
import { buildLessonPlanExportColumns } from "@/features/analytics/export-columns";
import { LESSON_PLAN_COLUMNS } from "@/features/analytics/schema";
import type { LessonPlanReportRow } from "@/features/analytics/admin-queries";
import { useSchools } from "@/features/schools/use-schools";
import { useClasses } from "@/features/classes/use-classes";
import { parseLocalDate } from "@/lib/date";

export default function AnalyticsLessonPlanReportPage() {
  const t = useTranslations("admin.analytics.lessonPlan");
  const tColumns = useTranslations("admin.analytics.columns");
  const tFilters = useTranslations("admin.analytics.filters");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const f = useReportFilters(LESSON_PLAN_COLUMNS);
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const { data, isLoading, isError, error } = useLessonPlanReport({
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    schoolId: f.schoolId,
    classId: f.classId,
  });

  const rows = useMemo(() => data ?? [], [data]);

  const summaryItems = useMemo(() => {
    const total = rows.length;
    const compliant = rows.filter((r) => r.isCompliant).length;
    const draftCount = rows.filter((r) => r.isDraft).length;
    return [
      { label: t("summary.totalPlans"), value: total },
      { label: t("summary.compliantRate"), value: total > 0 ? `${Math.round((compliant / total) * 100)}%` : "-" },
      { label: t("summary.draftCount"), value: draftCount },
    ];
  }, [rows, t]);

  const chartData = useMemo(() => {
    const byClass = new Map<string, { name: string; compliant: number; nonCompliant: number }>();
    rows.forEach((r) => {
      const entry = byClass.get(r.classId) ?? { name: r.className, compliant: 0, nonCompliant: 0 };
      if (r.isCompliant) entry.compliant += 1;
      else entry.nonCompliant += 1;
      byClass.set(r.classId, entry);
    });
    return Array.from(byClass.values()).slice(0, 10);
  }, [rows]);

  const columns = useMemo<ColumnDef<LessonPlanReportRow>[]>(
    () => [
      { id: "date", accessorKey: "scheduledDate", header: tColumns("date"), cell: ({ row }) => parseLocalDate(row.original.scheduledDate).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" }) },
      { id: "school", accessorKey: "schoolName", header: tColumns("school") },
      { id: "class", accessorKey: "className", header: tColumns("class") },
      { id: "teacher", accessorKey: "teacherName", header: tColumns("teacher") },
      { id: "meetingNumber", accessorKey: "meetingNumber", header: tColumns("meetingNumber") },
      { id: "topic", accessorKey: "topic", header: tColumns("topic") },
      { id: "materialsRequired", header: tColumns("materialsRequired"), cell: ({ row }) => (row.original.materialsRequired.length > 0 ? row.original.materialsRequired.join(", ") : "-") },
      { id: "vocabularyFocus", header: tColumns("vocabularyFocus"), cell: ({ row }) => row.original.vocabularyFocus ?? "-" },
      { id: "differentiationSupport", header: tColumns("differentiationSupport"), cell: ({ row }) => row.original.differentiationSupport ?? "-" },
      { id: "differentiationExtension", header: tColumns("differentiationExtension"), cell: ({ row }) => row.original.differentiationExtension ?? "-" },
      { id: "differentiationHomework", header: tColumns("differentiationHomework"), cell: ({ row }) => row.original.differentiationHomework ?? "-" },
      { id: "hasModule", header: tColumns("hasModule"), cell: ({ row }) => (row.original.hasModule ? tCommon("yes") : tCommon("no")) },
      { id: "isDraft", header: tColumns("isDraft"), cell: ({ row }) => (row.original.isDraft ? <Badge variant="secondary">{tCommon("yes")}</Badge> : "-") },
      { id: "isAdminEntered", header: tColumns("isAdminEntered"), cell: ({ row }) => (row.original.isAdminEntered ? <Badge variant="secondary">{tCommon("yes")}</Badge> : "-") },
      { id: "compliant", header: tColumns("compliant"), cell: ({ row }) => <Badge variant={row.original.isCompliant ? "default" : "destructive"}>{row.original.isCompliant ? tCommon("yes") : tCommon("no")}</Badge> },
    ],
    [tColumns, tCommon, locale],
  );

  const formatDate = useCallback(
    (d: string) => parseLocalDate(d).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );
  const exportColumns = useMemo(
    () => buildLessonPlanExportColumns(tColumns, tCommon, formatDate, f.visibleKeys),
    [tColumns, tCommon, f.visibleKeys, formatDate],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle", { count: rows.length })}</p>
      </div>

      <SummaryCards items={summaryItems} />

      <ReportFilterBar
        dateFrom={f.dateFrom}
        dateTo={f.dateTo}
        onDateChange={(from, to) => { f.setDateFrom(from); f.setDateTo(to); }}
        schools={schools}
        schoolId={f.schoolId}
        onSchoolChange={f.setSchoolId}
        classes={classes}
        classId={f.classId}
        onClassChange={f.setClassId}
        onReset={f.reset}
        allSchoolsLabel={tFilters("allSchools")}
        allClassesLabel={tFilters("allClasses")}
        resetLabel={tFilters("reset")}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("chartTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {chartData.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }} />
                <Bar dataKey="compliant" stackId="a" fill="var(--status-good)" name={tColumns("compliant")} />
                <Bar dataKey="nonCompliant" stackId="a" fill="var(--status-warning)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <ReportToolbar
        columns={LESSON_PLAN_COLUMNS.map((c) => ({ key: c.key, label: tColumns(c.key) }))}
        visibility={f.visibility}
        onVisibilityChange={(key, visible) => f.setVisibility((prev) => ({ ...prev, [key]: visible }))}
        filename="lesson-plan-report"
        sheets={[{ name: t("title"), columns: exportColumns, rows }]}
      />

      {isError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border py-12">
          <AlertCircle className="text-destructive mb-2 size-6" />
          <p className="text-muted-foreground text-sm">{error?.message || t("loadError")}</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          columnVisibility={f.visibility}
          onColumnVisibilityChange={f.setVisibility}
        />
      )}
    </div>
  );
}
