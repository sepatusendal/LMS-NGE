"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2, MapPin, Clock, CheckCircle, AlertCircle, Play, LogOut, FileText, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTodayClasses, useStartClass, useCheckOut } from "@/features/meetings/use-today";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import { updateCheckInPhoto } from "@/features/meetings/queries";
import { AttendanceForm } from "@/features/meetings/attendance-form";
import { ReportForm } from "@/features/meetings/report-form";
import { FileUpload } from "@/features/drive/file-upload";
import { HandoverSummaryPanel } from "@/features/substitutes/handover-summary-panel";
import { ABSENCE_REASON_LABEL } from "@/features/substitutes/schema";
import { getTimeGreeting } from "@/lib/greeting";
import { TimeOfDayIllustration } from "@/components/shared/time-of-day-illustration";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; accent: string; barColor: string }
> = {
  not_started: { label: "Belum Mulai", variant: "secondary", accent: "text-slate-500", barColor: "bg-slate-300" },
  checked_in: { label: "Isi Absensi", variant: "outline", accent: "text-[#eda100]", barColor: "bg-[#eda100]" },
  attendance_done: { label: "Check-out", variant: "outline", accent: "text-[#eda100]", barColor: "bg-[#eda100]" },
  checked_out: { label: "Isi Report", variant: "outline", accent: "text-[#4b60ac]", barColor: "bg-[#4b60ac]" },
  report_submitted: { label: "Selesai", variant: "default", accent: "text-[#1baf7a]", barColor: "bg-[#1baf7a]" },
  course_completed: { label: "Kelas Selesai", variant: "default", accent: "text-[#1baf7a]", barColor: "bg-[#1baf7a]" },
};

const DONE_STATUSES = new Set(["report_submitted", "course_completed"]);

