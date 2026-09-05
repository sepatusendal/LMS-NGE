"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileHeart, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { useSchools } from "@/features/schools/use-schools";
import { useStudents } from "@/features/students/use-students";
import { useParentReports } from "@/features/parent-reports/use-parent-reports";
import { fetchStudentPeriodData } from "@/features/parent-reports/queries";
import { buildMonthLabel } from "@/features/parent-reports/schema";
import type { ParentReportListItem } from "@/features/parent-reports/schema";
import type { ExcelColumn, ExcelSheet } from "@/lib/export-excel";

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1];

interface ParentReportSummaryRow {
  studentName: string;
  schoolName: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  hadirPresent: number;
  hadirTotal: number;
  lessonsCompleted: number;
  skillsCovered: string;
}

interface TeachingReportExportRow {
  studentName: string;
  date: string;
  className: string;
  meetingNumber: number;
  topic: string;
  skills: string;
  objectivesAchieved: string;
  whatWentWell: string;
  whatNeedsImprovement: string;
}

interface ProgressNoteExportRow {
  studentName: string;
  date: string;
  skillArea: string;
  note: string;
}

function buildSummaryColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  monthLabel: Record<number, string>,
): ExcelColumn<ParentReportSummaryRow>[] {
  return [
    { header: t("student"), key: "student", width: 24, value: (r) => r.studentName },
    { header: tCommon("school"), key: "school", width: 22, value: (r) => r.schoolName },
    { header: t("period"), key: "period", width: 16, value: (r) => `${monthLabel[r.periodMonth]} ${r.periodYear}` },
    { header: tCommon("status"), key: "status", width: 16, value: (r) => r.status },
    { header: t("attendance"), key: "attendance", width: 12, value: (r) => `${r.hadirPresent}/${r.hadirTotal}` },
    { header: t("lessonsCompleted"), key: "lessons", width: 16, value: (r) => r.lessonsCompleted },
    { header: t("skillsCovered"), key: "skills", width: 34, value: (r) => r.skillsCovered || "-" },
  ];
}

function buildTeachingReportColumns(
  t: (key: string) => string,
  formatDate: (d: string | null) => string,
): ExcelColumn<TeachingReportExportRow>[] {
  return [
    { header: t("student"), key: "student", width: 24, value: (r) => r.studentName },
    { header: t("date"), key: "date", width: 14, value: (r) => formatDate(r.date) },
    { header: t("class"), key: "class", width: 20, value: (r) => r.className },
    { header: "Meeting", key: "meeting", width: 10, value: (r) => r.meetingNumber },
    { header: "Topic", key: "topic", width: 28, value: (r) => r.topic },
    { header: "Skills", key: "skills", width: 30, value: (r) => r.skills },
    { header: t("objectivesAchieved"), key: "objectives", width: 16, value: (r) => r.objectivesAchieved },
    { header: "What Went Well", key: "wentWell", width: 30, value: (r) => r.whatWentWell },
    { header: "What Needs Improvement", key: "needsImprovement", width: 30, value: (r) => r.whatNeedsImprovement },
  ];
}

function buildProgressNoteColumns(
  t: (key: string) => string,
  formatDate: (d: string | null) => string,
): ExcelColumn<ProgressNoteExportRow>[] {
  return [
    { header: t("student"), key: "student", width: 24, value: (r) => r.studentName },
    { header: t("date"), key: "date", width: 14, value: (r) => formatDate(r.date) },
    { header: "Skill Area", key: "skillArea", width: 20, value: (r) => r.skillArea },
    { header: t("note"), key: "note", width: 40, value: (r) => r.note },
  ];
}

