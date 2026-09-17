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
import { useDailyTeachingReportDetail } from "@/features/analytics/use-analytics";
import { useReportFilters } from "@/features/analytics/use-report-filters";
import { buildDailyTeachingReportExportColumns } from "@/features/analytics/export-columns";
import { DAILY_TEACHING_REPORT_COLUMNS } from "@/features/analytics/schema";
import type { AdminReportListItem } from "@/features/reports/admin-queries";
import { useSchools } from "@/features/schools/use-schools";
import { useClasses } from "@/features/classes/use-classes";
import { parseLocalDate } from "@/lib/date";

const OBJECTIVES_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  YES: "default",
  PARTIALLY: "secondary",
  NO: "destructive",
};

export default function AnalyticsDailyTeachingReportPage() {
  const t = useTranslations("admin.analytics.dailyTeachingReport");
  const tColumns = useTranslations("admin.analytics.columns");
  const tFilters = useTranslations("admin.analytics.filters");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const f = useReportFilters(DAILY_TEACHING_REPORT_COLUMNS);
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const { data, isLoading, isError, error } = useDailyTeachingReportDetail({
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    classId: f.classId,
  });

  const schoolIdByClassId = useMemo(() => new Map((classes ?? []).map((c) => [c.id, c.schoolId])), [classes]);
  const rows = useMemo(
    () => (data ?? []).filter((r) => !f.schoolId || schoolIdByClassId.get(r.classId) === f.schoolId),
    [data, f.schoolId, schoolIdByClassId],
  );

  const summaryItems = useMemo(() => {
    const total = rows.length;
    const achieved = rows.filter((r) => r.objectivesAchieved === "YES").length;
    return [
      { label: t("summary.totalReports"), value: total },
      { label: t("summary.objectivesAchievedRate"), value: total > 0 ? `${Math.round((achieved / total) * 100)}%` : "-" },
    ];
  }, [rows, t]);

  const chartData = useMemo(() => {
    const byDate = new Map<string, number>();
    rows.forEach((r) => byDate.set(r.actualTeachingDate, (byDate.get(r.actualTeachingDate) ?? 0) + 1));
    return Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date: parseLocalDate(date).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" }), count }));
  }, [rows, locale]);

  const columns = useMemo<ColumnDef<AdminReportListItem>[]>(
    () => [
      { id: "date", accessorKey: "actualTeachingDate", header: tColumns("date"), cell: ({ row }) => parseLocalDate(row.original.actualTeachingDate).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" }) },
      { id: "school", accessorKey: "schoolName", header: tColumns("school") },
      { id: "class", accessorKey: "className", header: tColumns("class") },
      { id: "teacher", accessorKey: "teacherName", header: tColumns("teacher") },
      { id: "substitute", header: tColumns("substitute"), cell: ({ row }) => (row.original.isSubstitute ? tCommon("yes") : "-") },
      { id: "meetingNumber", accessorKey: "meetingNumber", header: tColumns("meetingNumber") },
      { id: "topic", accessorKey: "topic", header: tColumns("topic") },
      { id: "skills", header: tColumns("skills"), cell: ({ row }) => (row.original.skills.length > 0 ? row.original.skills.join(", ") : "-") },
      { id: "attendance", header: tColumns("attendance"), cell: ({ row }) => (row.original.attendanceTotal > 0 ? `${row.original.attendancePresent}/${row.original.attendanceTotal}` : "-") },
      { id: "objectives", header: tColumns("objectives"), cell: ({ row }) => row.original.objectivesAchieved ? <Badge variant={OBJECTIVES_BADGE[row.original.objectivesAchieved]}>{row.original.objectivesAchieved}</Badge> : "-" },
      { id: "summary", header: tColumns("summary"), cell: ({ row }) => row.original.summary ?? "-" },
    ],
    [tColumns, tCommon, locale],
  );

  const formatDate = useCallback(
    (d: string) => parseLocalDate(d).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" }),
    [locale],
  );
  const exportColumns = useMemo(
    () => buildDailyTeachingReportExportColumns(tColumns, tCommon, formatDate, f.visibleKeys),
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
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }} />
                <Bar dataKey="count" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <ReportToolbar
        columns={DAILY_TEACHING_REPORT_COLUMNS.map((c) => ({ key: c.key, label: tColumns(c.key) }))}
        visibility={f.visibility}
        onVisibilityChange={(key, visible) => f.setVisibility((prev) => ({ ...prev, [key]: visible }))}
        filename="daily-teaching-report-analytics"
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
