"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, AlertCircle, Users, Layers, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTodayClasses } from "@/features/meetings/use-today";
import { useCurrentTeacher } from "@/features/teachers/use-current-teacher";
import { useTeacherStats } from "@/features/classes/use-teacher-stats";
import { STATUS_CONFIG } from "@/features/meetings/class-workflow-card";
import { ClassAvatar } from "@/components/shared/class-avatar";
import { LoadingState } from "@/components/shared/loading-state";
import { getTimeGreeting } from "@/lib/greeting";
import { TimeOfDayIllustration } from "@/components/shared/time-of-day-illustration";
import { useComplianceCount } from "@/features/lesson-plans/use-compliance-count";
import { AlarmClockCheck } from "lucide-react";

const DONE_STATUSES = new Set(["report_submitted", "course_completed"]);

export default function TodayPage() {
  const router = useRouter();
  const { data: classes, isLoading, isError, error } = useTodayClasses();
  const { data: teacher } = useCurrentTeacher();
  const stats = useTeacherStats();
  const { count: lessonPlanDueCount } = useComplianceCount();

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

  return (
    <div className="space-y-7">
      <TodayHero
        greeting={greeting}
        firstName={firstName}
        dateLabel={todayDate}
        completedCount={completedCount}
        totalCount={totalCount}
        hour={now.getHours()}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Layers} label="Kelas diampu" value={stats.classCount} loading={stats.isLoading} />
        <StatCard icon={Users} label="Total siswa" value={stats.studentCount} loading={stats.isLoading} />
      </div>

      {lessonPlanDueCount > 0 && (
        <Link
          href="/lesson-plan"
          className="bg-[#eda100]/10 flex items-center gap-3 rounded-2xl border border-[#eda100]/20 px-4 py-3 text-sm transition-colors hover:bg-[#eda100]/15"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eda100]/15">
            <AlarmClockCheck className="size-4 text-[#a3730a]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-[#a3730a]">
              {lessonPlanDueCount} kelas perlu lesson plan
            </span>
            <span className="text-muted-foreground block text-xs">
              Siapkan lesson plan minimal 2 minggu ke depan biar pengganti bisa langsung catch-up.
            </span>
          </span>
        </Link>
      )}

      {isLoading && <LoadingState />}

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

      {!isLoading && !isError && classes && classes.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Kelas hari ini</h2>
            {totalCount - completedCount > 0 && (
              <Link href="/absensi" className="text-primary text-xs font-medium hover:underline">
                Kerjakan di Absensi →
              </Link>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {classes.map((c, i) => {
              const status = STATUS_CONFIG[c.meetingStatus] || STATUS_CONFIG.not_started;
              return (
                <button
                  key={c.classId}
                  type="button"
                  onClick={() => router.push("/absensi")}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50",
                    i !== classes.length - 1 && "border-b",
                  )}
                >
                  <span className={cn("h-9 w-1 shrink-0 rounded-full", status.barColor)} />
                  <ClassAvatar name={c.className} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.className}</p>
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Clock className="size-3 shrink-0" />
                      {c.scheduleStartTime} - {c.scheduleEndTime}
                    </span>
                  </div>
                  <Badge variant={status.variant} className={cn("shrink-0 text-[11px] whitespace-nowrap", status.accent)}>
                    {status.label}
                  </Badge>
                  <ChevronRight className="text-muted-foreground/50 size-4 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}
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

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Icon className="text-muted-foreground size-3.5" />
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold">{loading ? "-" : value}</p>
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