async function buildParentReportSheets(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  tObjectives: (key: string) => string,
  monthLabel: Record<number, string>,
  formatDate: (d: string | null) => string,
  reports: ParentReportListItem[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<ExcelSheet<any>[]> {
  const periodData = await Promise.all(
    reports.map((r) => fetchStudentPeriodData(r.studentId, r.periodMonth, r.periodYear)),
  );
  const objectivesLabelExport: Record<string, string> = {
    YES: tObjectives("achieved"),
    PARTIALLY: tObjectives("partial"),
    NO: tObjectives("notAchieved"),
  };

  const summaryRows: ParentReportSummaryRow[] = reports.map((r, i) => {
    const d = periodData[i];
    return {
      studentName: r.studentName,
      schoolName: r.schoolName,
      periodMonth: r.periodMonth,
      periodYear: r.periodYear,
      status: r.status === "GENERATED" ? t("generated") : t("draft"),
      hadirPresent: d.attendance.present,
      hadirTotal: d.attendance.total,
      lessonsCompleted: d.lessonsCompleted,
      skillsCovered: d.skillsCovered.join(", "),
    };
  });

  const teachingReportRows: TeachingReportExportRow[] = periodData.flatMap((d) =>
    d.teachingReports.map((tr) => ({
      studentName: d.studentName,
      date: tr.date,
      className: tr.className,
      meetingNumber: tr.meetingNumber,
      topic: tr.topic,
      skills: tr.skills.join(", "),
      objectivesAchieved: tr.objectivesAchieved ? objectivesLabelExport[tr.objectivesAchieved] : "-",
      whatWentWell: tr.whatWentWell ?? "-",
      whatNeedsImprovement: tr.whatNeedsImprovement ?? "-",
    })),
  );

  const progressNoteRows: ProgressNoteExportRow[] = periodData.flatMap((d) =>
    d.progressNotes.map((p) => ({
      studentName: d.studentName,
      date: p.date,
      skillArea: p.skillArea ?? "-",
      note: p.note,
    })),
  );

  return [
    { name: t("summary"), columns: buildSummaryColumns(t, tCommon, monthLabel), rows: summaryRows },
    { name: t("teachingReportDetail"), columns: buildTeachingReportColumns(t, formatDate), rows: teachingReportRows },
    { name: "Progress Notes", columns: buildProgressNoteColumns(t, formatDate), rows: progressNoteRows },
  ];
}

export default function ParentReportsPage() {
  const t = useTranslations("admin.parentReports");
  const tCommon = useTranslations("common");
  const tObjectives = useTranslations("reportForm.objectivesStatus");
  const tMonths = useTranslations("admin.parentReports.months");
  const locale = useLocale();
  const router = useRouter();
  const { data: reports, isLoading, isError, error } = useParentReports();
  const { data: schools } = useSchools();

  const [open, setOpen] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(String(CURRENT_MONTH));
  const [year, setYear] = useState(String(CURRENT_YEAR));

  const { data: students } = useStudents(schoolId || undefined);

  const monthLabel = useMemo(() => buildMonthLabel(tMonths), [tMonths]);
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  const monthOptions = useMemo(
    () => Object.entries(monthLabel).map(([value, label]) => ({ value, label })),
    [monthLabel],
  );

  function handleGenerate() {
    if (!studentId) return;
    router.push(`/parent-reports/review?studentId=${studentId}&month=${month}&year=${year}`);
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("subtitle", { count: reports?.length ?? 0 })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ExportExcelButton
            filename="laporan-bulanan-orang-tua"
            disabled={!reports || reports.length === 0}
            getSheets={() => buildParentReportSheets(t, tCommon, tObjectives, monthLabel, formatDate, reports ?? [])}
          />
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            {t("createReport")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createDialogTitle")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{tCommon("school")}</label>
                <Select
                  items={schools?.map((s) => ({ value: s.id, label: s.name })) ?? []}
                  value={schoolId}
                  onValueChange={(v) => {
                    setSchoolId(v ?? "");
                    setStudentId("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectSchoolEllipsis")} />
                  </SelectTrigger>
                  <SelectContent>
                    {schools?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t("student")}</label>
                <Select
                  items={students?.map((s) => ({ value: s.id, label: s.nis ? `${s.fullName} (${s.nis})` : s.fullName })) ?? []}
                  value={studentId}
                  onValueChange={(v) => setStudentId(v ?? "")}
                >
                  <SelectTrigger className="w-full" disabled={!schoolId}>
                    <SelectValue placeholder={schoolId ? t("selectStudentEllipsis") : t("selectSchoolFirst")} />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName}
                        {s.nis ? ` (${s.nis})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium">{t("month")}</label>
                  <Select items={monthOptions} value={month} onValueChange={(v) => v && setMonth(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium">{t("year")}</label>
                  <Select
                    items={YEAR_OPTIONS.map((y) => ({ value: String(y), label: String(y) }))}
                    value={year}
                    onValueChange={(v) => v && setYear(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGenerate} disabled={!studentId}>
                {t("continueToReview")}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <p className="text-muted-foreground p-4 text-sm">{tCommon("dataTable.loading")}</p>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="text-destructive mb-2 size-6" />
            <p className="text-muted-foreground text-sm">{error?.message || t("loadError")}</p>
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileHeart className="text-muted-foreground mb-2 size-6" />
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("student")}</TableHead>
                <TableHead>{tCommon("school")}</TableHead>
                <TableHead>{t("period")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                <TableHead>{t("generatedAt")}</TableHead>
                <TableHead className="text-right">{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{r.studentName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.schoolName}</TableCell>
                  <TableCell>
                    {monthLabel[r.periodMonth]} {r.periodYear}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "GENERATED" ? "default" : "secondary"}>
                      {r.status === "GENERATED" ? t("generated") : t("draft")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.generatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/parent-reports/review?studentId=${r.studentId}&month=${r.periodMonth}&year=${r.periodYear}`,
                        )
                      }
                    >
                      {t("viewEdit")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
