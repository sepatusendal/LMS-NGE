"use client";

import { UserCheck } from "lucide-react";
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
import { useTeacherAttendance } from "./use-dashboard";

export function TeacherAttendanceTable({ days = 30 }: { days?: number }) {
  const { data, isLoading } = useTeacherAttendance(days);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <UserCheck className="size-4" style={{ color: "var(--chart-5)" }} />
          Absensi Teacher/Tutor ({days} hari terakhir)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : !data || data.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada data check-in.</p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
