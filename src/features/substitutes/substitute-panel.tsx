"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTeachers } from "@/features/teachers/use-teachers";
import {
  useAssignSubstitute,
  useCancelSubstitute,
  useCurrentMeetingInfo,
} from "./use-substitutes";
import { ABSENCE_REASONS, ABSENCE_REASON_KEY } from "./schema";

interface Props {
  classId: string;
}

export function SubstitutePanel({ classId }: Props) {
  const t = useTranslations("admin.substitutes.panel");
  const tCommon = useTranslations("common");
  const tReason = useTranslations("workflow.absenceReason");
  const { data: info, isLoading } = useCurrentMeetingInfo(classId);
  const { data: teachers } = useTeachers();
  const assign = useAssignSubstitute(classId);
  const cancel = useCancelSubstitute(classId);

  const [assigning, setAssigning] = useState(false);
  const [substituteTeacherId, setSubstituteTeacherId] = useState("");
  const [reason, setReason] = useState("");

  if (isLoading) return null;
  if (!info) {
    return (
      <div className="rounded-lg border px-3 py-2.5">
        <p className="text-muted-foreground text-sm">{t("noLessonPlanYet")}</p>
      </div>
    );
  }

  async function handleAssign() {
    if (!substituteTeacherId || !reason) return;
    try {
      await assign.mutateAsync({ substituteTeacherId, reason });
      setAssigning(false);
      setSubstituteTeacherId("");
      setReason("");
    } catch {
      // Error toast already shown by the mutation's onError (e.g. a
      // schedule conflict) — keep the form open so the admin can pick a
      // different teacher instead of losing their input.
    }
  }

  const teacherOptions = (teachers ?? []).filter((te) => te.id !== info.effectiveTeacherId);
  const reasonLabel = (r: string) =>
    ABSENCE_REASON_KEY[r] ? tReason(ABSENCE_REASON_KEY[r]) : r;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-medium">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("meetingLabel", { number: info.meetingNumber, topic: info.topic })}
        </p>
      </div>

      <div className="rounded-lg border px-3 py-2.5">
        {info.hasCheckIn ? (
          <p className="text-sm">
            {info.isSubstituted ? (
              <>
                {t("taughtBy")} <span className="font-medium">{info.substituteTeacherName}</span>{" "}
                {t("substituteForCheckedIn", { teacher: info.effectiveTeacherName })}
              </>
            ) : (
              <>
                {t("taughtBy")} <span className="font-medium">{info.effectiveTeacherName}</span>{" "}
                {t("alreadyCheckedIn")}
              </>
            )}
          </p>
        ) : info.isSubstituted ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm">
              <p>
                <span className="font-medium">{info.effectiveTeacherName}</span> {t("markedAbsent")}{" "}
                <span className="font-medium">{info.substituteTeacherName}</span>
              </p>
              <Badge variant="secondary" className="mt-1">
                {reasonLabel(info.substituteReason ?? "")}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={cancel.isPending || !info.meetingId}
              onClick={() => info.meetingId && cancel.mutate(info.meetingId)}
            >
              {t("cancel")}
            </Button>
          </div>
        ) : assigning ? (
          <div className="space-y-2">
            <Select
              items={teacherOptions.map((te) => ({ value: te.id, label: te.fullName }))}
              value={substituteTeacherId}
              onValueChange={(v) => v && setSubstituteTeacherId(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectSubstitute")} />
              </SelectTrigger>
              <SelectContent>
                {teacherOptions.map((te) => (
                  <SelectItem key={te.id} value={te.id}>
                    {te.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!substituteTeacherId || !reason || assign.isPending}
                onClick={handleAssign}
              >
                {assign.isPending ? tCommon("saving") : tCommon("save")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAssigning(false)}>
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm">
              {t("taughtBy")} <span className="font-medium">{info.effectiveTeacherName}</span>
            </p>
            <Button size="sm" variant="outline" onClick={() => setAssigning(true)}>
              {t("markAbsent")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
