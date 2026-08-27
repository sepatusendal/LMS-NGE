"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Clock, CheckCircle, Play, LogOut, FileText, Camera, ClipboardCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStartClass, useCheckOut } from "@/features/meetings/use-today";
import { updateCheckInPhoto } from "@/features/meetings/queries";
import { AttendanceForm } from "@/features/meetings/attendance-form";
import { ReportForm } from "@/features/meetings/report-form";
import { FileUpload } from "@/features/drive/file-upload";
import { ClassAvatar } from "@/components/shared/class-avatar";
import { HandoverSummaryPanel } from "@/features/substitutes/handover-summary-panel";
import { ABSENCE_REASON_LABEL } from "@/features/substitutes/schema";
import type { TodayClass } from "@/features/meetings/schema";

export const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; accent: string; barColor: string }
> = {
  not_started: { label: "Belum Mulai", variant: "secondary", accent: "text-slate-500", barColor: "bg-slate-300" },
  checked_in: { label: "Isi Absensi", variant: "outline", accent: "text-[#eda100]", barColor: "bg-[#eda100]" },
  attendance_done: { label: "Check-out", variant: "outline", accent: "text-[#eda100]", barColor: "bg-[#eda100]" },
  checked_out: { label: "Isi Report", variant: "outline", accent: "text-[#4b60ac]", barColor: "bg-[#4b60ac]" },
  report_submitted: {
    label: "Selesai",
    variant: "outline",
    accent: "border-transparent bg-[#1baf7a] px-2.5 py-1 text-[13px] font-semibold text-white",
    barColor: "bg-[#1baf7a]",
  },
  course_completed: {
    label: "Kelas Selesai",
    variant: "outline",
    accent: "border-transparent bg-[#1baf7a] px-2.5 py-1 text-[13px] font-semibold text-white",
    barColor: "bg-[#1baf7a]",
  },
};

/** Full check-in → attendance → check-out → report stepper for one class,
 * all inline in a single card — the one place a teacher actually does the
 * day's work. Extracted from the old Hari Ini page so both Absensi (the
 * work hub) and any future embedding can share it without duplicating the
 * state machine. */