export default function TodayPage() {
  const { data: classes, isLoading, isError, error } = useTodayClasses();
  const { data: teacher } = useCurrentTeacher();
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

  const now = useMemo(() => new Date(), []);
  const greeting = useMemo(() => getTimeGreeting(now.getHours()), [now]);
  const firstName = teacher?.fullName?.split(" ")[0] ?? "";

  const todayDate = useMemo(() => {
    return now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [now]);

  const completedCount = classes?.filter((c) => DONE_STATUSES.has(c.meetingStatus)).length ?? 0;
  const totalCount = classes?.length ?? 0;

  function toggleExpand(classId: string) {
    setExpandedClassId((prev) => (prev === classId ? null : classId));
  }

  return (
    <div className="space-y-5">
      <TodayHero
        greeting={greeting}
        firstName={firstName}
        dateLabel={todayDate}
        completedCount={completedCount}
        totalCount={totalCount}
        hour={now.getHours()}
      />

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
          <p className="text-muted-foreground mt-3 text-sm">Memuat jadwal hari ini...</p>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="bg-destructive/10 mb-4 flex size-14 items-center justify-center rounded-full">
            <AlertCircle className="text-destructive size-6" />
          </div>
          <h1 className="text-lg font-semibold">Gagal Memuat Data</h1>
          <p className="text-muted-foreground mt-1 text-center text-sm">
            {error?.message || "Terjadi kesalahan. Coba refresh halaman."}
          </p>
        </div>
      )}

      {!isLoading && !isError && (!classes || classes.length === 0) && <EmptyTodayState />}

      {!isLoading &&
        !isError &&
        classes?.map((c) => {
          const isExpanded = expandedClassId === c.classId;
          const status = STATUS_CONFIG[c.meetingStatus] || STATUS_CONFIG.not_started;
          const noLp = !c.lessonPlanId;

          return (
            <div key={c.classId} className="space-y-3">
              <Card
                className={cn(
                  "overflow-hidden border-2 border-transparent py-0 shadow-sm transition-shadow",
                  isExpanded && "border-[#4b60ac]/25 shadow-md",
                )}
              >
                <div className={cn("h-1.5 w-full", status.barColor)} />
                <CardContent className="pt-4 pb-4">
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
                    <Badge variant={status.variant} className={cn("ml-2 shrink-0", status.accent)}>
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
                        className="w-full bg-[#4b60ac] hover:bg-[#3d4f92]"
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
                        className="w-full border-[#eda100]/40 text-[#a3730a] hover:bg-[#eda100]/10"
                        onClick={() => toggleExpand(c.classId)}
                      >
                        <Users className="size-4" />
                        <span className="ml-1.5">{isExpanded ? "Tutup Absensi" : "Isi Absensi Siswa"}</span>
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
                          className="flex-1 bg-[#eda100] hover:bg-[#c98500]"
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
                        className="w-full border-[#4b60ac]/40 text-[#4b60ac] hover:bg-[#4b60ac]/10"
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

              {handoverClassId === c.classId && c.lessonPlanId && (
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="mb-3 text-sm font-medium">Handover Summary</h3>
                    <HandoverSummaryPanel classId={c.classId} lessonPlanId={c.lessonPlanId} />
                  </CardContent>
                </Card>
              )}

              {isExpanded && c.meetingStatus === "checked_in" && c.meetingId && (
                <Card className="overflow-hidden border-2 border-[#eda100]/20 py-0">
                  <div className="flex items-center gap-2 bg-[#eda100]/10 px-4 py-2.5">
                    <Users className="size-4 text-[#a3730a]" />
                    <h3 className="text-sm font-semibold text-[#a3730a]">Absensi Siswa</h3>
                  </div>
                  <CardContent className="pt-4">
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

function TodayHero({
  greeting,
  firstName,
  dateLabel,
  completedCount,
  totalCount,
  hour,
}: {
  greeting: { text: string; emoji: string };
  firstName: string;
  dateLabel: string;
  completedCount: number;
  totalCount: number;
  hour: number;
}) {
  const isNight = hour >= 18 || hour < 4;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl px-5 py-6 text-white shadow-[0_16px_40px_-16px_rgba(75,96,172,0.5)] sm:px-7 sm:py-7",
        isNight
          ? "bg-gradient-to-br from-[#2a3466] via-[#3a4585] to-[#4b60ac]"
          : "bg-gradient-to-br from-[#4b60ac] via-[#5468b8] to-[#6b83c9]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="absolute -top-10 -right-10 size-48 opacity-25 sm:size-56" viewBox="0 0 200 200">
          <path
            fill="#ffffff"
            d="M45.3,-58.6C58.5,-49.9,68.6,-35.5,72.8,-19.5C77,-3.5,75.3,14.1,68.1,29.3C60.9,44.5,48.2,57.3,33.2,64.8C18.2,72.3,0.9,74.5,-16.9,71.8C-34.7,69.1,-53,61.5,-64.5,47.9C-76,34.3,-80.7,14.7,-78.4,-3.6C-76.1,-21.9,-66.8,-38.9,-53.2,-47.9C-39.6,-56.9,-21.7,-57.9,-3.3,-54.1C15.1,-50.3,32.1,-67.3,45.3,-58.6Z"
            transform="translate(100 100)"
          />
        </svg>
        <svg className="absolute -bottom-16 left-1/3 size-56 opacity-15" viewBox="0 0 200 200">
          <path
            fill="#f15c5d"
            d="M39.6,-51.2C52.6,-43.5,65.4,-33.4,70.8,-19.9C76.2,-6.5,74.2,10.3,66.9,24.2C59.6,38.1,47,49.1,32.7,57.2C18.4,65.3,2.4,70.5,-13.9,68.9C-30.2,67.3,-46.8,58.9,-58.4,45.6C-70,32.3,-76.6,14.1,-75.8,-3.7C-75,-21.5,-66.8,-38.9,-53.9,-46.9C-41,-54.9,-23.4,-53.5,-6.9,-45.7C9.6,-37.9,26.6,-58.9,39.6,-51.2Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>

      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">
            {greeting.text}
            {firstName ? `, ${firstName}` : ""} {greeting.emoji}
          </p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Kelas Hari Ini</h1>
          <p className="mt-0.5 text-xs text-white/70 sm:text-sm">{dateLabel}</p>

          {totalCount > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-white/20 sm:w-40">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${totalCount ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-medium text-white/85">
                {completedCount}/{totalCount} selesai
              </span>
            </div>
          )}
        </div>

        <TimeOfDayIllustration hour={hour} className="hidden h-24 w-24 shrink-0 sm:block" />
      </div>
    </div>
  );
}

function EmptyTodayState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
      <RelaxIllustration className="mb-5 h-auto w-48" />
      <h1 className="text-lg font-semibold text-[#1e3a5f]">Tidak Ada Kelas Hari Ini</h1>
      <p className="text-muted-foreground mt-1 max-w-xs text-sm">
        Nikmati waktu istirahatmu! Belum ada jadwal mengajar untuk hari ini.
      </p>
    </div>
  );
}

function RelaxIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 180" fill="none">
      <ellipse cx="120" cy="164" rx="90" ry="10" fill="#4b60ac" fillOpacity="0.06" />
      {/* Plant */}
      <rect x="30" y="128" width="28" height="24" rx="4" fill="#4b60ac" fillOpacity="0.15" />
      <path d="M44 128 C44 100 20 96 20 96 C20 96 34 118 44 128 Z" fill="#1baf7a" />
      <path d="M44 128 C44 94 68 88 68 88 C68 88 52 114 44 128 Z" fill="#1baf7a" fillOpacity="0.8" />
      {/* Coffee cup */}
      <rect x="150" y="118" width="34" height="26" rx="6" fill="#f15c5d" fillOpacity="0.85" />
      <path d="M184 122 h8 a8 8 0 0 1 0 16 h-8" stroke="#f15c5d" strokeWidth="4" fill="none" strokeOpacity="0.85" />
      <path d="M158 108 q4 -6 0 -12" stroke="#eda100" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <path d="M168 108 q4 -6 0 -12" stroke="#eda100" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      {/* Open book on a cushion */}
      <ellipse cx="110" cy="150" rx="46" ry="10" fill="#eda100" fillOpacity="0.18" />
      <path d="M84 138 L84 112 Q110 100 110 112 L110 142 Z" fill="#4b60ac" fillOpacity="0.9" />
      <path d="M136 138 L136 112 Q110 100 110 112 L110 142 Z" fill="#4b60ac" fillOpacity="0.7" />
      <path d="M90 116 Q110 110 104 118" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M90 124 Q108 118 102 126" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      {/* Sparkles */}
      <g fill="#eda100">
        <circle cx="200" cy="70" r="2.5" />
        <circle cx="60" cy="60" r="2" />
      </g>
    </svg>
  );
}
