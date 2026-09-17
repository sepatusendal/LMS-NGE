"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMeetingAdminDetail, useMeetingAdminMutations } from "./use-meeting-admin";
import { useReportPageContext, useReport } from "@/features/reports/use-reports";
import { ReportForm } from "./report-form";
import type { CheckInCreate, CheckInUpdate, CheckOutCreate, CheckOutUpdate } from "./admin-queries";

/** "2026-08-13T10:00:00+00:00" -> "2026-08-13T10:00" for a datetime-local input. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

function CreateCheckInForm({
  onCreate,
  isCreating,
}: {
  onCreate: (input: CheckInCreate) => void;
  isCreating: boolean;
}) {
  const t = useTranslations("admin.meetingAdmin");
  const [checkInTime, setCheckInTime] = useState(() => toLocalInput(new Date().toISOString()));
  const [isLate, setIsLate] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <p className="text-sm text-muted-foreground">{t("noCheckInYet")}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="new-ci-time" className="text-xs">{t("checkInTime")}</Label>
          <Input
            id="new-ci-time"
            type="datetime-local"
            value={checkInTime}
            onChange={(e) => setCheckInTime(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={isLate}
            onChange={(e) => setIsLate(e.target.checked)}
            className="accent-primary size-4"
          />
          {t("isLate")}
        </label>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-ci-notes" className="text-xs">{t("notes")}</Label>
        <Textarea
          id="new-ci-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={isCreating || !checkInTime}
          onClick={() => onCreate({ checkInTime: fromLocalInput(checkInTime), isLate, notes })}
        >
          {isCreating ? t("adding") : t("addCheckIn")}
        </Button>
      </div>
    </div>
  );
}

function CheckInSection({
  checkIn,
  isAdminEntered,
  onCreate,
  onSave,
  onDelete,
  isCreating,
  isSaving,
  isDeleting,
}: {
  checkIn: { id: string; checkInTime: string; isLate: boolean; notes: string | null } | null;
  isAdminEntered: boolean;
  onCreate: (input: CheckInCreate) => void;
  onSave: (id: string, input: CheckInUpdate) => void;
  onDelete: (id: string) => void;
  isCreating: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const t = useTranslations("admin.meetingAdmin");
  const [checkInTime, setCheckInTime] = useState("");
  const [isLate, setIsLate] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (checkIn) {
      setCheckInTime(toLocalInput(checkIn.checkInTime));
      setIsLate(checkIn.isLate);
      setNotes(checkIn.notes ?? "");
    }
  }, [checkIn]);

  if (!checkIn) {
    return <CreateCheckInForm onCreate={onCreate} isCreating={isCreating} />;
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      {isAdminEntered && (
        <Badge variant="outline" className="text-[10px]">
          {t("adminEnteredBadge")}
        </Badge>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="ci-time" className="text-xs">{t("checkInTime")}</Label>
          <Input
            id="ci-time"
            type="datetime-local"
            value={checkInTime}
            onChange={(e) => setCheckInTime(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={isLate}
            onChange={(e) => setIsLate(e.target.checked)}
            className="accent-primary size-4"
          />
          {t("isLate")}
        </label>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ci-notes" className="text-xs">{t("notes")}</Label>
        <Textarea
          id="ci-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={isDeleting}
          onClick={() => {
            if (window.confirm(t("confirmDeleteCheckIn"))) {
              onDelete(checkIn.id);
            }
          }}
        >
          <Trash2 className="size-3.5" />
          {t("delete")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={() => onSave(checkIn.id, { checkInTime: fromLocalInput(checkInTime), isLate, notes })}
        >
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}

function CreateCheckOutForm({
  onCreate,
  isCreating,
}: {
  onCreate: (input: CheckOutCreate) => void;
  isCreating: boolean;
}) {
  const t = useTranslations("admin.meetingAdmin");
  const [checkOutTime, setCheckOutTime] = useState(() => toLocalInput(new Date().toISOString()));
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <p className="text-sm text-muted-foreground">{t("noCheckOutYet")}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="new-co-time" className="text-xs">{t("checkOutTime")}</Label>
          <Input
            id="new-co-time"
            type="datetime-local"
            value={checkOutTime}
            onChange={(e) => setCheckOutTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-co-duration" className="text-xs">{t("durationMinutes")}</Label>
          <Input
            id="new-co-duration"
            type="number"
            min={0}
            placeholder={t("durationAutoHint")}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-co-notes" className="text-xs">{t("notes")}</Label>
        <Textarea
          id="new-co-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={isCreating || !checkOutTime}
          onClick={() =>
            onCreate({
              checkOutTime: fromLocalInput(checkOutTime),
              durationMinutes: durationMinutes === "" ? null : Number(durationMinutes),
              notes,
            })
          }
        >
          {isCreating ? t("adding") : t("addCheckOut")}
        </Button>
      </div>
    </div>
  );
}

function CheckOutSection({
  checkOut,
  isAdminEntered,
  onCreate,
  onSave,
  onDelete,
  isCreating,
  isSaving,
  isDeleting,
}: {
  checkOut: { id: string; checkOutTime: string; durationMinutes: number; notes: string | null } | null;
  isAdminEntered: boolean;
  onCreate: (input: CheckOutCreate) => void;
  onSave: (id: string, input: CheckOutUpdate) => void;
  onDelete: (id: string) => void;
  isCreating: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const t = useTranslations("admin.meetingAdmin");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (checkOut) {
      setCheckOutTime(toLocalInput(checkOut.checkOutTime));
      setDurationMinutes(checkOut.durationMinutes);
      setNotes(checkOut.notes ?? "");
    }
  }, [checkOut]);

  if (!checkOut) {
    return <CreateCheckOutForm onCreate={onCreate} isCreating={isCreating} />;
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      {isAdminEntered && (
        <Badge variant="outline" className="text-[10px]">
          {t("adminEnteredBadge")}
        </Badge>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="co-time" className="text-xs">{t("checkOutTime")}</Label>
          <Input
            id="co-time"
            type="datetime-local"
            value={checkOutTime}
            onChange={(e) => setCheckOutTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="co-duration" className="text-xs">{t("durationMinutes")}</Label>
          <Input
            id="co-duration"
            type="number"
            min={0}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="co-notes" className="text-xs">{t("notes")}</Label>
        <Textarea
          id="co-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <div className="flex justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={isDeleting}
          onClick={() => {
            if (window.confirm(t("confirmDeleteCheckOut"))) {
              onDelete(checkOut.id);
            }
          }}
        >
          <Trash2 className="size-3.5" />
          {t("delete")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={() =>
            onSave(checkOut.id, { checkOutTime: fromLocalInput(checkOutTime), durationMinutes, notes })
          }
        >
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}

export function MeetingAdminDialog({
  open,
  onOpenChange,
  meetingId,
  classId,
  teacherId,
  meetingLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string | null;
  classId: string;
  /** The teacher a freshly-filed report should be attributed to when admin
   * is the one filling it in (report-form.tsx's adminOverride) — the
   * meeting's assigned/actual teacher, not the admin's own (usually
   * nonexistent) teacher profile. */
  teacherId: string;
  meetingLabel: string;
}) {
  const t = useTranslations("admin.meetingAdmin");
  const { data, isLoading } = useMeetingAdminDetail(meetingId);
  const { data: reportContext } = useReportPageContext(meetingId ?? "");
  const { data: existingReport } = useReport(meetingId ?? "");
  const mutations = useMeetingAdminMutations(meetingId, classId);
  const [adminNote, setAdminNote] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{meetingLabel}</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="text-muted-foreground text-sm">{t("loading")}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-sm font-medium">{t("checkInSection")}</p>
              <CheckInSection
                checkIn={data.checkIn}
                isAdminEntered={data.isAdminEntered}
                onCreate={(input) => mutations.createCheckIn.mutate(input)}
                onSave={(id, input) => mutations.updateCheckIn.mutate({ id, input })}
                onDelete={(id) => mutations.deleteCheckIn.mutate(id)}
                isCreating={mutations.createCheckIn.isPending}
                isSaving={mutations.updateCheckIn.isPending}
                isDeleting={mutations.deleteCheckIn.isPending}
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">{t("checkOutSection")}</p>
              <CheckOutSection
                checkOut={data.checkOut}
                isAdminEntered={data.isAdminEntered}
                onCreate={(input) => mutations.createCheckOut.mutate(input)}
                onSave={(id, input) => mutations.updateCheckOut.mutate({ id, input })}
                onDelete={(id) => mutations.deleteCheckOut.mutate(id)}
                isCreating={mutations.createCheckOut.isPending}
                isSaving={mutations.updateCheckOut.isPending}
                isDeleting={mutations.deleteCheckOut.isPending}
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">{t("reportSection")}</p>
              {reportContext ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="report-admin-note" className="text-xs">
                      {t("adminNoteLabel")}
                    </Label>
                    <Textarea
                      id="report-admin-note"
                      rows={2}
                      placeholder={t("adminNoteHint")}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                    />
                  </div>
                  <ReportForm
                    meetingId={meetingId as string}
                    classId={classId}
                    learningObjectives={reportContext.learningObjectives}
                    curriculumReportFormat={reportContext.curriculumReportFormat}
                    existingReport={existingReport}
                    adminOverride={{ originalTeacherId: teacherId, adminNote: adminNote || undefined }}
                  />
                  {data.reportId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={mutations.deleteReport.isPending}
                      onClick={() => {
                        if (window.confirm(t("confirmDeleteReport"))) {
                          mutations.deleteReport.mutate(data.reportId as string);
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      {t("deleteReport")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                  {t("loadingReportContext")}
                </div>
              )}
            </div>

            {(data.checkIn || data.checkOut || data.reportId) && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-destructive">{t("resetMeeting")}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{t("resetMeetingHint")}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={mutations.resetMeeting.isPending}
                  onClick={() => {
                    if (window.confirm(t("confirmResetMeeting"))) {
                      mutations.resetMeeting.mutate();
                    }
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  {mutations.resetMeeting.isPending ? t("resetting") : t("resetMeeting")}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
