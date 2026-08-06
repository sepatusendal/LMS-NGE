"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import { useClassRoster } from "@/features/classes/use-roster";
import { useBulkAttendance, useAttendances } from "@/features/attendances/use-attendances";
import { STATUS_LABEL, ATTENDANCE_STATUS_OPTIONS } from "@/features/attendances/schema";
import type { RosterStudent } from "@/features/classes/roster-queries";

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
    if (!existing || !roster) return;
    const existingMap: Record<string, string> = {};
    existing.forEach((a) => {
      existingMap[a.studentId] = a.status;
    });
    setSaved(existing.length > 0);

    const map: Record<string, string> = {};
    roster.forEach((s) => {
      map[s.studentId] = existingMap[s.studentId] || "PRESENT";
    });
    setStatusMap(map);
  }, [existing, roster]);

  useEffect(() => {
    if (!roster || existingLoading || (existing && existing.length > 0)) return;
    const map: Record<string, string> = {};
    roster.forEach((s) => {
      map[s.studentId] = "PRESENT";
    });
    setStatusMap(map);
  }, [roster, existing, existingLoading]);

  function handleStatusChange(studentId: string, status: string) {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
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
      <p className="text-muted-foreground py-4 text-sm">
        Belum ada siswa di kelas ini.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          Hadir: {presentCount}/{totalCount}
        </span>
        {saved && (
          <span className="text-emerald-600 flex items-center gap-1 font-medium">
            <Check className="size-3" />
            Tersimpan
          </span>
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
          className="w-full"
          disabled={bulkAttendance.isPending}
          onClick={handleSubmit}
        >
          {bulkAttendance.isPending ? "Menyimpan..." : "Simpan Absensi"}
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
    <div className="flex items-center justify-between px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{student.fullName}</p>
        {student.nis && (
          <p className="text-muted-foreground text-xs">{student.nis}</p>
        )}
      </div>
      <Select items={ATTENDANCE_STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABEL[s] }))} value={status} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ATTENDANCE_STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
