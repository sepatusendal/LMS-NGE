"use client";

import { useMemo } from "react";
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
import { useStudentAttendanceReport } from "@/features/analytics/use-analytics";
import { useReportFilters } from "@/features/analytics/use-report-filters";
import { buildStudentAttendanceExportColumns, buildStudentAttendanceSummaryExportColumns } from "@/features/analytics/export-columns";
import { STUDENT_ATTENDANCE_COLUMNS } from "@/features/analytics/schema";
import type { StudentAttendanceReportRow } from "@/features/analytics/admin-queries";
import { useSchools } from "@/features/schools/use-schools";
import { useClasses } from "@/features/classes/use-classes";
import { parseLocalDate } from "@/lib/date";

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PRESENT: "default",
  LATE: "secondary",
  EXCUSED: "outline",
  ABSENT: "destructive",
};

export default function StudentAttendanceReportPage() {
  const t = useTranslations("admin.analytics.studentAttendance");
  const tColumns = useTranslations("admin.analytics.columns");
  const tFilters = useTranslations("admin.analytics.filters");
  const locale = useLocale();

  const f = useReportFilters(STUDENT_ATTENDANCE_COLUMNS);
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const { data, isLoading, isError, error } = useStudentAttendanceReport({
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    schoolId: f.schoolId,
    classId: f.classId,
  });

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const summaryRows = useMemo(() => data?.summary ?? [], [data]);

  const summaryItems = useMemo(() => {
    const totalStudents = summaryRows.length;
    const avgRate = totalStudents > 0 ? Math.round(summaryRows.reduce((sum, s) => sum + s.attendanceRate, 0) / totalStudents) : 0;
    const totalAbsences = summaryRows.reduce((sum, s) => sum + s.absent, 0);
    return [
      { label: t("summary.totalStudents"), value: totalStudents },
      { label: t("summary.avgAttendanceRate"), value: `${avgRate}%` },
      { label: t("summary.totalAbsences"), value: totalAbsences },
    ];
  }, [summaryRows, t]);

  const chartData = useMemo(() => {
    const byStatus = { PRESENT: 0, LATE: 0, EXCUSED: 0, ABSENT: 0 } as Record<string, number>;
    rows.forEach((r) => { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1; });
    return Object.entries(byStatus).map(([status, count]) => ({ status, count }));
  }, [rows]);

  const columns = useMemo<ColumnDef<StudentAttendanceReportRow>[]>(
    () => [
      { id: "date", accessorKey: "date", header: tColumns("date"), cell: ({ row }) => row.original.date ? parseLocalDate(row.original.date).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" }) : "-" },
      { id: "school", accessorKey: "schoolName", header: tColumns("school") },
      { id: "class", accessorKey: "className", header: tColumns("class") },
      { id: "meetingNumber", accessorKey: "meetingNumber", header: tColumns("meetingNumber") },
      { id: "student", accessorKey: "studentName", header: tColumns("student") },
      { id: "nis", header: tColumns("nis"), cell: ({ row }) => row.original.nis ?? "-" },
      { id: "status", header: tColumns("status"), cell: ({ row }) => <Badge variant={STATUS_BADGE[row.original.status] ?? "outline"}>{row.original.status}</Badge> },
      { id: "notes", header: tColumns("notes"), cell: ({ row }) => row.original.notes ?? "-" },
    ],
    [tColumns, locale],
  );

  const exportColumns = useMemo(() => buildStudentAttendanceExportColumns(tColumns, f.visibleKeys), [tColumns, f.visibleKeys]);
  const summaryExportColumns = useMemo(() => buildStudentAttendanceSummaryExportColumns(tColumns), [tColumns]);

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
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }} />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <ReportToolbar
        columns={STUDENT_ATTENDANCE_COLUMNS.map((c) => ({ key: c.key, label: tColumns(c.key) }))}
        visibility={f.visibility}
        onVisibilityChange={(key, visible) => f.setVisibility((prev) => ({ ...prev, [key]: visible }))}
        filename="student-attendance-report"
        sheets={[
          { name: t("summarySheet"), columns: summaryExportColumns, rows: summaryRows },
          { name: t("detailSheet"), columns: exportColumns, rows },
        ]}
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
