"use client";

import { useEffect, useState } from "react";
import { CalendarOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeachers } from "@/features/teachers/use-teachers";
import type { ClassStatusRow } from "@/features/monitoring/schema";
import { useCancelSubstitute, useMarkTeacherAbsent } from "./use-substitutes";
import { ABSENCE_REASONS, ABSENCE_REASON_LABEL } from "./schema";

function ineligibleReason(r: ClassStatusRow): string | null {
  if (r.isHoliday) return "Libur";
  if (!r.lessonPlanId) return "Belum ada lesson plan";
  if (r.meetingStatus !== "not_started") return "Sudah dimulai";
  return null;
}

function ClassRow({
  row,
  checked,
  onCheckedChange,
}: {
  row: ClassStatusRow;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  // Scoped per-row so cancelling invalidates *this* class's own caches —
  // a single hook call shared across all rows would only ever target
  // whichever class happened to be first in the list.
  const cancel = useCancelSubstitute(row.classId);
  const reasonBlocked = ineligibleReason(row);

  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
      <label className="flex min-w-0 flex-1 items-center gap-2">
        <Checkbox
          checked={checked}
          disabled={Boolean(reasonBlocked)}
          onCheckedChange={(v) => onCheckedChange(Boolean(v))}
        />
        <span className="min-w-0">
          <span className="font-medium">{row.className}</span>{" "}
          <span className="text-muted-foreground">
            · {row.schoolName} · {row.scheduleStartTime}-{row.scheduleEndTime}
          </span>
        </span>
      </label>
      {row.isSubstitute ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            Sub: {row.substituteTeacherName}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-[10px]"
            disabled={cancel.isPending || !row.meetingId}
            onClick={() => row.meetingId && cancel.mutate(row.meetingId)}
          >
            Batalkan
          </Button>
        </div>
      ) : reasonBlocked ? (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {reasonBlocked}
        </Badge>
      ) : null}
    </div>
  );
}

export function TeacherAbsenceDialog({
  open,
  onOpenChange,
  date,
  teacherId,
  teacherName,
  classes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  teacherId: string;
  teacherName: string;
  classes: ClassStatusRow[];
}) {
  const { data: teachers } = useTeachers();
  const markAbsent = useMarkTeacherAbsent();

  const [substituteTeacherId, setSubstituteTeacherId] = useState("");
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setSubstituteTeacherId("");
      setReason("");
      const initial: Record<string, boolean> = {};
      classes.forEach((r) => {
        initial[r.classId] = !ineligibleReason(r);
      });
      setSelected(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacherId, date]);

  const teacherOptions = (teachers ?? []).filter((t) => t.id !== teacherId);
  const dateLabel = new Date(date).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const selectedCount = classes.filter((r) => selected[r.classId] && !ineligibleReason(r)).length;

  async function handleSubmit() {
    const assignments = classes
      .filter((r) => selected[r.classId] && !ineligibleReason(r))
      .map((r) => ({
        classId: r.classId,
        className: r.className,
        lessonPlanId: r.lessonPlanId!,
        scheduledDate: date,
      }));
    if (assignments.length === 0 || !substituteTeacherId || !reason) return;
    const result = await markAbsent.mutateAsync({ assignments, substituteTeacherId, reason });
    // Keep the dialog open on total failure so the admin can retry without
    // re-picking classes/reason; partial success still closes since the
    // toast already lists which classes need a manual follow-up.
    if (result.succeeded.length > 0) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="bg-primary/10 text-primary mb-1 flex size-9 items-center justify-center rounded-full">
            <CalendarOff className="size-4.5" />
          </div>
          <DialogTitle>Tandai {teacherName} Absen</DialogTitle>
          <DialogDescription>
            {dateLabel} · {classes.length} kelas terjadwal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-lg border p-2">
            {classes.map((r) => (
              <ClassRow
                key={r.classId}
                row={r}
                checked={Boolean(selected[r.classId])}
                onCheckedChange={(checked) =>
                  setSelected((prev) => ({ ...prev, [r.classId]: checked }))
                }
              />
            ))}
          </div>

          <div className="space-y-2">
            <Label>Tutor Pengganti</Label>
            <Select
              items={teacherOptions.map((t) => ({ value: t.id, label: t.fullName }))}
              value={substituteTeacherId}
              onValueChange={(v) => v && setSubstituteTeacherId(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih tutor pengganti" />
              </SelectTrigger>
              <SelectContent>
                {teacherOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Alasan</Label>
            <Select
              items={ABSENCE_REASONS.map((r) => ({ value: r, label: ABSENCE_REASON_LABEL[r] }))}
              value={reason}
              onValueChange={(v) => v && setReason(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih alasan" />
              </SelectTrigger>
              <SelectContent>
                {ABSENCE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ABSENCE_REASON_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-muted-foreground text-xs">
            Tutor pengganti akan diterapkan ke {selectedCount} kelas yang dicentang, khusus{" "}
            {dateLabel}. Pertemuan berikutnya di masing-masing kelas otomatis kembali ke{" "}
            {teacherName}.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button
            disabled={selectedCount === 0 || !substituteTeacherId || !reason || markAbsent.isPending}
            onClick={handleSubmit}
          >
            {markAbsent.isPending ? "Menyimpan..." : `Simpan untuk ${selectedCount} Kelas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
