"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OBJECTIVES_LABEL, OBJECTIVES_OPTIONS, SKILL_OPTIONS } from "@/features/reports/schema";
import { useMeetingAdminDetail, useMeetingAdminMutations } from "./use-meeting-admin";
import type { CheckInUpdate, CheckOutUpdate, TeachingReportUpdate } from "./admin-queries";

/** "2026-08-13T10:00:00+00:00" -> "2026-08-13T10:00" for a datetime-local input. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

function CheckInSection({
  checkIn,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  checkIn: { id: string; checkInTime: string; isLate: boolean; notes: string | null } | null;
  onSave: (id: string, input: CheckInUpdate) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
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
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Belum ada check-in.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="ci-time" className="text-xs">Waktu Check-in</Label>
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
          Terlambat
        </label>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ci-notes" className="text-xs">Catatan</Label>
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
            if (window.confirm("Hapus check-in ini? Tutor bisa check-in ulang setelah ini.")) {
              onDelete(checkIn.id);
            }
          }}
        >
          <Trash2 className="size-3.5" />
          Hapus
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={() => onSave(checkIn.id, { checkInTime: fromLocalInput(checkInTime), isLate, notes })}
        >
          {isSaving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

function CheckOutSection({
  checkOut,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  checkOut: { id: string; checkOutTime: string; durationMinutes: number; notes: string | null } | null;
  onSave: (id: string, input: CheckOutUpdate) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
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
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Belum ada check-out.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="co-time" className="text-xs">Waktu Check-out</Label>
          <Input
            id="co-time"
            type="datetime-local"
            value={checkOutTime}
            onChange={(e) => setCheckOutTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="co-duration" className="text-xs">Durasi (menit)</Label>
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
        <Label htmlFor="co-notes" className="text-xs">Catatan</Label>
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
            if (window.confirm("Hapus check-out ini?")) {
              onDelete(checkOut.id);
            }
          }}
        >
          <Trash2 className="size-3.5" />
          Hapus
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isSaving}
          onClick={() =>
            onSave(checkOut.id, { checkOutTime: fromLocalInput(checkOutTime), durationMinutes, notes })
          }
        >
          {isSaving ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </div>
  );
}

function ReportSection({
  report,
  onSave,
  onDelete,
  isSaving,
  isDeleting,
}: {
  report: {
    id: string;
    actualTeachingDate: string;
    skills: string[];
    objectivesAchieved: string | null;
    whatWentWell: string | null;
    whatNeedsImprovement: string | null;
    nextLessonNotes: string | null;
    homeworkAssigned: string | null;
    summary: string | null;
  } | null;
  onSave: (id: string, input: TeachingReportUpdate) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  isDeleting: boolean;
}) {
  const [form, setForm] = useState<TeachingReportUpdate>({
    actualTeachingDate: "",
    skills: [],
    objectivesAchieved: "",
    whatWentWell: "",
    whatNeedsImprovement: "",
    nextLessonNotes: "",
    homeworkAssigned: "",
    summary: "",
  });

  useEffect(() => {
    if (report) {
      setForm({
        actualTeachingDate: report.actualTeachingDate.slice(0, 10),
        skills: report.skills,
        objectivesAchieved: report.objectivesAchieved ?? "",
        whatWentWell: report.whatWentWell ?? "",
        whatNeedsImprovement: report.whatNeedsImprovement ?? "",
        nextLessonNotes: report.nextLessonNotes ?? "",
        homeworkAssigned: report.homeworkAssigned ?? "",
        summary: report.summary ?? "",
      });
    }
  }, [report]);

  if (!report) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        Belum ada Daily Teaching Report.
      </div>
    );
  }

  function toggleSkill(skill: string) {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter((s) => s !== skill) : [...f.skills, skill],
    }));
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="rp-date" className="text-xs">Tanggal Mengajar</Label>
          <Input
            id="rp-date"
            type="date"
            value={form.actualTeachingDate}
            onChange={(e) => setForm((f) => ({ ...f, actualTeachingDate: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tujuan Tercapai</Label>
          <Select
            items={OBJECTIVES_OPTIONS.map((o) => ({ value: o, label: OBJECTIVES_LABEL[o] }))}
            value={form.objectivesAchieved}
            onValueChange={(v) => setForm((f) => ({ ...f, objectivesAchieved: v ?? "" }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih" />
            </SelectTrigger>
            <SelectContent>
              {OBJECTIVES_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {OBJECTIVES_LABEL[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Skills</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {SKILL_OPTIONS.map((skill) => (
            <label key={skill} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.skills.includes(skill)}
                onChange={() => toggleSkill(skill)}
                className="accent-primary size-4"
              />
              {skill}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-well" className="text-xs">What Went Well</Label>
        <Textarea
          id="rp-well"
          rows={2}
          value={form.whatWentWell}
          onChange={(e) => setForm((f) => ({ ...f, whatWentWell: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-improve" className="text-xs">What Needs Improvement</Label>
        <Textarea
          id="rp-improve"
          rows={2}
          value={form.whatNeedsImprovement}
          onChange={(e) => setForm((f) => ({ ...f, whatNeedsImprovement: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-next" className="text-xs">Next Lesson Notes</Label>
        <Textarea
          id="rp-next"
          rows={2}
          value={form.nextLessonNotes}
          onChange={(e) => setForm((f) => ({ ...f, nextLessonNotes: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-hw" className="text-xs">Homework Assigned</Label>
        <Textarea
          id="rp-hw"
          rows={2}
          value={form.homeworkAssigned}
          onChange={(e) => setForm((f) => ({ ...f, homeworkAssigned: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-summary" className="text-xs">Summary</Label>
        <Textarea
          id="rp-summary"
          rows={2}
          value={form.summary}
          onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
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
            if (window.confirm("Hapus Daily Teaching Report ini?")) {
              onDelete(report.id);
            }
          }}
        >
          <Trash2 className="size-3.5" />
          Hapus
        </Button>
        <Button type="button" size="sm" disabled={isSaving} onClick={() => onSave(report.id, form)}>
          {isSaving ? "Menyimpan..." : "Simpan"}
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
  meetingLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string | null;
  classId: string;
  meetingLabel: string;
}) {
  const { data, isLoading } = useMeetingAdminDetail(meetingId);
  const mutations = useMeetingAdminMutations(meetingId, classId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kelola Meeting</DialogTitle>
          <DialogDescription>{meetingLabel}</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-sm font-medium">Check-in</p>
              <CheckInSection
                checkIn={data.checkIn}
                onSave={(id, input) => mutations.updateCheckIn.mutate({ id, input })}
                onDelete={(id) => mutations.deleteCheckIn.mutate(id)}
                isSaving={mutations.updateCheckIn.isPending}
                isDeleting={mutations.deleteCheckIn.isPending}
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Check-out</p>
              <CheckOutSection
                checkOut={data.checkOut}
                onSave={(id, input) => mutations.updateCheckOut.mutate({ id, input })}
                onDelete={(id) => mutations.deleteCheckOut.mutate(id)}
                isSaving={mutations.updateCheckOut.isPending}
                isDeleting={mutations.deleteCheckOut.isPending}
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Daily Teaching Report</p>
              <ReportSection
                report={data.report}
                onSave={(id, input) => mutations.updateReport.mutate({ id, input })}
                onDelete={(id) => mutations.deleteReport.mutate(id)}
                isSaving={mutations.updateReport.isPending}
                isDeleting={mutations.deleteReport.isPending}
              />
            </div>

            {(data.checkIn || data.checkOut || data.report) && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-destructive">Reset Meeting</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Hapus check-in, check-out, absensi, dan report sekaligus — tutor mulai ulang dari
                  check-in. Tidak bisa dibatalkan.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                  disabled={mutations.resetMeeting.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Reset meeting ini? Check-in, check-out, absensi, dan report akan dihapus semua.",
                      )
                    ) {
                      mutations.resetMeeting.mutate();
                    }
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  {mutations.resetMeeting.isPending ? "Mereset..." : "Reset Meeting"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
