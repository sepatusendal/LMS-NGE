"use client";

import { useEffect, useState } from "react";
import { UserRoundCog } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { ABSENCE_REASONS, ABSENCE_REASON_KEY } from "./schema";

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
  const t = useTranslations("admin.substitutes.reassignDialog");
  const tCommon = useTranslations("common");
  const tReason = useTranslations("workflow.absenceReason");
  const locale = useLocale();
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

  const teacherOptions = (teachers ?? []).filter((te) => te.id !== target.currentTeacherId);
  const reasonLabel = (r: string) => (ABSENCE_REASON_KEY[r] ? tReason(ABSENCE_REASON_KEY[r]) : r);

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

  const dateLabel = parseLocalDate(target.scheduledDate).toLocaleDateString(
    locale === "en" ? "en-US" : "id-ID",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="bg-primary/10 text-primary mb-1 flex size-9 items-center justify-center rounded-full">
            <UserRoundCog className="size-4.5" />
          </div>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {target.className}
            {target.contextLabel ? ` · ${target.contextLabel}` : ""} · {dateLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
            <p className="text-muted-foreground text-xs">{t("scheduledTutor")}</p>
            <p className="text-sm font-medium">{target.currentTeacherName}</p>
            {target.isSubstitute && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {t("currentlySubstituted")}
                </Badge>
                <span className="text-muted-foreground text-xs">
                  {t("by")} <span className="font-medium text-foreground">{target.substituteTeacherName}</span>
                  {target.substituteReason
                    ? ` — ${reasonLabel(target.substituteReason)}`
                    : ""}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("substituteTutor")}</Label>
            <Select
              items={teacherOptions.map((te) => ({ value: te.id, label: te.fullName }))}
              value={substituteTeacherId}
              onValueChange={(v) => v && setSubstituteTeacherId(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectSubstituteTutor")} />
              </SelectTrigger>
              <SelectContent>
                {teacherOptions.map((te) => (
                  <SelectItem key={te.id} value={te.id}>
                    {te.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("reason")}</Label>
            <Select
              items={ABSENCE_REASONS.map((r) => ({ value: r, label: reasonLabel(r) }))}
              value={reason}
              onValueChange={(v) => v && setReason(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectReason")} />
              </SelectTrigger>
              <SelectContent>
                {ABSENCE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {reasonLabel(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-muted-foreground text-xs">
            {t("hint", { date: dateLabel, teacher: target.currentTeacherName })}
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
              {cancel.isPending ? t("cancelling") : t("cancelSubstitution")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("close")}
            </Button>
            <Button
              disabled={!substituteTeacherId || !reason || assign.isPending}
              onClick={handleSave}
            >
              {assign.isPending ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
