"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertCircle, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClassRoster } from "@/features/classes/use-roster";
import { useBulkAttendance, useAttendances } from "@/features/attendances/use-attendances";
import { ATTENDANCE_STATUS_OPTIONS } from "@/features/attendances/schema";
import type { RosterStudent } from "@/features/classes/roster-queries";

const STATUS_STYLE: Record<string, { active: string; idle: string; short: string }> = {
  PRESENT: {
    active: "border-emerald-600 bg-emerald-600 text-white",
    idle: "border-emerald-200 bg-emerald-50 text-emerald-700",
    short: "Hadir",
  },
  ABSENT: {
    active: "border-red-600 bg-red-600 text-white",
    idle: "border-red-200 bg-red-50 text-red-700",
    short: "Alpa",
  },
  EXCUSED: {
    active: "border-blue-600 bg-blue-600 text-white",
    idle: "border-blue-200 bg-blue-50 text-blue-700",
    short: "Izin",
  },
  LATE: {
    active: "border-amber-600 bg-amber-600 text-white",
    idle: "border-amber-200 bg-amber-50 text-amber-700",
    short: "Telat",
  },
};

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

interface Props {
  meetingId: string;
  classId: string;
  onDone?: () => void;
}

export function AttendanceForm({ meetingId, classId, onDone }: Props) {
  const { data: roster, isLoading: rosterLoading } = useClassRoster(classId);
  const { data: existing, isLoading: existingLoading } = useAttendances(meetingId);
  const bulkAttendance = useBulkAttendance(meetingId);

  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!roster || existingLoading) return;
    const existingMap: Record<string, string> = {};
    if (existing && existing.length > 0) {
      existing.forEach((a) => {
        existingMap[a.studentId] = a.status;
      });
      setSaved(true);
    }
    setStatusMap((prev) => {
      const map: Record<string, string> = {};
      roster.forEach((s) => {
        map[s.studentId] = prev[s.studentId] || existingMap[s.studentId] || "PRESENT";
      });
      return map;
    });
  }, [roster, existing, existingLoading]);

  function handleStatusChange(studentId: string, status: string) {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
    setSaved(false);
  }

  function handleMarkAllPresent() {
    if (!roster) return;
    setStatusMap(Object.fromEntries(roster.map((s) => [s.studentId, "PRESENT"])));
    setSaved(false);
  }

  async function handleSubmit() {
    if (!roster) return;
    const entries = roster.map((s) => ({
      studentId: s.studentId,
      status: (statusMap[s.studentId] || "PRESENT") as typeof ATTENDANCE_STATUS_OPTIONS[number],
    }));
    await bulkAttendance.mutateAsync({ meetingId, entries });
    setSaved(true);
    onDone?.();
  }

  const presentCount = Object.values(statusMap).filter((s) => s === "PRESENT").length;
  const totalCount = roster?.length ?? 0;

  if (rosterLoading || existingLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Memuat roster...
      </div>
    );
  }

  if (!roster || roster.length === 0) {
    return (
      <div className="space-y-3 py-2">
        <div className="text-muted-foreground flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm">
          <AlertCircle className="text-amber-600 mt-0.5 size-4 shrink-0" />
          <span>
            Kelas ini belum memiliki siswa. Silakan lanjutkan ke tahap berikutnya.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            onDone?.();
          }}
        >
          Lanjutkan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">
          Hadir: <span className="font-semibold text-foreground">{presentCount}/{totalCount}</span>
        </span>
        {saved ? (
          <span className="text-emerald-600 flex items-center gap-1 text-xs font-medium">
            <Check className="size-3" />
            Tersimpan
          </span>
        ) : (
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="text-muted-foreground flex items-center gap-1 text-xs font-medium hover:text-foreground"
          >
            <CheckCheck className="size-3.5" />
            Tandai semua hadir
          </button>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        {roster.map((s) => (
          <StatusRow
            key={s.studentId}
            student={s}
            status={statusMap[s.studentId] || "PRESENT"}
            onChange={(st) => handleStatusChange(s.studentId, st)}
          />
        ))}
      </div>

      {!saved && (
        <Button
          size="lg"
          className="w-full"
          disabled={bulkAttendance.isPending}
          onClick={handleSubmit}
        >
          {bulkAttendance.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Simpan Absensi"
          )}
        </Button>
      )}
    </div>
  );
}

function StatusRow({
  student,
  status,
  onChange,
}: {
  student: RosterStudent;
  status: string;
  onChange: (status: string) => void;
}) {
  return (
    <div className="space-y-2 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
          {initials(student.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{student.fullName}</p>
          {student.nis && (
            <p className="text-muted-foreground text-xs">{student.nis}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {ATTENDANCE_STATUS_OPTIONS.map((s) => {
          const style = STATUS_STYLE[s];
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className={cn(
                "rounded-full border px-1.5 py-1.5 text-[11px] font-semibold transition-colors",
                active ? style.active : style.idle,
              )}
              aria-pressed={active}
            >
              {style.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
