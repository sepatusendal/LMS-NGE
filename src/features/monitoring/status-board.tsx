"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle, Clock, FileWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchools } from "@/features/schools/use-schools";
import { useTeachers } from "@/features/teachers/use-teachers";
import { useStatusBoard } from "./use-monitoring";
import type { ClassStatusRow } from "./schema";

const STATUS_LABEL: Record<ClassStatusRow["meetingStatus"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_started: { label: "Belum Mulai", variant: "secondary" },
  checked_in: { label: "Sudah Check-in", variant: "outline" },
  attendance_done: { label: "Absensi Selesai", variant: "outline" },
  checked_out: { label: "Sudah Check-out", variant: "outline" },
  report_submitted: { label: "Report Selesai", variant: "default" },
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function StatusBoard() {
  const [date, setDate] = useState(todayStr());
  const [schoolId, setSchoolId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const { data: schools } = useSchools();
  const { data: teachers } = useTeachers();
  const { data: rows, isLoading } = useStatusBoard(date);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (schoolId && r.schoolId !== schoolId) return false;
      if (teacherId && r.teacherId !== teacherId) return false;
      return true;
    });
  }, [rows, schoolId, teacherId]);

  const overdueCount = filtered.filter((r) => r.isOverdueCheckIn).length;
  const missingReportCount = filtered.filter((r) => r.isReportMissing).length;
  const missingLpCount = filtered.filter((r) => !r.hasLessonPlan).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-40"
        />
        <Select
          items={[
            { value: "", label: "Semua sekolah" },
            ...(schools?.map((s) => ({ value: s.id, label: s.name })) ?? []),
          ]}
          value={schoolId}
          onValueChange={(v) => setSchoolId(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua sekolah" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua sekolah</SelectItem>
            {schools?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "", label: "Semua teacher" },
            ...(teachers?.map((t) => ({ value: t.id, label: t.fullName })) ?? []),
          ]}
          value={teacherId}
          onValueChange={(v) => setTeacherId(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua teacher</SelectItem>
            {teachers?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(overdueCount > 0 || missingReportCount > 0 || missingLpCount > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {overdueCount > 0 && (
            <div className="border-destructive/30 bg-destructive/5 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <AlertTriangle className="text-destructive size-4 shrink-0" />
              <span>
                <span className="font-medium">{overdueCount}</span> kelas belum
                check-in padahal udah lewat jadwal
              </span>
            </div>
          )}
          {missingReportCount > 0 && (
            <div className="border-amber-300 bg-amber-50 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <FileWarning className="text-amber-600 size-4 shrink-0" />
              <span>
                <span className="font-medium">{missingReportCount}</span> kelas
                udah check-out tapi report belum disubmit
              </span>
            </div>
          )}
          {missingLpCount > 0 && (
            <div className="border-amber-300 bg-amber-50 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <FileWarning className="text-amber-600 size-4 shrink-0" />
              <span>
                <span className="font-medium">{missingLpCount}</span> kelas terjadwal
                hari ini belum punya lesson plan
              </span>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Status Kelas —{" "}
            {new Date(date).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Memuat data...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Clock className="text-muted-foreground mb-2 size-6" />
              <p className="text-muted-foreground text-sm">
                Tidak ada kelas terjadwal di tanggal ini.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Sekolah</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Jadwal</TableHead>
                    <TableHead>Hadir</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const status = STATUS_LABEL[r.meetingStatus];
                    return (
                      <TableRow key={r.lessonPlanId ?? `${r.classId}-no-lp`}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {r.className}
                          {r.isSubstitute && (
                            <Badge variant="outline" className="ml-1.5 text-[10px]">
                              Sub
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {r.schoolName}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {r.teacherName}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {r.scheduleStartTime}-{r.scheduleEndTime}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {r.attendanceTotal > 0 ? `${r.attendancePresent}/${r.attendanceTotal}` : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            {!r.hasLessonPlan && (
                              <Badge variant="destructive" className="text-[10px]">
                                Belum ada lesson plan
                              </Badge>
                            )}
                            <Badge variant={status.variant} className="text-[10px]">
                              {status.label}
                            </Badge>
                            {r.isOverdueCheckIn && (
                              <Badge variant="destructive" className="text-[10px]">
                                Belum check-in
                              </Badge>
                            )}
                            {r.isReportMissing && (
                              <Badge variant="secondary" className="text-[10px]">
                                Report kosong
                              </Badge>
                            )}
                            {r.isLate && (
                              <Badge variant="destructive" className="text-[10px]">
                                Terlambat
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!isLoading && filtered.length > 0 && overdueCount === 0 && missingReportCount === 0 && (
            <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
              <CheckCircle className="size-3.5 text-emerald-500" />
              Semua kelas hari ini on-track.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
