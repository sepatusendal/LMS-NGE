"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2 } from "lucide-react";
import { useClassRoster } from "@/features/classes/use-roster";
import { useReportPageContext } from "@/features/reports/use-reports";
import { ReportForm } from "@/features/meetings/report-form";
import { ATTENDANCE_STATUS_OPTIONS, STATUS_LABEL } from "@/features/attendances/schema";
import { useBackfillMeeting } from "./use-backfill";

export interface BackfillSessionTarget {
  classId: string;
  className: string;
  schoolName: string;
  teacherId: string;
  teacherName: string;
  scheduledDate: string;
}

function todayLocalTimeStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function BackfillSessionDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: BackfillSessionTarget | null;
}) {
  const t = useTranslations("admin.backfillDialog");
  const backfill = useBackfillMeeting();
  const { data: roster } = useClassRoster(target?.classId ?? "");

  const [topic, setTopic] = useState("");
  const [objectivesText, setObjectivesText] = useState("");
  const [checkInTime, setCheckInTime] = useState(todayLocalTimeStr());
  const [checkOutTime, setCheckOutTime] = useState("");
  const [isLate, setIsLate] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [adminNote, setAdminNote] = useState("");
  const [createdMeetingId, setCreatedMeetingId] = useState<string | null>(null);

  const { data: reportContext } = useReportPageContext(createdMeetingId ?? "");

  function reset() {
    setTopic("");
    setObjectivesText("");
    setCheckInTime(todayLocalTimeStr());
    setCheckOutTime("");
    setIsLate(false);
    setStatusMap({});
    setAdminNote("");
    setCreatedMeetingId(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function toIso(time: string) {
    if (!target || !time) return null;
    return new Date(`${target.scheduledDate}T${time}:00`).toISOString();
  }

  async function handleSubmit() {
    if (!target || !topic.trim()) return;
    const meetingId = await backfill.mutateAsync({
      classId: target.classId,
      actualTeacherId: target.teacherId,
      scheduledDate: target.scheduledDate,
      topic: topic.trim(),
      learningObjectives: objectivesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      checkInTime: toIso(checkInTime),
      isLate,
      checkOutTime: checkOutTime ? toIso(checkOutTime) : null,
      attendance: (roster ?? []).map((s) => ({
        studentId: s.studentId,
        status: statusMap[s.studentId] ?? "PRESENT",
      })),
      adminNote: adminNote.trim(),
    });
    setCreatedMeetingId(meetingId);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {target ? `${target.className} — ${target.schoolName} · ${target.teacherName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {!target ? null : createdMeetingId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="size-4 shrink-0" />
              {t("sessionCreatedNotice")}
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">{t("reportSection")}</p>
              {reportContext && (
                <ReportForm
                  meetingId={createdMeetingId}
                  classId={target.classId}
                  learningObjectives={reportContext.learningObjectives}
                  curriculumReportFormat={reportContext.curriculumReportFormat}
                  adminOverride={{ originalTeacherId: target.teacherId, adminNote: adminNote || undefined }}
                  onSubmitSuccess={() => handleOpenChange(false)}
                />
              )}
            </div>
            <Button type="button" variant="ghost" className="w-full" onClick={() => handleOpenChange(false)}>
              {t("finishLater")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">{t("lessonPlanSection")}</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bf-topic" className="text-xs">{t("topicLabel")}</Label>
                  <Input
                    id="bf-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t("topicPlaceholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bf-objectives" className="text-xs">{t("objectivesLabel")}</Label>
                  <Textarea
                    id="bf-objectives"
                    rows={2}
                    value={objectivesText}
                    onChange={(e) => setObjectivesText(e.target.value)}
                    placeholder={t("objectivesPlaceholder")}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">{t("checkInOutSection")}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bf-checkin" className="text-xs">{t("checkInTimeLabel")}</Label>
                  <Input
                    id="bf-checkin"
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bf-checkout" className="text-xs">{t("checkOutTimeLabel")}</Label>
                  <Input
                    id="bf-checkout"
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                  />
                </div>
              </div>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isLate}
                  onChange={(e) => setIsLate(e.target.checked)}
                  className="accent-primary size-4"
                />
                {t("isLateLabel")}
              </label>
            </div>

            {roster && roster.length > 0 && (
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">{t("attendanceSection")}</p>
                <div className="divide-y">
                  {roster.map((s) => (
                    <div key={s.studentId} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="truncate text-sm">{s.fullName}</span>
                      <Select
                        items={ATTENDANCE_STATUS_OPTIONS.map((st) => ({ value: st, label: STATUS_LABEL[st] }))}
                        value={statusMap[s.studentId] ?? "PRESENT"}
                        onValueChange={(v) => v && setStatusMap((prev) => ({ ...prev, [s.studentId]: v }))}
                      >
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ATTENDANCE_STATUS_OPTIONS.map((st) => (
                            <SelectItem key={st} value={st}>
                              {STATUS_LABEL[st]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="bf-admin-note" className="text-xs">
                {t("adminNoteLabel")} <span className="text-destructive">*</span>
              </Label>
              <p className="text-muted-foreground text-xs">{t("adminNoteHint")}</p>
              <Textarea
                id="bf-admin-note"
                rows={2}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={t("adminNotePlaceholder")}
              />
            </div>

            <Badge variant="outline" className="text-[10px]">
              {t("adminEnteredBadge")}
            </Badge>

            <Button
              type="button"
              className="w-full"
              disabled={!topic.trim() || !adminNote.trim() || backfill.isPending}
              onClick={handleSubmit}
            >
              {backfill.isPending ? t("submitting") : t("submit")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
