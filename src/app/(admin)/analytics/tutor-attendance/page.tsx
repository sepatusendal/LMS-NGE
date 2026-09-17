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
import { useTutorAttendanceReport } from "@/features/analytics/use-analytics";
import { useReportFilters } from "@/features/analytics/use-report-filters";
import { buildTutorAttendanceExportColumns } from "@/features/analytics/export-columns";
import { TUTOR_ATTENDANCE_COLUMNS } from "@/features/analytics/schema";
import type { TutorAttendanceReportRow } from "@/features/analytics/admin-queries";
import { useSchools } from "@/features/schools/use-schools";
import { useClasses } from "@/features/classes/use-classes";
import { parseLocalDate } from "@/lib/date";

export default function TutorAttendanceReportPage() {
  const t = useTranslations("admin.analytics.tutorAttendance");
  const tColumns = useTranslations("admin.analytics.columns");
  const tFilters = useTranslations("admin.analytics.filters");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const f = useReportFilters(TUTOR_ATTENDANCE_COLUMNS);
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const { data, isLoading, isError, error } = useTutorAttendanceReport({
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    schoolId: f.schoolId,
    classId: f.classId,
  });

  const rows = useMemo(() => data ?? [], [data]);

  const formatDateTime = useCallback(
    (d: string | null) =>
      d ? new Date(d).toLocaleString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-",
    [locale],
  );

  const summaryItems = useMemo(() => {
    const total = rows.length;
    const onTime = rows.filter((r) => !r.isLate).length;
    const substituteCount = rows.filter((r) => r.isSubstitute).length;
    return [
      { label: t("summary.totalCheckIns"), value: total },
      { label: t("summary.onTimeRate"), value: total > 0 ? `${Math.round((onTime / total) * 100)}%` : "-" },
      { label: t("summary.lateCount"), value: rows.filter((r) => r.isLate).length },
      { label: t("summary.substituteCount"), value: substituteCount },
    ];
  }, [rows, t]);

  const chartData = useMemo(() => {
    const byTeacher = new Map<string, { name: string; onTime: number; late: number }>();
    rows.forEach((r) => {
      const entry = byTeacher.get(r.teacherId) ?? { name: r.teacherName, onTime: 0, late: 0 };
      if (r.isLate) entry.late += 1;
      else entry.onTime += 1;
      byTeacher.set(r.teacherId, entry);
    });
    return Array.from(byTeacher.values()).sort((a, b) => b.onTime + b.late - (a.onTime + a.late)).slice(0, 10);
  }, [rows]);

  const columns = useMemo<ColumnDef<TutorAttendanceReportRow>[]>(
    () => [
      { id: "date", accessorKey: "date", header: tColumns("date"), cell: ({ row }) => parseLocalDate(row.original.date).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" }) },
      { id: "teacher", accessorKey: "teacherName", header: tColumns("teacher") },
      { id: "school", accessorKey: "schoolName", header: tColumns("school") },
      { id: "class", accessorKey: "className", header: tColumns("class") },
      { id: "meetingNumber", accessorKey: "meetingNumber", header: tColumns("meetingNumber") },
      { id: "scheduledTime", accessorKey: "scheduledTime", header: tColumns("scheduledTime") },
      { id: "checkInTime", header: tColumns("checkInTime"), cell: ({ row }) => formatDateTime(row.original.checkInTime) },
      { id: "isLate", header: tColumns("isLate"), cell: ({ row }) => <Badge variant={row.original.isLate ? "destructive" : "default"}>{row.original.isLate ? tCommon("yes") : tCommon("no")}</Badge> },
      { id: "hasPhoto", header: tColumns("hasPhoto"), cell: ({ row }) => (row.original.hasPhoto ? tCommon("yes") : tCommon("no")) },
      { id: "checkOutTime", header: tColumns("checkOutTime"), cell: ({ row }) => formatDateTime(row.original.checkOutTime) },
      { id: "durationMinutes", accessorKey: "durationMinutes", header: tColumns("durationMinutes"), cell: ({ row }) => row.original.durationMinutes ?? "-" },
      { id: "isSubstitute", header: tColumns("isSubstitute"), cell: ({ row }) => (row.original.isSubstitute ? <Badge variant="secondary">{tCommon("yes")}</Badge> : "-") },
      { id: "coveringFor", header: tColumns("coveringFor"), cell: ({ row }) => row.original.assignedTeacherName ?? "-" },
      { id: "notes", header: tColumns("notes"), cell: ({ row }) => row.original.notes ?? "-" },
    ],
    [tColumns, tCommon, locale, formatDateTime],
  );

  const exportColumns = useMemo(
    () => buildTutorAttendanceExportColumns(tColumns, tCommon, formatDateTime, f.visibleKeys),
    [tColumns, tCommon, f.visibleKeys, formatDateTime],
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
                <Bar dataKey="onTime" stackId="a" fill="var(--chart-1)" name={tCommon("onTime")} />
                <Bar dataKey="late" stackId="a" fill="var(--status-warning)" name={tColumns("isLate")} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <ReportToolbar
        columns={TUTOR_ATTENDANCE_COLUMNS.map((c) => ({ key: c.key, label: tColumns(c.key) }))}
        visibility={f.visibility}
        onVisibilityChange={(key, visible) => f.setVisibility((prev) => ({ ...prev, [key]: visible }))}
        filename="tutor-attendance-report"
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