export function ClassWorkflowCard({ c }: { c: TodayClass }) {
  const startClass = useStartClass();
  const checkOut = useCheckOut();
  const [expanded, setExpanded] = useState(false);
  const [showHandover, setShowHandover] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  const status = STATUS_CONFIG[c.meetingStatus] || STATUS_CONFIG.not_started;
  const noLp = !c.lessonPlanId;

  return (
    <div className="space-y-3.5">
      <Card
        className={cn(
          "overflow-hidden border-2 border-transparent py-0 shadow-sm transition-shadow",
          expanded && "border-[#4b60ac]/25 shadow-md",
        )}
      >
        <div className={cn("h-1.5 w-full", status.barColor)} />
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <ClassAvatar name={c.className} size="md" className="mt-0.5" />
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="truncate text-base font-semibold">{c.className}</h2>
                <p className="text-muted-foreground text-xs">{c.schoolName}</p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  <span className="flex shrink-0 items-center gap-1">
                    <Clock className="size-3 shrink-0" />
                    {c.scheduleStartTime} - {c.scheduleEndTime}
                  </span>
                  {c.room && (
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{c.room}</span>
                    </span>
                  )}
                </div>
                {c.topic ? (
                  <p className="text-xs font-medium">
                    Meeting {c.meetingNumber}: {c.topic}
                  </p>
                ) : (
                  <p className="text-destructive/80 text-xs">Belum ada lesson plan untuk meeting ini</p>
                )}
              </div>
            </div>
            <Badge variant={status.variant} className={cn("ml-2 shrink-0", status.accent)}>
              {status.label}
            </Badge>
          </div>

          {c.isSubstitute && (
            <div className="bg-amber-50 text-amber-800 mt-3 rounded-md px-3 py-2 text-xs">
              Anda mengajar sebagai pengganti <span className="font-medium">{c.originalTeacherName}</span>
              {c.substituteReason && <> — {ABSENCE_REASON_LABEL[c.substituteReason] ?? c.substituteReason}</>}
            </div>
          )}

          {c.checkInTime && (
            <div className="mt-3 flex gap-4 text-xs">
              <span className="text-muted-foreground">
                Check-in:{" "}
                <span className="font-medium text-foreground">
                  {new Date(c.checkInTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
              {c.checkOutTime && (
                <>
                  <span className="text-muted-foreground">
                    Check-out:{" "}
                    <span className="font-medium text-foreground">
                      {new Date(c.checkOutTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  {c.durationMinutes && (
                    <span className="text-muted-foreground">
                      Durasi: <span className="font-medium text-foreground">{c.durationMinutes} mnt</span>
                    </span>
                  )}
                </>
              )}
              {c.isLate && (
                <Badge variant="destructive" className="text-[10px]">
                  Terlambat
                </Badge>
              )}
            </div>
          )}

          {c.isSubstitute && c.lessonPlanId && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => setShowHandover((prev) => !prev)}
            >
              {showHandover ? "Tutup Handover Summary" : "Lihat Handover Summary"}
            </Button>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {noLp && (
              <Link href="/lesson-plan/new" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full")}>
                Buat Lesson Plan
              </Link>
            )}

            {!noLp && c.meetingStatus === "not_started" && (
              <Button
                size="sm"
                className="w-full bg-[#4b60ac] hover:bg-[#3d4f92]"
                disabled={startClass.isPending}
                onClick={() =>
                  startClass.mutate(c.lessonPlanId!, {
                    onSuccess: () => setExpanded(true),
                  })
                }
              >
                {startClass.isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                <span className="ml-1.5">Mulai Kelas</span>
              </Button>
            )}

            {c.meetingStatus === "checked_in" && (
              <div className="w-full space-y-2">
                <Button
                  size="sm"
                  className="w-full bg-[#eda100] hover:bg-[#c98500]"
                  onClick={() => setExpanded((prev) => !prev)}
                >
                  <ClipboardCheck className="size-4" />
                  <span className="ml-1.5">{expanded ? "Tutup Absensi" : "Isi Absensi Siswa"}</span>
                </Button>
              </div>
            )}

            {c.meetingStatus === "attendance_done" && (
              <div className="flex w-full gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setExpanded((prev) => !prev)}>
                  Lihat Lesson Plan
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-[#eda100] hover:bg-[#c98500]"
                  disabled={checkOut.isPending}
                  onClick={() => checkOut.mutate(c.meetingId!)}
                >
                  {checkOut.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  <span className="ml-1.5">Check-out</span>
                </Button>
              </div>
            )}

            {c.meetingStatus === "checked_out" && (
              <Button
                size="sm"
                variant="outline"
                className="w-full border-[#4b60ac]/40 text-[#4b60ac] hover:bg-[#4b60ac]/10"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? (
                  "Tutup"
                ) : (
                  <>
                    <FileText className="size-4" />
                    <span className="ml-1.5">Isi Daily Teaching Report</span>
                  </>
                )}
              </Button>
            )}

            {c.meetingStatus === "report_submitted" && (
              <div className="flex w-full items-center gap-2 rounded-md bg-[#1baf7a]/10 px-3 py-2 text-sm">
                <CheckCircle className="size-4 text-[#1baf7a]" />
                <span className="font-medium text-[#0e7a53]">Kelas selesai!</span>
              </div>
            )}

            {c.meetingStatus === "course_completed" && (
              <div className="flex w-full items-center gap-2 rounded-md bg-[#1baf7a]/10 px-3 py-2 text-sm">
                <CheckCircle className="size-4 text-[#1baf7a]" />
                <span className="font-medium text-[#0e7a53]">Semua pertemuan telah selesai</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showHandover && c.lessonPlanId && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-3 text-sm font-medium">Handover Summary</h3>
            <HandoverSummaryPanel classId={c.classId} lessonPlanId={c.lessonPlanId} />
          </CardContent>
        </Card>
      )}

      {expanded && c.meetingStatus === "checked_in" && c.meetingId && (
        <Card className="overflow-hidden py-0">
          <CardContent className="pt-4 pb-4">
            <h3 className="mb-3 text-sm font-medium">Absensi Siswa</h3>
            <AttendanceForm meetingId={c.meetingId} classId={c.classId} onDone={() => setExpanded(false)} />
          </CardContent>
          <div className="border-t px-4 py-3">
            <button
              type="button"
              onClick={() => setShowPhotoUpload((prev) => !prev)}
              className="text-muted-foreground flex w-full items-center justify-center gap-1.5 text-xs hover:text-foreground"
            >
              <Camera className="size-3.5" />
              {showPhotoUpload ? "Tutup foto kelas" : "Tambah foto kelas (opsional)"}
            </button>
          </div>
          {showPhotoUpload && (
            <div className="border-t bg-[#eda100]/5 px-4 py-4">
              <FileUpload
                onUploaded={(driveFileId, fileName) => {
                  if (driveFileId) {
                    updateCheckInPhoto(c.meetingId!, driveFileId, fileName);
                  }
                }}
              />
            </div>
          )}
        </Card>
      )}

      {expanded && c.meetingStatus === "attendance_done" && c.lessonPlanId && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-2 text-sm font-medium">Lesson Plan</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Topic:</span> <span className="font-medium">{c.topic}</span>
              </p>
              {c.learningObjectives.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Objectives:</span>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {c.learningObjectives.map((o, i) => (
                      <li key={i}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
              {c.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
              {c.moduleFileName && (
                <a
                  href={`https://drive.google.com/file/d/${c.moduleDriveFileId}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary flex items-center gap-1.5 text-xs hover:underline"
                >
                  <FileText className="size-3.5" />
                  {c.moduleFileName}
                </a>
              )}
              <Link href={`/lesson-plan/${c.lessonPlanId}`} className="text-primary inline-block text-xs hover:underline">
                Lihat lengkap →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {expanded && c.meetingStatus === "checked_out" && c.meetingId && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-3 text-sm font-medium">Daily Teaching Report</h3>
            <ReportForm
              meetingId={c.meetingId}
              classId={c.classId}
              learningObjectives={c.learningObjectives}
              curriculumReportFormat={c.curriculumReportFormat}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
