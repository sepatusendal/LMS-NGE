"use client";

import { Loader2, AlertCircle, Clock, MapPin, CheckCircle2, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTodayClasses } from "@/features/meetings/use-today";
import { AttendanceForm } from "@/features/meetings/attendance-form";

const READY_STATUSES = new Set(["checked_in"]);
const DONE_STATUSES = new Set(["attendance_done", "checked_out", "report_submitted", "course_completed"]);

export default function AbsensiPage() {
  const { data: classes, isLoading, isError, error } = useTodayClasses();

  const ready = classes?.filter((c) => READY_STATUSES.has(c.meetingStatus)) ?? [];
  const notReady = classes?.filter((c) => !READY_STATUSES.has(c.meetingStatus)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Absensi</h1>
        <p className="text-muted-foreground text-sm">
          Isi kehadiran siswa untuk kelas yang sudah check-in hari ini
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
          <p className="text-muted-foreground mt-3 text-sm">Memuat jadwal hari ini...</p>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="text-destructive mb-2 size-6" />
          <p className="text-muted-foreground text-center text-sm">
            {error?.message || "Terjadi kesalahan. Coba refresh halaman."}
          </p>
        </div>
      )}

      {!isLoading && !isError && ready.length === 0 && notReady.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
          <Users className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">Tidak ada kelas hari ini.</p>
        </div>
      )}

      {ready.map((c) => (
        <Card key={c.classId} className="overflow-hidden rounded-2xl border-2 border-[#eda100]/30 py-0 shadow-sm">
          <div className="h-1.5 w-full bg-[#eda100]" />
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-base font-bold">{c.className}</p>
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
              </div>
              <Badge variant="outline" className="shrink-0 border-[#eda100]/40 text-[#a3730a]">
                Siap Absen
              </Badge>
            </div>

            {c.meetingId && (
              <div className="mt-4 border-t pt-4">
                <AttendanceForm
                  meetingId={c.meetingId}
                  classId={c.classId}
                  onDone={() => {}}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {notReady.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Lainnya hari ini
          </p>
          {notReady.map((c) => {
            const done = DONE_STATUSES.has(c.meetingStatus);
            return (
              <Card key={c.classId} className="rounded-xl shadow-sm">
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.className}</p>
                    <p className="text-muted-foreground text-xs">
                      {c.scheduleStartTime} - {c.scheduleEndTime}
                    </p>
                  </div>
                  {done ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-[#1baf7a]">
                      <CheckCircle2 className="size-3.5" />
                      Sudah absen
                    </span>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Belum check-in
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
