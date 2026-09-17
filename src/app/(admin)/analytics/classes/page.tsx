"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { useClassesReport } from "@/features/analytics/use-analytics";
import { useReportFilters } from "@/features/analytics/use-report-filters";
import { buildClassesExportColumns } from "@/features/analytics/export-columns";
import { CLASSES_REPORT_COLUMNS } from "@/features/analytics/schema";
import type { ClassesReportRow } from "@/features/analytics/admin-queries";
import { useSchools } from "@/features/schools/use-schools";
import { useClasses } from "@/features/classes/use-classes";

export default function AnalyticsClassesReportPage() {
  const t = useTranslations("admin.analytics.classes");
  const tColumns = useTranslations("admin.analytics.columns");
  const tFilters = useTranslations("admin.analytics.filters");
  const tCommon = useTranslations("common");

  const f = useReportFilters(CLASSES_REPORT_COLUMNS);
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const { data, isLoading, isError, error } = useClassesReport({
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    schoolId: f.schoolId,
    classId: f.classId,
  });

  const rows = useMemo(() => data ?? [], [data]);

  const summaryItems = useMemo(() => {
    const total = rows.length;
    const withRate = rows.filter((r) => r.attendanceRate != null);
    const avgAttendance = withRate.length > 0 ? Math.round(withRate.reduce((sum, r) => sum + (r.attendanceRate ?? 0), 0) / withRate.length) : 0;
    const withCompliance = rows.filter((r) => r.complianceRate != null);
    const avgCompliance = withCompliance.length > 0 ? Math.round(withCompliance.reduce((sum, r) => sum + (r.complianceRate ?? 0), 0) / withCompliance.length) : 0;
    return [
      { label: t("summary.totalClasses"), value: total },
      { label: t("summary.avgAttendanceRate"), value: `${avgAttendance}%` },
      { label: t("summary.avgComplianceRate"), value: `${avgCompliance}%` },
    ];
  }, [rows, t]);

  const chartData = useMemo(
    () => rows.slice(0, 12).map((r) => ({ name: r.className, attendanceRate: r.attendanceRate ?? 0 })),
    [rows],
  );

  const columns = useMemo<ColumnDef<ClassesReportRow>[]>(
    () => [
      { id: "class", accessorKey: "className", header: tColumns("class") },
      { id: "school", accessorKey: "schoolName", header: tColumns("school") },
      { id: "teacher", accessorKey: "teacherName", header: tColumns("teacher") },
      { id: "curriculum", header: tColumns("curriculum"), cell: ({ row }) => row.original.curriculumName ?? "-" },
      { id: "schedule", accessorKey: "schedule", header: tColumns("schedule") },
      { id: "enrollment", accessorKey: "enrollmentCount", header: tColumns("enrollment") },
      { id: "attendanceRate", header: tColumns("attendanceRate"), cell: ({ row }) => (row.original.attendanceRate != null ? `${row.original.attendanceRate}%` : "-") },
      { id: "complianceRate", header: tColumns("complianceRate"), cell: ({ row }) => (row.original.complianceRate != null ? `${row.original.complianceRate}%` : "-") },
      { id: "reportsFiled", accessorKey: "reportsFiledCount", header: tColumns("reportsFiled") },
      { id: "isActive", header: tColumns("isActive"), cell: ({ row }) => <Badge variant={row.original.isActive ? "default" : "secondary"}>{row.original.isActive ? tCommon("active") : tCommon("inactive")}</Badge> },
    ],
    [tColumns, tCommon],
  );

  const exportColumns = useMemo(() => buildClassesExportColumns(tColumns, tCommon, f.visibleKeys), [tColumns, tCommon, f.visibleKeys]);

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
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }} />
                <Bar dataKey="attendanceRate" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <ReportToolbar
        columns={CLASSES_REPORT_COLUMNS.map((c) => ({ key: c.key, label: tColumns(c.key) }))}
        visibility={f.visibility}
        onVisibilityChange={(key, visible) => f.setVisibility((prev) => ({ ...prev, [key]: visible }))}
        filename="classes-report"
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
