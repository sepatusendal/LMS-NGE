"use client";

import { useEffect, useState } from "react";
import { UserRoundCog } from "lucide-react";
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
import { parseLocalDate } from "@/lib/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTeachers } from "@/features/teachers/use-teachers";
import {
  useAssignSubstituteForLessonPlan,
  useCancelSubstitute,
} from "./use-substitutes";
import { ABSENCE_REASONS, ABSENCE_REASON_LABEL } from "./schema";

export interface ReassignTutorTarget {
  classId: string;
  lessonPlanId: string;
  scheduledDate: string;
  meetingId: string | null;
  className: string;
  contextLabel?: string; // e.g. school name, meeting topic — shown under the class name
  currentTeacherId: string | null;
  currentTeacherName: string;
  isSubstitute: boolean;
  substituteTeacherName?: string | null;
  substituteReason?: string | null;
}

export function ReassignTutorDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReassignTutorTarget | null;
}) {
  const { data: teachers } = useTeachers();
  const assign = useAssignSubstituteForLessonPlan(target?.classId ?? "");
  const cancel = useCancelSubstitute(target?.classId ?? "");

  const [substituteTeacherId, setSubstituteTeacherId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open && target) {
      setSubstituteTeacherId("");
      setReason("");
    }
  }, [open, target]);

  if (!target) return null;

  const teacherOptions = (teachers ?? []).filter((t) => t.id !== target.currentTeacherId);

  async function handleSave() {
    if (!target || !substituteTeacherId || !reason) return;
    try {
      await assign.mutateAsync({
        lessonPlanId: target.lessonPlanId,
        scheduledDate: target.scheduledDate,
        substituteTeacherId,
        reason,
      });
      onOpenChange(false);
    } catch {
      // Error toast already shown by the mutation's onError (e.g. a
      // schedule conflict) — keep the dialog open so the admin can pick a
      // different teacher instead of losing their input.
    }
  }

  async function handleCancelSubstitute() {
    if (!target?.meetingId) return;
    try {
      await cancel.mutateAsync(target.meetingId);
      onOpenChange(false);
    } catch {
      // Error toast already shown by the mutation's onError.
    }
  }

  const dateLabel = parseLocalDate(target.scheduledDate).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="bg-primary/10 text-primary mb-1 flex size-9 items-center justify-center rounded-full">
            <UserRoundCog className="size-4.5" />
          </div>
          <DialogTitle>Ganti Tutor Pengganti</DialogTitle>
          <DialogDescription>
            {target.className}
            {target.contextLabel ? ` · ${target.contextLabel}` : ""} · {dateLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
            <p className="text-muted-foreground text-xs">Tutor terjadwal</p>
            <p className="text-sm font-medium">{target.currentTeacherName}</p>
            {target.isSubstitute && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  Sedang digantikan
                </Badge>
                <span className="text-muted-foreground text-xs">
                  oleh <span className="font-medium text-foreground">{target.substituteTeacherName}</span>
                  {target.substituteReason
                    ? ` — ${ABSENCE_REASON_LABEL[target.substituteReason] ?? target.substituteReason}`
                    : ""}
                </span>
              </div>
            )}
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
            Perubahan ini hanya berlaku untuk pertemuan tanggal {dateLabel} — pertemuan
            berikutnya otomatis kembali ke {target.currentTeacherName}.
          </p>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {target.isSubstitute ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={cancel.isPending || !target.meetingId}
              onClick={handleCancelSubstitute}
            >
              {cancel.isPending ? "Membatalkan..." : "Batalkan Substitusi"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
            <Button
              disabled={!substituteTeacherId || !reason || assign.isPending}
              onClick={handleSave}
            >
              {assign.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
