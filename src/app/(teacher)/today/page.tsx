"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2, MapPin, Clock, CheckCircle, AlertCircle, Play, LogOut, FileText } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTodayClasses, useStartClass, useCheckOut } from "@/features/meetings/use-today";
import { updateCheckInPhoto } from "@/features/meetings/queries";
import { AttendanceForm } from "@/features/meetings/attendance-form";
import { ReportForm } from "@/features/meetings/report-form";
import { FileUpload } from "@/features/drive/file-upload";
import { HandoverSummaryPanel } from "@/features/substitutes/handover-summary-panel";
import { ABSENCE_REASON_LABEL } from "@/features/substitutes/schema";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_started: { label: "Belum Mulai", variant: "secondary" },
  checked_in: { label: "Isi Absensi", variant: "outline" },
  attendance_done: { label: "Check-out", variant: "outline" },
  checked_out: { label: "Isi Report", variant: "outline" },
  report_submitted: { label: "Selesai", variant: "default" },
  course_completed: { label: "Kelas Selesai", variant: "default" },
};

export default function TodayPage() {
  const { data: classes, isLoading, isError, error } = useTodayClasses();
  const startClass = useStartClass();
  const checkOut = useCheckOut();
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [handoverClassId, setHandoverClassId] = useState<string | null>(null);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  const todayDate = useMemo(() => {
    return new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  function toggleExpand(classId: string) {
    setExpandedClassId((prev) => (prev === classId ? null : classId));
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
        <p className="text-muted-foreground mt-3 text-sm">Memuat jadwal hari ini...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-destructive/10 mb-4 flex size-14 items-center justify-center rounded-full">
          <AlertCircle className="text-destructive size-6" />
        </div>
        <h1 className="text-lg font-semibold">Gagal Memuat Data</h1>
        <p className="text-muted-foreground mt-1 text-center text-sm">
          {error?.message || "Terjadi kesalahan. Coba refresh halaman."}
        </p>
      </div>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-full">
          <Clock className="text-muted-foreground size-6" />
        </div>
        <h1 className="text-lg font-semibold">Tidak Ada Kelas Hari Ini</h1>
        <p className="text-muted-foreground mt-1 text-center text-sm">
          Nikmati hari Anda! Tidak ada jadwal mengajar untuk hari ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Hari Ini</h1>
        <p className="text-muted-foreground text-xs">{todayDate}</p>
      </div>

      {classes.map((c) => {
        const isExpanded = expandedClassId === c.classId;
        const status = STATUS_CONFIG[c.meetingStatus] || STATUS_CONFIG.not_started;
        const noLp = !c.lessonPlanId;

        return (
          <div key={c.classId} className="space-y-3">
            <Card className={cn(isExpanded && "ring-primary/20 ring-2")}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h2 className="truncate text-base font-semibold">{c.className}</h2>
                    <p className="text-muted-foreground text-xs">{c.schoolName}</p>
                    <div className="text-muted-foreground flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {c.scheduleStartTime} - {c.scheduleEndTime}
                      </span>
                      {c.room && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {c.room}
                        </span>
                      )}
                    </div>
                    {c.topic ? (
                      <p className="text-xs font-medium">
                        Meeting {c.meetingNumber}: {c.topic}
                      </p>
                    ) : (
                      <p className="text-destructive/80 text-xs">
                        Belum ada lesson plan untuk meeting ini
                      </p>
                    )}
                  </div>
                  <Badge variant={status.variant} className="ml-2 shrink-0">
                    {status.label}
                  </Badge>
                </div>

                {c.isSubstitute && (
                  <div className="bg-amber-50 text-amber-800 mt-3 rounded-md px-3 py-2 text-xs">
                    Anda mengajar sebagai pengganti{" "}
                    <span className="font-medium">{c.originalTeacherName}</span>
                    {c.substituteReason && (
                      <> — {ABSENCE_REASON_LABEL[c.substituteReason] ?? c.substituteReason}</>
                    )}
                  </div>
                )}

                {c.checkInTime && (
                  <div className="mt-3 flex gap-4 text-xs">
                    <span className="text-muted-foreground">
                      Check-in:{" "}
                      <span className="font-medium text-foreground">
                        {new Date(c.checkInTime).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                    {c.checkOutTime && (
                      <>
                        <span className="text-muted-foreground">
                          Check-out:{" "}
                          <span className="font-medium text-foreground">
                            {new Date(c.checkOutTime).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                        {c.durationMinutes && (
                          <span className="text-muted-foreground">
                            Durasi:{" "}
                            <span className="font-medium text-foreground">
                              {c.durationMinutes} mnt
                            </span>
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
                    onClick={() =>
                      setHandoverClassId((prev) => (prev === c.classId ? null : c.classId))
                    }
                  >
                    {handoverClassId === c.classId ? "Tutup Handover Summary" : "Lihat Handover Summary"}
                  </Button>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {noLp && (
                    <Link
                      href="/lesson-plan/new"
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full")}
                    >
                      Buat Lesson Plan
                    </Link>
                  )}

                  {!noLp && c.meetingStatus === "not_started" && (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={startClass.isPending}
                      onClick={() =>
                        startClass.mutate(c.lessonPlanId!, {
                          onSuccess: () => {
                            setExpandedClassId(c.classId);
                          },
                        })
                      }
                    >
                      {startClass.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Play className="size-4" />
                      )}
                      <span className="ml-1.5">Mulai Kelas</span>
                    </Button>
                  )}

                  {c.meetingStatus === "checked_in" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => toggleExpand(c.classId)}
                    >
                      {isExpanded ? "Tutup Absensi" : "Isi Absensi"}
                    </Button>
                  )}

                  {c.meetingStatus === "attendance_done" && (
                    <div className="flex w-full gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => toggleExpand(c.classId)}
                      >
                        Lihat Lesson Plan
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={checkOut.isPending}
                        onClick={() => checkOut.mutate(c.meetingId!)}
                      >
                        {checkOut.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <LogOut className="size-4" />
                        )}
                        <span className="ml-1.5">Check-out</span>
                      </Button>
                    </div>
                  )}

                  {c.meetingStatus === "checked_out" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => toggleExpand(c.classId)}
                    >
                      {isExpanded ? (
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
                    <div className="flex w-full items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm">
                      <CheckCircle className="text-emerald-600 size-4" />
                      <span className="text-emerald-700 font-medium">
                        Kelas selesai!
                      </span>
                    </div>
                  )}

                  {c.meetingStatus === "course_completed" && (
                    <div className="flex w-full items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm">
                      <CheckCircle className="text-emerald-600 size-4" />
                      <span className="text-emerald-700 font-medium">
                        Semua pertemuan telah selesai
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {handoverClassId === c.classId && c.lessonPlanId && (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="mb-3 text-sm font-medium">Handover Summary</h3>
                  <HandoverSummaryPanel classId={c.classId} lessonPlanId={c.lessonPlanId} />
                </CardContent>
              </Card>
            )}

            {isExpanded && c.meetingStatus === "checked_in" && c.meetingId && (
              <Card>
                <CardContent className="pt-4">
                  <h3 className="mb-3 text-sm font-medium">Absensi</h3>
                  <AttendanceForm
                    meetingId={c.meetingId}
                    classId={c.classId}
                    onDone={() => {
                      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
                      collapseTimeoutRef.current = setTimeout(() => {
                        setExpandedClassId(null);
                      }, 1500);
                    }}
                  />
                  <div className="mt-3 border-t pt-3">
                    <p className="text-muted-foreground mb-2 text-xs">
                      Foto kelas (opsional)
                    </p>
                    <FileUpload
                      onUploaded={(driveFileId, fileName) => {
                        if (driveFileId) {
                          updateCheckInPhoto(c.meetingId!, driveFileId, fileName);
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {isExpanded &&
              c.meetingStatus === "attendance_done" &&
              c.lessonPlanId && (
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="mb-2 text-sm font-medium">Lesson Plan</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">Topic:</span>{" "}
                        <span className="font-medium">{c.topic}</span>
                      </p>
                      {c.learningObjectives && (
                        <p>
                          <span className="text-muted-foreground">Objectives:</span>{" "}
                          {c.learningObjectives}
                        </p>
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
                      <Link
                        href={`/lesson-plan/${c.lessonPlanId}`}
                        className="text-primary inline-block text-xs hover:underline"
                      >
                        Lihat lengkap →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

            {isExpanded &&
              c.meetingStatus === "checked_out" &&
              c.meetingId && (
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="mb-3 text-sm font-medium">Daily Teaching Report</h3>
                    <ReportForm meetingId={c.meetingId} classId={c.classId} />
                  </CardContent>
                </Card>
              )}
          </div>
        );
      })}
    </div>
  );
}
