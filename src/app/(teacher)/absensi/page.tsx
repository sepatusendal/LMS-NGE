"use client";

import { useState } from "react";
import { AlertCircle, Clock, MapPin, CheckCircle2, Users, ChevronDown, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ClassAvatar } from "@/components/shared/class-avatar";
import { LoadingState } from "@/components/shared/loading-state";
import { useTodayClasses } from "@/features/meetings/use-today";
import { AttendanceForm } from "@/features/meetings/attendance-form";
import type { TodayClass } from "@/features/meetings/schema";

const READY_STATUSES = new Set(["checked_in"]);
const FILLED_STATUSES = new Set(["attendance_done", "checked_out", "report_submitted", "course_completed"]);

export default function AbsensiPage() {
  const { data: classes, isLoading, isError, error } = useTodayClasses();
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const ready = classes?.filter((c) => READY_STATUSES.has(c.meetingStatus)) ?? [];
  const filled = classes?.filter((c) => FILLED_STATUSES.has(c.meetingStatus) && c.meetingId) ?? [];
  const locked = classes?.filter((c) => !READY_STATUSES.has(c.meetingStatus) && !c.meetingId) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Absensi</h1>
        <p className="text-muted-foreground text-sm">
          Isi dan cek kehadiran siswa untuk kelas hari ini
        </p>
      </div>

      {isLoading && <LoadingState />}

      {isError && (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="text-destructive mb-2 size-6" />
          <p className="text-muted-foreground text-center text-sm">
            {error?.message || "Terjadi kesalahan. Coba refresh halaman."}
          </p>
        </div>
      )}

      {!isLoading && !isError && ready.length === 0 && filled.length === 0 && locked.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
          <Users className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">Tidak ada kelas hari ini.</p>
        </div>
      )}

      {ready.length > 0 && (
        <div className="space-y-3">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Perlu diisi
          </p>
          {ready.map((c) => (
            <Card key={c.classId} className="overflow-hidden rounded-2xl border-2 border-[#eda100]/30 py-0 shadow-sm">
              <div className="h-1.5 w-full bg-[#eda100]" />
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <ClassAvatar name={c.className} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold">{c.className}</p>
                      <ScheduleLine c={c} />
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-[#eda100]/40 text-[#a3730a]">
                    Siap Absen
                  </Badge>
                </div>

                {c.meetingId && (
                  <div className="mt-4 border-t pt-4">
                    <AttendanceForm meetingId={c.meetingId} classId={c.classId} onDone={() => {}} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filled.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Sudah diisi hari ini
          </p>
          {filled.map((c) => {
            const isExpanded = expandedClassId === c.classId;
            return (
              <Card key={c.classId} className="overflow-hidden rounded-xl py-0 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setExpandedClassId((prev) => (prev === c.classId ? null : c.classId))}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.className}</p>
                    <ScheduleLine c={c} />
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-[#1baf7a]">
                      <CheckCircle2 className="size-3.5" />
                      Sudah absen
                    </span>
                    <ChevronDown
                      className={cn("text-muted-foreground size-4 transition-transform", isExpanded && "rotate-180")}
                    />
                  </div>
                </button>

                {isExpanded && c.meetingId && (
                  <CardContent className="border-t pt-4 pb-4">
                    <AttendanceForm meetingId={c.meetingId} classId={c.classId} onDone={() => {}} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {locked.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Belum bisa diisi
          </p>
          {locked.map((c) => (
            <Card key={c.classId} className="rounded-xl shadow-sm">
              <CardContent className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.className}</p>
                  <ScheduleLine c={c} />
                </div>
                <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                  <Lock className="size-3.5" />
                  Belum check-in
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleLine({ c }: { c: TodayClass }) {
  return (
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
  );
}
