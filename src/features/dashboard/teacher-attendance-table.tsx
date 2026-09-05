"use client";

import { AlertCircle, UserCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import type { ExcelColumn } from "@/lib/export-excel";
import { useTeacherAttendance } from "./use-dashboard";
import { fetchTeacherAttendanceDetail } from "./queries";
import type { TeacherAttendanceDetailRow } from "./queries";
import type { TeacherAttendanceRow } from "./schema";

function buildSummaryColumns(t: (key: string) => string): ExcelColumn<TeacherAttendanceRow>[] {
  return [
    { header: "Teacher", key: "teacher", width: 24, value: (r) => r.teacherName },
    { header: t("sessions"), key: "sessions", width: 10, value: (r) => r.totalSessions },
    { header: t("onTime"), key: "onTime", width: 14, value: (r) => r.onTimeCount },
    { header: t("late"), key: "late", width: 12, value: (r) => r.lateCount },
    { header: t("onTimePercent"), key: "rate", width: 16, value: (r) => r.onTimeRate },
  ];
}

function buildDetailColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  locale: string,
): ExcelColumn<TeacherAttendanceDetailRow>[] {
  return [
    {
      header: t("checkInDate"),
      key: "date",
      width: 20,
      value: (r) => new Date(r.checkInDate).toLocaleString(locale === "en" ? "en-US" : "id-ID", { dateStyle: "medium", timeStyle: "short" }),
    },
    { header: t("teacherPresent"), key: "teacher", width: 24, value: (r) => r.teacherName },
    { header: t("late"), key: "late", width: 12, value: (r) => (r.isLate ? tCommon("yes") : tCommon("no")) },
    { header: t("asSubstitute"), key: "substitute", width: 16, value: (r) => (r.isSubstitute ? tCommon("yes") : "-") },
    { header: t("substitutingFor"), key: "originalTeacher", width: 24, value: (r) => r.originalTeacherName ?? "-" },
  ];
}

export function TeacherAttendanceTable({ days = 30 }: { days?: number }) {
  const t = useTranslations("admin.dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { data, isLoading, isError } = useTeacherAttendance(days);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <UserCheck className="size-4" style={{ color: "var(--chart-5)" }} />
            {t("teacherAttendanceTitle", { days })}
          </span>
          <ExportExcelButton
            filename={`absensi-teacher-${days}hari`}
            disabled={!data || data.length === 0}
            getSheets={async () => {
              const detail = await fetchTeacherAttendanceDetail(days);
              return [
                { name: t("summary"), columns: buildSummaryColumns(t), rows: data ?? [] },
                { name: t("checkInDetail"), columns: buildDetailColumns(t, tCommon, locale), rows: detail },
              ];
            }}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-destructive flex items-center gap-1.5 text-sm">
            <AlertCircle className="size-4" />
            {t("failedToLoadTeacherAttendance")}
          </p>
        ) : isLoading ? (
          <p className="text-muted-foreground text-sm">{t("loadingData")}</p>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noCheckInData")}</p>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">{t("sessions")}</TableHead>
                  <TableHead className="text-right">{t("onTime")}</TableHead>
                  <TableHead className="text-right">{t("late")}</TableHead>
                  <TableHead className="text-right">{t("onTimePercent")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.teacherId}>
                    <TableCell className="font-medium">{t.teacherName}</TableCell>
                    <TableCell className="text-right">{t.totalSessions}</TableCell>
                    <TableCell className="text-right">{t.onTimeCount}</TableCell>
                    <TableCell className="text-right">{t.lateCount}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={t.onTimeRate >= 80 ? "default" : "destructive"} className="text-xs">
                        {t.onTimeRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
