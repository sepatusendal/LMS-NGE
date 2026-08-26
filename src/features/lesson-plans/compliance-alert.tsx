"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClasses } from "@/features/classes/use-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";
import { useAdminReports } from "@/features/reports/use-admin-reports";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import type { ExcelColumn } from "@/lib/export-excel";
import { parseLocalDate } from "@/lib/date";
import { getClassComplianceStatus } from "./compliance";

interface NonCompliantClass {
  id: string;
  name: string;
  classType: "REGULAR" | "TEACHER_TRAINING";
  schoolName: string;
  teacherId: string;
  teacherName: string;
  latestDate: string | null;
  daysLeft: number;
}

interface LessonPlanComplianceRow extends NonCompliantClass {
  isCompliant: boolean;
}

interface TeacherComplianceRow {
  teacherId: string;
  teacherName: string;
  lateCount: number;
  worstClassName: string;
  worstDaysLeft: number;
}

const TEACHER_COMPLIANCE_COLUMNS: ExcelColumn<TeacherComplianceRow>[] = [
  { header: "Teacher", key: "teacher", width: 22, value: (r) => r.teacherName },
  { header: "Jumlah Kelas Telat", key: "count", width: 18, value: (r) => r.lateCount },
  { header: "Kelas Paling Telat", key: "worstClass", width: 22, value: (r) => r.worstClassName },
  { header: "Sisa/Telat Hari", key: "worstDays", width: 16, value: (r) => r.worstDaysLeft },
];

interface ReportComplianceRow {
  className: string;
  schoolName: string;
  teacherName: string;
  totalReports: number;
  latestReportDate: string | null;
  daysSinceLastReport: number | null;
}

