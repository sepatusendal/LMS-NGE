"use client";

import { useState } from "react";
import { Loader2, CheckCircle, Clock, UserCheck, UserRoundCog, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseLocalDate } from "@/lib/date";
import { useClassTimeline } from "@/features/meetings/use-timeline";
import type { TimelineEntry } from "@/features/meetings/timeline-queries";
import {
  ReassignTutorDialog,
  type ReassignTutorTarget,
} from "@/features/substitutes/reassign-tutor-dialog";
import { MeetingAdminDialog } from "@/features/meetings/meeting-admin-dialog";

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

function TimelineItem({
  entry,
  isLast,
  totalEnrolled,
  canReassign,
  onReassign,
  onManageMeeting,
}: {
  entry: TimelineEntry;
  isLast: boolean;
  totalEnrolled: number;
  canReassign: boolean;
  onReassign: (entry: TimelineEntry) => void;
  onManageMeeting: (entry: TimelineEntry) => void;
}) {
  const hasMeeting = Boolean(entry.meetingId);
  const isCompleted = entry.meetingStatus === "COMPLETED";
  const isScheduled = entry.meetingStatus === "SCHEDULED";
  const status = STATUS_BADGE[entry.meetingStatus] || STATUS_BADGE.SCHEDULED;

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
          {parseLocalDate(entry.scheduledDate).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>

        <div className="mt-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-muted-foreground text-xs">
              Teacher:{" "}
              <span className="font-medium text-foreground">
                {entry.actualTeacherName || entry.assignedTeacherName}
              </span>
            </p>
            {entry.isSubstitute && (
              <Badge variant="outline" className="text-[10px]">
                Substitute
              </Badge>
            )}
            {canReassign && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-5 gap-1 px-1.5 text-[11px]"
                onClick={() => onReassign(entry)}
              >
                <UserRoundCog className="size-3" />
                {entry.isSubstitute ? "Kelola" : "Ganti Tutor"}
              </Button>
            )}
            {hasMeeting && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-5 gap-1 px-1.5 text-[11px]"
                onClick={() => onManageMeeting(entry)}
              >
                <Settings2 className="size-3" />
                Kelola Meeting
              </Button>
            )}
          </div>

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
        </div>
      </div>
    </div>
  );
}

export function ClassTimeline({
  classId,
  classDisplayName,
}: {
  classId: string;
  classDisplayName?: string;
}) {
  const { data, isLoading } = useClassTimeline(classId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [target, setTarget] = useState<ReassignTutorTarget | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageEntry, setManageEntry] = useState<TimelineEntry | null>(null);

  function openManageDialog(entry: TimelineEntry) {
    setManageEntry(entry);
    setManageOpen(true);
  }

  function openReassignDialog(entry: TimelineEntry) {
    setTarget({
      classId,
      lessonPlanId: entry.lessonPlanId,
      scheduledDate: entry.scheduledDate,
      meetingId: entry.meetingId,
      className: classDisplayName ?? "Kelas ini",
      contextLabel: entry.topic,
      currentTeacherId: entry.assignedTeacherId,
      currentTeacherName: entry.assignedTeacherName,
      isSubstitute: entry.isSubstitute,
      substituteTeacherName: entry.actualTeacherName,
      substituteReason: entry.substituteReason,
    });
    setDialogOpen(true);
  }

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
      {data.timeline.map((entry, i) => {
        // Reassignment is only sensible before the meeting has actually
        // started — matches the "already checked in, can't change tutor"
        // guard enforced server-side in
        // assignSubstituteForLessonPlan/cancelSubstitute.
        const canReassign = !entry.checkInTime && entry.meetingStatus !== "COMPLETED";
        return (
          <TimelineItem
            key={entry.lessonPlanId}
            entry={entry}
            isLast={i === data.timeline.length - 1}
            totalEnrolled={data.totalEnrolled}
            canReassign={canReassign}
            onReassign={openReassignDialog}
            onManageMeeting={openManageDialog}
          />
        );
      })}

      <ReassignTutorDialog open={dialogOpen} onOpenChange={setDialogOpen} target={target} />
      <MeetingAdminDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        meetingId={manageEntry?.meetingId ?? null}
        classId={classId}
        meetingLabel={manageEntry ? `Meeting ${manageEntry.meetingNumber} — ${manageEntry.topic}` : ""}
      />
    </div>
  );
}
