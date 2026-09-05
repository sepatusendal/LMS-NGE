"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Clock, FileWarning, UserRoundCog, UserRoundX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import type { ExcelColumn } from "@/lib/export-excel";
import { parseLocalDate, todayLocalDateStr } from "@/lib/date";
import { useSchools } from "@/features/schools/use-schools";
import { useTeachers } from "@/features/teachers/use-teachers";
import {
  ReassignTutorDialog,
  type ReassignTutorTarget,
} from "@/features/substitutes/reassign-tutor-dialog";
import { useStatusBoard } from "./use-monitoring";
import type { ClassStatusRow } from "./schema";

function buildStatusLabel(
  t: (key: string) => string,
): Record<ClassStatusRow["meetingStatus"], { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> {
  return {
    not_started: { label: t("statusNotStarted"), variant: "secondary" },
    checked_in: { label: t("statusCheckedIn"), variant: "outline" },
    attendance_done: { label: t("statusAttendanceDone"), variant: "outline" },
    checked_out: { label: t("statusCheckedOut"), variant: "outline" },
    report_submitted: { label: t("statusReportSubmitted"), variant: "default" },
  };
}

function buildExportColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  statusLabel: Record<ClassStatusRow["meetingStatus"], { label: string; variant: string }>,
): ExcelColumn<ClassStatusRow>[] {
  return [
    { header: t("class"), key: "class", width: 22, value: (r) => r.className },
    { header: t("classTypeHeader"), key: "classType", width: 16, value: (r) => (r.classType === "TEACHER_TRAINING" ? t("classTypeTraining") : t("classTypeRegular")) },
    { header: tCommon("school"), key: "school", width: 22, value: (r) => r.schoolName },
    { header: t("room"), key: "room", width: 14, value: (r) => r.room ?? "-" },
    { header: "Teacher", key: "teacher", width: 22, value: (r) => r.teacherName },
    { header: "Substitute", key: "substitute", width: 16, value: (r) => (r.isSubstitute ? r.substituteTeacherName ?? tCommon("yes") : "-") },
    { header: t("substituteReason"), key: "substituteReason", width: 24, value: (r) => r.substituteReason ?? "-" },
    { header: t("time"), key: "time", width: 14, value: (r) => `${r.scheduleStartTime}-${r.scheduleEndTime}` },
    { header: "Meeting", key: "meeting", width: 10, value: (r) => r.meetingNumber },
    { header: "Topic", key: "topic", width: 26, value: (r) => r.topic },
    { header: t("hasLessonPlan"), key: "hasLessonPlan", width: 16, value: (r) => (r.hasLessonPlan ? tCommon("yes") : tCommon("no")) },
    { header: tCommon("status"), key: "status", width: 18, value: (r) => statusLabel[r.meetingStatus].label },
    { header: "Check-in", key: "checkIn", width: 12, value: (r) => r.checkInTime ?? "-" },
    { header: "Check-out", key: "checkOut", width: 12, value: (r) => r.checkOutTime ?? "-" },
    { header: t("late"), key: "late", width: 12, value: (r) => (r.isLate ? tCommon("yes") : r.isLate === false ? tCommon("no") : "-") },
    { header: t("overdueCheckIn"), key: "overdueCheckIn", width: 16, value: (r) => (r.isOverdueCheckIn ? tCommon("yes") : "-") },
    { header: t("reportMissing"), key: "reportMissing", width: 18, value: (r) => (r.isReportMissing ? tCommon("yes") : "-") },
    { header: t("holiday"), key: "isHoliday", width: 12, value: (r) => (r.isHoliday ? tCommon("yes") : "-") },
    { header: t("attendance"), key: "attendance", width: 12, value: (r) => (r.attendanceTotal > 0 ? `${r.attendancePresent}/${r.attendanceTotal}` : "-") },
  ];
}

