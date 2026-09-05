"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
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
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { useSchools } from "@/features/schools/use-schools";
import { useClasses } from "@/features/classes/use-classes";
import { useAdminReports } from "@/features/reports/use-admin-reports";
import { buildObjectivesLabel } from "@/features/reports/schema";
import type { AdminReportListItem } from "@/features/reports/admin-queries";
import type { ExcelColumn } from "@/lib/export-excel";

const OBJECTIVES_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  YES: "default",
  PARTIALLY: "secondary",
  NO: "destructive",
};

function buildExportColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  objectivesLabel: Record<string, string>,
  formatDate: (d: string) => string,
): ExcelColumn<AdminReportListItem>[] {
  return [
    { header: t("date"), key: "date", width: 14, value: (r) => formatDate(r.actualTeachingDate) },
    { header: tCommon("school"), key: "school", width: 22, value: (r) => r.schoolName },
    { header: t("class"), key: "class", width: 22, value: (r) => r.className },
    { header: t("classTypeHeader"), key: "classType", width: 16, value: (r) => (r.classType === "TEACHER_TRAINING" ? t("classTypeTraining") : t("classTypeRegular")) },
    { header: "Teacher", key: "teacher", width: 22, value: (r) => r.teacherName },
    { header: "Substitute", key: "substitute", width: 12, value: (r) => (r.isSubstitute ? tCommon("yes") : "-") },
    { header: "Meeting", key: "meeting", width: 10, value: (r) => r.meetingNumber },
    { header: "Topic", key: "topic", width: 30, value: (r) => r.topic },
    { header: t("skillsTaught"), key: "skills", width: 30, value: (r) => (r.skills.length > 0 ? r.skills.join(", ") : "-") },
    { header: t("attendance"), key: "attendance", width: 12, value: (r) => (r.attendanceTotal > 0 ? `${r.attendancePresent}/${r.attendanceTotal}` : "-") },
    { header: t("objectivesAchieved"), key: "objectives", width: 16, value: (r) => (r.objectivesAchieved ? objectivesLabel[r.objectivesAchieved] : "-") },
    { header: t("objectivesChecklist"), key: "objectivesChecklist", width: 18, value: (r) => (r.objectivesTotal > 0 ? `${r.objectivesAchievedCount}/${r.objectivesTotal}` : "-") },
    { header: "What Went Well", key: "wentWell", width: 34, value: (r) => r.whatWentWell ?? "-" },
    { header: "What Needs Improvement", key: "needsImprovement", width: 34, value: (r) => r.whatNeedsImprovement ?? "-" },
    { header: "Action Plan", key: "actionPlan", width: 34, value: (r) => r.actionPlan ?? "-" },
    { header: t("nextLessonNotesHeader"), key: "nextLesson", width: 34, value: (r) => r.nextLessonNotes ?? "-" },
    { header: "PR/Homework", key: "homework", width: 30, value: (r) => r.homeworkAssigned ?? "-" },
    { header: "Summary", key: "summary", width: 34, value: (r) => r.summary ?? "-" },
    { header: "Language & Skills Focus (Albright)", key: "languageSkillsFocus", width: 30, value: (r) => r.languageSkillsFocus ?? "-" },
    { header: "Activities (Albright)", key: "activitiesLog", width: 40, value: (r) => r.activitiesLog ?? "-" },
    { header: "Resources (Albright)", key: "resourcesUsed", width: 30, value: (r) => r.resourcesUsed ?? "-" },
    {
      header: t("studentFollowUpsHeader"),
      key: "followUps",
      width: 40,
      value: (r) => (r.followUps.length > 0 ? r.followUps.map((f) => `${f.studentName}: ${f.note}`).join(" | ") : "-"),
    },
  ];
}

export default function AdminReportsPage() {
  const t = useTranslations("admin.reports");
  const tCommon = useTranslations("common");
  const tObjectives = useTranslations("reportForm.objectivesStatus");
  const locale = useLocale();
  const router = useRouter();
  const { data: reports, isLoading, isError, error } = useAdminReports();
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [classType, setClassType] = useState("");

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" });
  const objectivesLabel = useMemo(() => buildObjectivesLabel(tObjectives), [tObjectives]);

  const schoolIdByClassId = useMemo(() => new Map((classes ?? []).map((c) => [c.id, c.schoolId])), [classes]);

  const filtered = useMemo(() => {
    if (!reports) return [];
    return reports.filter((r) => {
      if (schoolId && schoolIdByClassId.get(r.classId) !== schoolId) return false;
      if (classId && r.classId !== classId) return false;
      if (classType && r.classType !== classType) return false;
      return true;
    });
  }, [reports, schoolId, classId, classType, schoolIdByClassId]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("subtitle", { count: reports?.length ?? 0 })}
          </p>
        </div>
        <ExportExcelButton
          filename="daily-teaching-report"
          sheets={[{ name: t("title"), columns: buildExportColumns(t, tCommon, objectivesLabel, formatDate), rows: filtered }]}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          items={[
            { value: "", label: t("allSchools") },
            ...(schools?.map((s) => ({ value: s.id, label: s.name })) ?? []),
          ]}
          value={schoolId}
          onValueChange={(v) => setSchoolId(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("allSchools")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("allSchools")}</SelectItem>
            {schools?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "", label: t("allClasses") },
            ...(classes?.map((c) => ({ value: c.id, label: c.name })) ?? []),
          ]}
          value={classId}
          onValueChange={(v) => setClassId(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("allClasses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("allClasses")}</SelectItem>
            {classes?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "", label: t("allTypes") },
            { value: "REGULAR", label: t("classTypeRegular") },
            { value: "TEACHER_TRAINING", label: t("classTypeTraining") },
          ]}
          value={classType}
          onValueChange={(v) => setClassType(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("allTypes")}</SelectItem>
            <SelectItem value="REGULAR">{t("classTypeRegular")}</SelectItem>
            <SelectItem value="TEACHER_TRAINING">{t("classTypeTraining")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <p className="text-muted-foreground p-4 text-sm">{tCommon("dataTable.loading")}</p>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="text-destructive mb-2 size-6" />
            <p className="text-muted-foreground text-sm">{error?.message || t("loadError")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="text-muted-foreground mb-2 size-6" />
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("class")}</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>{t("attendance")}</TableHead>
                  <TableHead className="text-right">{t("objectivesShort")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/reports/${r.id}`)}
                  >
                    <TableCell className="whitespace-nowrap">{formatDate(r.actualTeachingDate)}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {r.className}
                      {r.classType === "TEACHER_TRAINING" && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px]">
                          {t("classTypeTraining")}
                        </Badge>
                      )}
                      {r.isSubstitute && (
                        <Badge variant="outline" className="ml-1.5 text-[10px]">
                          {t("subShort")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{r.teacherName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      Meeting {r.meetingNumber}: {r.topic}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {r.attendanceTotal > 0 ? `${r.attendancePresent}/${r.attendanceTotal}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.objectivesAchieved && (
                        <Badge variant={OBJECTIVES_BADGE[r.objectivesAchieved]} className="text-[10px]">
                          {objectivesLabel[r.objectivesAchieved]}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