const LP_COMPLIANCE_COLUMNS: ExcelColumn<LessonPlanComplianceRow>[] = [
  { header: "Kelas", key: "class", width: 22, value: (r) => r.name },
  { header: "Tipe Kelas", key: "type", width: 16, value: (r) => (r.classType === "TEACHER_TRAINING" ? "Guru & Staff" : "Reguler") },
  { header: "Sekolah", key: "school", width: 22, value: (r) => r.schoolName },
  { header: "Teacher", key: "teacher", width: 22, value: (r) => r.teacherName },
  { header: "Lesson Plan Terjauh", key: "latestDate", width: 18, value: (r) => (r.latestDate ? parseLocalDate(r.latestDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Belum ada") },
  { header: "Sisa Hari", key: "daysLeft", width: 12, value: (r) => r.daysLeft },
  { header: "Status", key: "status", width: 14, value: (r) => (r.isCompliant ? "Patuh" : "Perlu Perhatian") },
];

const REPORT_COMPLIANCE_COLUMNS: ExcelColumn<ReportComplianceRow>[] = [
  { header: "Kelas", key: "class", width: 22, value: (r) => r.className },
  { header: "Sekolah", key: "school", width: 22, value: (r) => r.schoolName },
  { header: "Teacher", key: "teacher", width: 22, value: (r) => r.teacherName },
  { header: "Total Report", key: "total", width: 14, value: (r) => r.totalReports },
  { header: "Report Terakhir", key: "latest", width: 18, value: (r) => (r.latestReportDate ? parseLocalDate(r.latestReportDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Belum pernah") },
  { header: "Hari Sejak Report Terakhir", key: "daysSince", width: 20, value: (r) => r.daysSinceLastReport ?? "-" },
];

export function ComplianceAlert() {
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: lessonPlans, isLoading: plansLoading } = useLessonPlans();
  const { data: reports } = useAdminReports();
  const [view, setView] = useState<"class" | "teacher">("class");

  const { nonCompliant, allCompliance } = useMemo(() => {
    if (!classes || !lessonPlans) return { nonCompliant: [], allCompliance: [] };
    const now = Date.now();

    const all: LessonPlanComplianceRow[] = classes.map((c) => {
      const status = getClassComplianceStatus(c.id, lessonPlans, now);
      return {
        id: c.id,
        name: c.name,
        classType: c.classType,
        schoolName: c.schoolName,
        teacherId: c.teacherId,
        teacherName: c.teacherName,
        latestDate: status.latestDate,
        daysLeft: status.daysLeft,
        isCompliant: status.isCompliant,
      };
    });

    const bad = all.filter((c) => !c.isCompliant).sort((a, b) => a.daysLeft - b.daysLeft);
    return { nonCompliant: bad, allCompliance: all };
  }, [classes, lessonPlans]);

  const byTeacher = useMemo((): TeacherComplianceRow[] => {
    const grouped = new Map<string, NonCompliantClass[]>();
    for (const c of nonCompliant) {
      const list = grouped.get(c.teacherId) ?? [];
      list.push(c);
      grouped.set(c.teacherId, list);
    }
    return Array.from(grouped.entries())
      .map(([teacherId, list]) => {
        const worst = list.reduce((a, b) => (a.daysLeft <= b.daysLeft ? a : b));
        return {
          teacherId,
          teacherName: list[0].teacherName,
          lateCount: list.length,
          worstClassName: worst.name,
          worstDaysLeft: worst.daysLeft,
        };
      })
      .sort((a, b) => a.worstDaysLeft - b.worstDaysLeft || b.lateCount - a.lateCount);
  }, [nonCompliant]);

  const reportCompliance = useMemo((): ReportComplianceRow[] => {
    if (!classes) return [];
    const now = Date.now();
    const byClass = new Map<string, { count: number; latest: string | null }>();
    (reports ?? []).forEach((r) => {
      const cur = byClass.get(r.classId) ?? { count: 0, latest: null };
      cur.count += 1;
      if (!cur.latest || r.actualTeachingDate > cur.latest) cur.latest = r.actualTeachingDate;
      byClass.set(r.classId, cur);
    });

    return classes.map((c) => {
      const info = byClass.get(c.id) ?? { count: 0, latest: null };
      const daysSince = info.latest ? Math.floor((now - parseLocalDate(info.latest).getTime()) / (24 * 60 * 60 * 1000)) : null;
      return {
        className: c.name,
        schoolName: c.schoolName,
        teacherName: c.teacherName,
        totalReports: info.count,
        latestReportDate: info.latest,
        daysSinceLastReport: daysSince,
      };
    });
  }, [classes, reports]);

  const isLoading = classesLoading || plansLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="text-destructive size-4" />
          Kepatuhan Lesson Plan
          {!isLoading && (
            <span className="text-muted-foreground ml-auto text-xs font-normal">
              {nonCompliant.length}/{classes?.length ?? 0} kelas perlu perhatian
            </span>
          )}
          <ExportExcelButton
            filename="kepatuhan-lesson-plan-report"
            disabled={isLoading}
            sheets={[
              { name: "Kepatuhan Lesson Plan", columns: LP_COMPLIANCE_COLUMNS, rows: allCompliance },
              { name: "Rekap per Teacher", columns: TEACHER_COMPLIANCE_COLUMNS, rows: byTeacher },
              { name: "Kepatuhan Daily Teaching Report", columns: REPORT_COMPLIANCE_COLUMNS, rows: reportCompliance },
            ]}
          />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : nonCompliant.length === 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="size-4" style={{ color: "var(--status-good)" }} />
            <span>Semua kelas aman — lesson plan tersedia min. 2 minggu ke depan.</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-muted inline-flex items-center gap-0.5 rounded-lg p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setView("class")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  view === "class" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                Per Kelas
              </button>
              <button
                type="button"
                onClick={() => setView("teacher")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors",
                  view === "teacher" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                Per Teacher
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border">
              {view === "class" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonCompliant.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {c.name}
                          {c.classType === "TEACHER_TRAINING" && (
                            <Badge variant="secondary" className="ml-1.5 text-[10px]">
                              Guru & Staff
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {c.teacherName}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={c.latestDate === null ? "destructive" : "secondary"} className="text-xs">
                            {c.latestDate === null
                              ? "Belum ada"
                              : c.daysLeft < 0
                                ? `Telat ${Math.abs(c.daysLeft)}h`
                                : `${c.daysLeft}h lagi`}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-right">Jumlah Kelas Telat</TableHead>
                      <TableHead className="text-right">Paling Telat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byTeacher.map((t) => (
                      <TableRow key={t.teacherId}>
                        <TableCell className="font-medium whitespace-nowrap">{t.teacherName}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={t.lateCount > 1 ? "destructive" : "secondary"} className="text-xs">
                            {t.lateCount} kelas
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right whitespace-nowrap text-xs">
                          {t.worstClassName} ({t.worstDaysLeft < 0 ? `Telat ${Math.abs(t.worstDaysLeft)}h` : `${t.worstDaysLeft}h lagi`})
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