export function StatusBoard() {
  const t = useTranslations("admin.statusBoard");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const statusLabel = useMemo(() => buildStatusLabel(t), [t]);
  const [date, setDate] = useState(todayLocalDateStr());
  const [schoolId, setSchoolId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<ReassignTutorTarget | null>(null);

  const { data: schools } = useSchools();
  const { data: teachers } = useTeachers();
  const { data: rows, isLoading, isError, error } = useStatusBoard(date);

  function openReassignDialog(r: ClassStatusRow) {
    setReassignTarget({
      classId: r.classId,
      lessonPlanId: r.lessonPlanId!,
      scheduledDate: date,
      meetingId: r.meetingId,
      className: r.className,
      contextLabel: r.schoolName,
      currentTeacherId: r.teacherId,
      currentTeacherName: r.teacherName,
      isSubstitute: r.isSubstitute,
      substituteTeacherName: r.substituteTeacherName,
      substituteReason: r.substituteReason,
    });
    setReassignDialogOpen(true);
  }

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
  const missingLpCount = filtered.filter((r) => !r.isHoliday && !r.hasLessonPlan).length;

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
            { value: "", label: t("allTeachers") },
            ...(teachers?.map((te) => ({ value: te.id, label: te.fullName })) ?? []),
          ]}
          value={teacherId}
          onValueChange={(v) => setTeacherId(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("allTeachers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("allTeachers")}</SelectItem>
            {teachers?.map((te) => (
              <SelectItem key={te.id} value={te.id}>
                {te.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExportExcelButton
          filename={`status-board-${date}`}
          sheets={[{ name: t("statusBoard"), columns: buildExportColumns(t, tCommon, statusLabel), rows: filtered }]}
        />
      </div>

      {(overdueCount > 0 || missingReportCount > 0 || missingLpCount > 0) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {overdueCount > 0 && (
            <div className="border-destructive/30 bg-destructive/5 flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <AlertTriangle className="text-destructive size-4 shrink-0" />
              <span>
                <span className="font-medium">{overdueCount}</span> {t("overdueCheckInWarning")}
              </span>
            </div>
          )}
          {missingReportCount > 0 && (
            <div
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: "color-mix(in oklab, var(--status-warning) 40%, transparent)",
                backgroundColor: "color-mix(in oklab, var(--status-warning) 10%, transparent)",
              }}
            >
              <FileWarning className="size-4 shrink-0" style={{ color: "var(--status-warning)" }} />
              <span>
                <span className="font-medium">{missingReportCount}</span> {t("missingReportWarning")}
              </span>
            </div>
          )}
          {missingLpCount > 0 && (
            <div
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              style={{
                borderColor: "color-mix(in oklab, var(--status-warning) 40%, transparent)",
                backgroundColor: "color-mix(in oklab, var(--status-warning) 10%, transparent)",
              }}
            >
              <FileWarning className="size-4 shrink-0" style={{ color: "var(--status-warning)" }} />
              <span>
                <span className="font-medium">{missingLpCount}</span> {t("missingLessonPlanWarning")}
              </span>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">
            {t("classStatus")} —{" "}
            {parseLocalDate(date).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
          <Link
            href="/substitutes"
            className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-xs"
          >
            <UserRoundX className="size-3.5" />
            {t("manageSubstitutes")}
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">{tCommon("dataTable.loading")}</p>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="text-destructive mb-2 size-6" />
              <p className="text-sm font-medium">{t("failedToLoadStatusBoard")}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {error?.message || t("tryRefreshing")}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Clock className="text-muted-foreground mb-2 size-6" />
              <p className="text-muted-foreground text-sm">{t("noClassesScheduledToday")}</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("class")}</TableHead>
                    <TableHead>{tCommon("school")}</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>{t("schedule")}</TableHead>
                    <TableHead>{t("attendance")}</TableHead>
                    <TableHead className="text-right">{tCommon("status")}</TableHead>
                    <TableHead className="w-12 pl-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const status = statusLabel[r.meetingStatus];
                    const canReassign =
                      !r.isHoliday && r.lessonPlanId && r.meetingStatus === "not_started";
                    return (
                      <TableRow key={r.lessonPlanId ?? `${r.classId}-no-lp`}>
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
                            {r.isHoliday ? (
                              <Badge variant="secondary" className="text-[10px]">
                                {t("holiday")}
                              </Badge>
                            ) : (
                              <>
                                {!r.hasLessonPlan && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    {t("noLessonPlanYet")}
                                  </Badge>
                                )}
                                <Badge variant={status.variant} className="text-[10px]">
                                  {status.label}
                                </Badge>
                                {r.isOverdueCheckIn && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    {t("notCheckedInYet")}
                                  </Badge>
                                )}
                                {r.isReportMissing && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {t("emptyReport")}
                                  </Badge>
                                )}
                                {r.isLate && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    {t("lateFull")}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="pl-3 text-right">
                          {canReassign && (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              title={t("changeTutorForThisDate")}
                              onClick={() => openReassignDialog(r)}
                            >
                              <UserRoundCog className="size-4" />
                            </Button>
                          )}
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
              <CheckCircle className="size-3.5" style={{ color: "var(--status-good)" }} />
              {t("allOnTrack")}
            </div>
          )}
        </CardContent>
      </Card>

      <ReassignTutorDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        target={reassignTarget}
      />
    </div>
  );
}
