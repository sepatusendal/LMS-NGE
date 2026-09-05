"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ExternalLink, FileDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGenerateParentReport,
  useParentReportDraft,
  useUpdateDraftComment,
} from "@/features/parent-reports/use-parent-reports";
import { buildMonthLabel } from "@/features/parent-reports/schema";

const OBJECTIVES_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  YES: "default",
  PARTIALLY: "secondary",
  NO: "destructive",
};

export default function ParentReportReviewPage() {
  const tCommon = useTranslations("common");
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">{tCommon("dataTable.loading")}</p>}>
      <ParentReportReviewInner />
    </Suspense>
  );
}

function ParentReportReviewInner() {
  const t = useTranslations("admin.parentReports.review");
  const tCommon = useTranslations("common");
  const tObjectives = useTranslations("reportForm.objectivesStatus");
  const tMonths = useTranslations("admin.parentReports.months");
  const objectivesLabel: Record<string, string> = {
    YES: tObjectives("achieved"),
    PARTIALLY: tObjectives("partial"),
    NO: tObjectives("notAchieved"),
  };
  const monthLabel = buildMonthLabel(tMonths);
  const params = useSearchParams();
  const studentId = params.get("studentId") ?? "";
  const month = Number(params.get("month") ?? 0);
  const year = Number(params.get("year") ?? 0);

  const { data: draft, isLoading, isError, error } = useParentReportDraft(studentId, month, year);
  const updateComment = useUpdateDraftComment();
  const generate = useGenerateParentReport();

  const [comment, setComment] = useState("");
  const syncedDraftIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (draft && syncedDraftIdRef.current !== draft.id) {
      setComment(draft.teacherCommentsFinal);
      syncedDraftIdRef.current = draft.id;
    }
  }, [draft]);

  if (!studentId || !month || !year) {
    return <p className="text-muted-foreground text-sm">{t("incompleteParams")}</p>;
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="text-destructive mb-2 size-6" />
        <p className="text-muted-foreground text-center text-sm">
          {error?.message || t("loadError")}
        </p>
      </div>
    );
  }
  if (isLoading || !draft) {
    return <p className="text-muted-foreground text-sm">{tCommon("dataTable.loading")}</p>;
  }

  const { periodData } = draft;
  const attendanceRate =
    periodData.attendance.total > 0
      ? Math.round(
          ((periodData.attendance.present + periodData.attendance.late) / periodData.attendance.total) * 100,
        )
      : 0;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/parent-reports" className="text-muted-foreground text-sm hover:underline">
          {t("back")}
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">
              {periodData.studentName}
              {draft.status === "GENERATED" && (
                <Badge className="ml-2" variant="default">
                  {t("generated")}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {periodData.schoolName} · {t("periodLabel", { period: `${monthLabel[month]} ${year}` })}
            </p>
          </div>
          <div className="flex gap-2">
            {draft.status === "GENERATED" && (
              <a href={`/api/parent-reports/${draft.id}/download`}>
                <Button variant="outline">
                  <FileDown className="size-4" />
                  {t("downloadPdf")}
                </Button>
              </a>
            )}
            {draft.pdfDriveFileId && (
              <a
                href={`https://drive.google.com/file/d/${draft.pdfDriveFileId}/view`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <ExternalLink className="size-4" />
                  Drive
                </Button>
              </a>
            )}
            <Button
              onClick={async () => {
                if (comment !== draft.teacherCommentsFinal) {
                  await updateComment.mutateAsync({ id: draft.id, text: comment });
                }
                generate.mutate(draft.id);
              }}
              disabled={generate.isPending}
            >
              <FileDown className="size-4" />
              {generate.isPending
                ? t("generating")
                : draft.status === "GENERATED"
                  ? t("regeneratePdf")
                  : t("generatePdf")}
            </Button>
          </div>
        </div>
      </div>

      {periodData.lessonsCompleted === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {t("noMeetingsRecorded", { period: `${monthLabel[month]} ${year}` })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{attendanceRate}%</p>
            <p className="text-muted-foreground text-xs">{t("attendanceRate")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{periodData.attendance.present}</p>
            <p className="text-muted-foreground text-xs">{t("present")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{periodData.attendance.late}</p>
            <p className="text-muted-foreground text-xs">{t("late")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{periodData.attendance.excused}</p>
            <p className="text-muted-foreground text-xs">{t("excused")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold">{periodData.attendance.absent}</p>
            <p className="text-muted-foreground text-xs">{t("unexcused")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("progressAndSkills")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">{t("lessonsCompletedLabel")}: </span>
            {periodData.lessonsCompleted}
          </p>
          <p>
            <span className="text-muted-foreground">{t("skillsPracticedLabel")}: </span>
            {periodData.skillsCovered.join(", ") || "-"}
          </p>
        </CardContent>
      </Card>

      {periodData.teachingReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("meetingsSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("class")}</TableHead>
                  <TableHead>{t("topic")}</TableHead>
                  <TableHead className="text-right">{t("objectivesShort")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodData.teachingReports.map((r) => (
                  <TableRow key={r.meetingId}>
                    <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                    <TableCell>{r.className}</TableCell>
                    <TableCell className="text-muted-foreground">{r.topic}</TableCell>
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
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("teacherCommentsTitle")}</CardTitle>
          <p className="text-muted-foreground text-xs">{t("autoDraftHint")}</p>
        </CardHeader>
        <CardContent>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={8}
            className="text-sm"
          />
        </CardContent>
      </Card>
    </div>
  );
}
