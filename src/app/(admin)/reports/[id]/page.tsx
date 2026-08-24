"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink, Check, X as XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminReportDetail } from "@/features/reports/use-admin-reports";
import { OBJECTIVES_LABEL } from "@/features/reports/schema";

const OBJECTIVES_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  YES: "default",
  PARTIALLY: "secondary",
  NO: "destructive",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: report, isLoading } = useAdminReportDetail(params.id);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Memuat data...</p>;
  }
  if (!report) {
    return <p className="text-muted-foreground text-sm">Report tidak ditemukan.</p>;
  }

  const isAlbright = Boolean(report.languageSkillsFocus || report.activitiesLog || report.resourcesUsed);

  return (
    <div className="space-y-4">
      <div>
        <Link href="/reports" className="text-muted-foreground text-sm hover:underline">
          ← Kembali ke Daily Teaching Report
        </Link>
        <div className="mt-1 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {report.className}
              {report.classType === "TEACHER_TRAINING" && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Guru & Staff
                </Badge>
              )}
              {report.isSubstitute && (
                <Badge variant="outline" className="ml-2 text-xs">
                  Substitute
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {report.schoolName} · {formatDate(report.actualTeachingDate)} · Meeting {report.meetingNumber}
            </p>
          </div>
          {report.objectivesAchieved && (
            <Badge variant={OBJECTIVES_BADGE[report.objectivesAchieved]}>
              {OBJECTIVES_LABEL[report.objectivesAchieved]}
            </Badge>
          )}
        </div>
      </div>

      <Card className="border-l-4" style={{ borderLeftColor: "var(--chart-1)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Ringkasan Kelas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Teacher" value={report.teacherName} />
          <Field
            label="Attendance"
            value={report.attendanceTotal > 0 ? `${report.attendancePresent} / ${report.attendanceTotal} siswa` : "-"}
          />
          <Field label="Skill" value={report.skills.join(", ")} />
          <Field label="Topic" value={report.topic} />
        </CardContent>
      </Card>

      {report.objectives.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Learning Objectives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {report.objectives.map((o, i) => (
              <p key={i} className="flex items-start gap-2 text-sm">
                {o.achieved ? (
                  <Check className="text-emerald-600 mt-0.5 size-4 shrink-0" />
                ) : (
                  <XIcon className="text-destructive mt-0.5 size-4 shrink-0" />
                )}
                <span className={o.achieved ? undefined : "text-muted-foreground"}>{o.objectiveText}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {isAlbright ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{report.activitiesLog || "-"}</p>
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Language &amp; Skills Focus</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{report.languageSkillsFocus || "-"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{report.resourcesUsed || "-"}</p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">What Went Well</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{report.whatWentWell || "-"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">What Needs Improvement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground text-sm">{report.whatNeedsImprovement || "-"}</p>
              {report.actionPlan && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Action Plan: </span>
                  {report.actionPlan}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Students Needing Follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.followUps.length > 0 ? (
              report.followUps.map((f) => (
                <p key={f.id} className="text-sm">
                  <span className="font-medium">{f.studentName}</span>
                  <span className="text-muted-foreground"> — {f.note}</span>
                </p>
              ))
            ) : report.summary ? (
              <p className="text-muted-foreground text-sm">{report.summary}</p>
            ) : (
              <p className="text-muted-foreground text-sm">Tidak ada.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Next Lesson</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground text-sm">{report.nextLessonNotes || "-"}</p>
            {report.homeworkAssigned && (
              <p className="text-sm">
                <span className="text-muted-foreground">PR: </span>
                {report.homeworkAssigned}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {report.photoDriveFileId && (
        <a
          href={`https://drive.google.com/open?id=${report.photoDriveFileId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
        >
          <ExternalLink className="size-3.5" />
          Lihat foto aktivitas
        </a>
      )}
    </div>
  );
}
