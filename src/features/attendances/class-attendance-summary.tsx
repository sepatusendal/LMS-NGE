"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Search, UserX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import type { ExcelColumn } from "@/lib/export-excel";
import { parseLocalDate } from "@/lib/date";
import { useClassAttendanceSummary } from "./use-attendances";
import type { StudentAbsence, StudentAttendanceSummary } from "./admin-queries";

const SUMMARY_COLUMNS: ExcelColumn<StudentAttendanceSummary>[] = [
  { header: "Siswa", key: "student", width: 24, value: (s) => s.studentName },
  { header: "NIS", key: "nis", width: 14, value: (s) => s.nis ?? "-" },
  { header: "Hadir", key: "present", width: 10, value: (s) => s.present },
  { header: "Telat", key: "late", width: 10, value: (s) => s.late },
  { header: "Izin", key: "excused", width: 10, value: (s) => s.excused },
  { header: "Alpa", key: "absent", width: 10, value: (s) => s.absent },
  { header: "Total Pertemuan", key: "total", width: 16, value: (s) => s.totalMeetings },
  { header: "% Kehadiran", key: "rate", width: 14, value: (s) => Math.round(s.attendanceRate * 100) },
];

interface AbsenceExportRow extends StudentAbsence {
  studentName: string;
}

const ABSENCE_COLUMNS: ExcelColumn<AbsenceExportRow>[] = [
  { header: "Siswa", key: "student", width: 24, value: (a) => a.studentName },
  { header: "Meeting", key: "meeting", width: 10, value: (a) => a.meetingNumber },
  { header: "Topic", key: "topic", width: 26, value: (a) => a.topic },
  { header: "Tanggal", key: "date", width: 14, value: (a) => parseLocalDate(a.scheduledDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) },
  { header: "Status", key: "status", width: 12, value: (a) => (a.status === "ABSENT" ? "Alpa" : "Izin") },
];

// A student is flagged for attention once they've missed a quarter or more
// of tracked meetings — arbitrary but gives admin/coordinator a quick signal
// without requiring them to eyeball every row's percentage.
const ATTENTION_THRESHOLD = 0.75;

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function formatDate(dateStr: string, dtLocale: string) {
  return parseLocalDate(dateStr).toLocaleDateString(dtLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AttendanceBar({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const color =
    rate >= ATTENTION_THRESHOLD
      ? "bg-emerald-500"
      : rate >= 0.5
        ? "bg-amber-500"
        : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-1.5 w-16 shrink-0 overflow-hidden rounded-full">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted-foreground w-9 shrink-0 text-xs tabular-nums">{pct}%</span>
    </div>
  );
}

function StudentRow({
  student,
  t,
  dtLocale,
}: {
  student: StudentAttendanceSummary;
  t: ReturnType<typeof useTranslations>;
  dtLocale: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsAttention = student.attendanceRate < ATTENTION_THRESHOLD && student.totalMeetings >= 2;
  const canExpand = student.absences.length > 0;

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        onClick={() => canExpand && setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
          canExpand && "hover:bg-muted/50",
        )}
      >
        {canExpand ? (
          expanded ? (
            <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
          )
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
          {initials(student.studentName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
            {student.studentName}
            {needsAttention && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <AlertTriangle className="size-2.5" />
                {t("needsAttention")}
              </Badge>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("present")} {student.present} · {t("late")} {student.late} · {t("excused")} {student.excused} ·{" "}
            {t("absentLabel")}{" "}
            <span className={student.absent > 0 ? "text-destructive font-medium" : undefined}>
              {student.absent}
            </span>{" "}
            {t("outOfMeetings", { count: student.totalMeetings })}
          </p>
        </div>
        <AttendanceBar rate={student.attendanceRate} />
      </button>

      {expanded && (
        <div className="bg-muted/30 space-y-1.5 px-3 pb-3 pl-10">
          {student.absences.map((a) => (
            <div key={a.meetingId} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground truncate">
                {t("meetingLine", { number: a.meetingNumber, topic: a.topic, date: formatDate(a.scheduledDate, dtLocale) })}
              </span>
              <Badge
                variant={a.status === "ABSENT" ? "destructive" : "secondary"}
                className="shrink-0 text-[10px]"
              >
                {a.status === "ABSENT" ? t("absentShort") : t("excusedShort")}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClassAttendanceSummary({ classId }: { classId: string }) {
  const { data, isLoading } = useClassAttendanceSummary(classId);
  const [search, setSearch] = useState("");
  const t = useTranslations("classAttendanceSummary");
  const locale = useLocale();
  const dtLocale = locale === "en" ? "en-US" : "id-ID";

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((s) => s.studentName.toLowerCase().includes(q));
  }, [data, search]);

  const flaggedCount = (data ?? []).filter(
    (s) => s.attendanceRate < ATTENTION_THRESHOLD && s.totalMeetings >= 2,
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-medium">{t("title")}</h2>
        {!isLoading && data && data.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:flex-initial">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="border-input h-8 w-full rounded-md border bg-transparent py-1 pr-2 pl-8 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-40"
              />
            </div>
            <ExportExcelButton
              filename="absensi-siswa"
              sheets={[
                { name: "Ringkasan", columns: SUMMARY_COLUMNS, rows: data },
                {
                  name: "Detail Alpa Izin",
                  columns: ABSENCE_COLUMNS,
                  rows: data.flatMap((s) => s.absences.map((a) => ({ ...a, studentName: s.studentName }))),
                },
              ]}
            />
          </div>
        )}
      </div>

      {!isLoading && data && data.length > 0 && flaggedCount > 0 && (
        <div className="text-destructive flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs">
          <AlertTriangle className="size-3.5 shrink-0" />
          {t("flaggedCount", { count: flaggedCount, threshold: Math.round(ATTENTION_THRESHOLD * 100) })}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-muted-foreground flex items-center gap-2 px-3 py-6 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </div>
          ) : !data || data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <UserX className="text-muted-foreground/60 size-6" />
              <p className="text-muted-foreground text-sm">{t("empty")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              {t("noSearchResults", { search })}
            </p>
          ) : (
            filtered.map((s) => <StudentRow key={s.studentId} student={s} t={t} dtLocale={dtLocale} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
