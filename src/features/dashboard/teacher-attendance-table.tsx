"use client";

import { AlertCircle, UserCheck } from "lucide-react";
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

const SUMMARY_COLUMNS: ExcelColumn<TeacherAttendanceRow>[] = [
  { header: "Teacher", key: "teacher", width: 24, value: (r) => r.teacherName },
  { header: "Sesi", key: "sessions", width: 10, value: (r) => r.totalSessions },
  { header: "Tepat Waktu", key: "onTime", width: 14, value: (r) => r.onTimeCount },
  { header: "Terlambat", key: "late", width: 12, value: (r) => r.lateCount },
  { header: "% Tepat Waktu", key: "rate", width: 16, value: (r) => r.onTimeRate },
];

const DETAIL_COLUMNS: ExcelColumn<TeacherAttendanceDetailRow>[] = [
  {
    header: "Tanggal Check-in",
    key: "date",
    width: 20,
    value: (r) => new Date(r.checkInDate).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
  },
  { header: "Teacher yang Hadir", key: "teacher", width: 24, value: (r) => r.teacherName },
  { header: "Terlambat", key: "late", width: 12, value: (r) => (r.isLate ? "Ya" : "Tidak") },
  { header: "Sebagai Pengganti", key: "substitute", width: 16, value: (r) => (r.isSubstitute ? "Ya" : "-") },
  { header: "Menggantikan", key: "originalTeacher", width: 24, value: (r) => r.originalTeacherName ?? "-" },
];

export function TeacherAttendanceTable({ days = 30 }: { days?: number }) {
  const { data, isLoading, isError } = useTeacherAttendance(days);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <UserCheck className="size-4" style={{ color: "var(--chart-5)" }} />
            Absensi Teacher/Tutor ({days} hari terakhir)
          </span>
          <ExportExcelButton
            filename={`absensi-teacher-${days}hari`}
            disabled={!data || data.length === 0}
            getSheets={async () => {
              const detail = await fetchTeacherAttendanceDetail(days);
              return [
                { name: "Ringkasan", columns: SUMMARY_COLUMNS, rows: data ?? [] },
                { name: "Detail Check-in", columns: DETAIL_COLUMNS, rows: detail },
              ];
            }}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-destructive flex items-center gap-1.5 text-sm">
            <AlertCircle className="size-4" />
            Gagal memuat data absensi teacher.
          </p>
        ) : isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada data check-in.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">Sesi</TableHead>
                  <TableHead className="text-right">Tepat Waktu</TableHead>
                  <TableHead className="text-right">Terlambat</TableHead>
                  <TableHead className="text-right">% Tepat Waktu</TableHead>
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
