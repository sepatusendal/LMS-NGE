"use client";

import { useState } from "react";
import { Loader2, CheckCircle, Clock, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClassTimeline } from "@/features/meetings/use-timeline";
import type { TimelineEntry } from "@/features/meetings/timeline-queries";
import { useTeachers } from "@/features/teachers/use-teachers";
import {
  useAssignSubstituteForLessonPlan,
  useCancelSubstitute,
} from "@/features/substitutes/use-substitutes";
import { ABSENCE_REASONS, ABSENCE_REASON_LABEL } from "@/features/substitutes/schema";

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  COMPLETED: { label: "Selesai", variant: "default" },
  SCHEDULED: { label: "Terjadwal", variant: "outline" },
  CANCELLED: { label: "Dibatalkan", variant: "destructive" },
};

const OBJECTIVES_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  YES: { label: "Tercapai", variant: "default" },
  PARTIALLY: { label: "Sebagian", variant: "secondary" },
  NO: { label: "Belum", variant: "destructive" },
};

function ReassignTutorControl({ classId, entry }: { classId: string; entry: TimelineEntry }) {
  const [editing, setEditing] = useState(false);
  const [substituteTeacherId, setSubstituteTeacherId] = useState("");
  const [reason, setReason] = useState("");
  const { data: teachers } = useTeachers();
  const assign = useAssignSubstituteForLessonPlan(classId);
  const cancel = useCancelSubstitute(classId);

  async function handleAssign() {
    if (!substituteTeacherId || !reason) return;
    await assign.mutateAsync({
      lessonPlanId: entry.lessonPlanId,
      scheduledDate: entry.scheduledDate,
      substituteTeacherId,
      reason,
    });
    setEditing(false);
    setSubstituteTeacherId("");
    setReason("");
  }

  if (entry.isSubstitute) {
    return (
      <div className="mt-1 flex items-center gap-2">
        <p className="text-muted-foreground text-[11px]">
          Digantikan <span className="font-medium text-foreground">{entry.actualTeacherName}</span>
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 px-1.5 text-[11px]"
          disabled={cancel.isPending || !entry.meetingId}
          onClick={() => entry.meetingId && cancel.mutate(entry.meetingId)}
        >
          Batalkan
        </Button>
      </div>
    );
  }

  if (editing) {
    const teacherOptions = (teachers ?? []).filter((t) => t.id !== entry.assignedTeacherId);
    return (
      <div className="mt-1.5 space-y-1.5">
        <Select
          items={teacherOptions.map((t) => ({ value: t.id, label: t.fullName }))}
          value={substituteTeacherId}
          onValueChange={(v) => v && setSubstituteTeacherId(v)}
        >
          <SelectTrigger className="h-7 w-full text-xs">
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
        <Select
          items={ABSENCE_REASONS.map((r) => ({ value: r, label: ABSENCE_REASON_LABEL[r] }))}
          value={reason}
          onValueChange={(v) => v && setReason(v)}
        >
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue placeholder="Alasan" />
          </SelectTrigger>
          <SelectContent>
            {ABSENCE_REASONS.map((r) => (
              <SelectItem key={r} value={r}>
                {ABSENCE_REASON_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            className="h-6 px-2 text-[11px]"
            disabled={!substituteTeacherId || !reason || assign.isPending}
            onClick={handleAssign}
          >
            {assign.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => setEditing(false)}
          >
            Batal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-1 h-6 px-2 text-[11px]"
      onClick={() => setEditing(true)}
    >
      Ganti Tutor
    </Button>
  );
}

function TimelineItem({
  classId,
  entry,
  isLast,
  totalEnrolled,
}: {
  classId: string;
  entry: TimelineEntry;
  isLast: boolean;
  totalEnrolled: number;
}) {
  const hasMeeting = Boolean(entry.meetingId);
  const isCompleted = entry.meetingStatus === "COMPLETED";
  const isScheduled = entry.meetingStatus === "SCHEDULED";
  const status = STATUS_BADGE[entry.meetingStatus] || STATUS_BADGE.SCHEDULED;
  // Reassignment is only sensible before the meeting has actually started —
  // matches the "already checked in, can't change tutor" guard enforced
  // server-side in assignSubstituteForLessonPlan/cancelSubstitute.
  const canReassign = !entry.checkInTime && !isCompleted;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex size-8 items-center justify-center rounded-full border-2 ${
            isCompleted
              ? "border-emerald-500 bg-emerald-50 text-emerald-600"
              : isScheduled
                ? "border-muted-foreground/30 bg-muted text-muted-foreground"
                : "border-destructive/50 bg-destructive/10 text-destructive"
          }`}
        >
          {isCompleted ? (
            <CheckCircle className="size-4" />
          ) : (
            <span className="text-xs font-bold">{entry.meetingNumber}</span>
          )}
        </div>
        {!isLast && (
          <div
            className={`w-0.5 flex-1 min-h-6 ${
              isCompleted ? "bg-emerald-200" : "bg-muted-foreground/20"
            }`}
          />
        )}
      </div>

      <div className={`flex-1 pb-4 ${isLast ? "" : ""}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Meeting {entry.meetingNumber}
          </p>
          <Badge variant={status.variant} className="text-xs">
            {status.label}
          </Badge>
        </div>

        <p className="text-xs font-medium mt-0.5">{entry.topic}</p>

        <p className="text-muted-foreground text-xs mt-0.5">
          {new Date(entry.scheduledDate).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>

        <div className="mt-1 space-y-0.5">
          <p className="text-muted-foreground text-xs">
            Teacher:{" "}
            <span className="font-medium text-foreground">
              {entry.actualTeacherName || entry.assignedTeacherName}
            </span>
            {entry.isSubstitute && (
              <Badge variant="outline" className="ml-1 text-[10px]">
                Substitute
              </Badge>
            )}
          </p>

          {hasMeeting && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
              {entry.checkInTime && (
                <span className="text-muted-foreground">
                  Check-in:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(entry.checkInTime).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {entry.isLate && (
                    <Badge variant="destructive" className="ml-1 text-[10px]">
                      Terlambat
                    </Badge>
                  )}
                </span>
              )}
              {entry.checkOutTime && (
                <span className="text-muted-foreground">
                  Check-out:{" "}
                  <span className="font-medium text-foreground">
                    {new Date(entry.checkOutTime).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
              )}
              {entry.durationMinutes && (
                <span className="text-muted-foreground">
                  {entry.durationMinutes} mnt
                </span>
              )}
            </div>
          )}

          {entry.attendanceTotal > 0 && (
            <p className="flex items-center gap-1 text-xs mt-1">
              <UserCheck className="size-3 text-emerald-600" />
              <span className="text-muted-foreground">
                Hadir:{" "}
                <span className="font-medium text-foreground">
                  {entry.attendancePresent}
                </span>
                /{entry.attendanceTotal}
                {totalEnrolled > entry.attendanceTotal && (
                  <span className="text-muted-foreground ml-0.5">
                    ({totalEnrolled} terdaftar)
                  </span>
                )}
              </span>
            </p>
          )}

          {entry.hasReport && entry.objectivesAchieved && (
            <div className="mt-1">
              <Badge
                variant={OBJECTIVES_BADGE[entry.objectivesAchieved]?.variant || "outline"}
                className="text-[10px]"
              >
                Tujuan: {OBJECTIVES_BADGE[entry.objectivesAchieved]?.label}
              </Badge>
            </div>
          )}

          {entry.substituteReason && (
            <p className="text-muted-foreground text-[11px] mt-0.5 italic">
              Alasan: {entry.substituteReason}
            </p>
          )}

          {canReassign && <ReassignTutorControl classId={classId} entry={entry} />}
        </div>
      </div>
    </div>
  );
}

export function ClassTimeline({ classId }: { classId: string }) {
  const { data, isLoading } = useClassTimeline(classId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Memuat timeline...
      </div>
    );
  }

  if (!data || data.timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-muted mb-3 flex size-12 items-center justify-center rounded-full">
          <Clock className="text-muted-foreground size-5" />
        </div>
        <p className="text-muted-foreground text-sm">
          Belum ada lesson plan untuk kelas ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 pt-2">
      <p className="text-muted-foreground mb-3 text-xs">
        Total {data.totalEnrolled} siswa terdaftar · {data.timeline.length} lesson plan
      </p>
      {data.timeline.map((entry, i) => (
        <TimelineItem
          key={entry.lessonPlanId}
          classId={classId}
          entry={entry}
          isLast={i === data.timeline.length - 1}
          totalEnrolled={data.totalEnrolled}
        />
      ))}
    </div>
  );
}
