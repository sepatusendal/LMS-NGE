"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useCreateReport, useUpdateReport } from "@/features/reports/use-reports";
import { useClassRoster } from "@/features/classes/use-roster";
import { FileUpload } from "@/features/drive/file-upload";
import {
  buildReportSchema,
  SKILL_OPTIONS,
  OBJECTIVES_KEY,
  type ObjectivesAchieved,
  type ReportInput,
  type TeachingReport,
} from "@/features/reports/schema";

const OBJECTIVES_BADGE_VARIANT: Record<ObjectivesAchieved, "default" | "secondary" | "destructive"> = {
  YES: "default",
  PARTIALLY: "secondary",
  NO: "destructive",
};

function deriveObjectivesAchieved(objectives: { achieved: boolean }[]): ObjectivesAchieved | null {
  if (objectives.length === 0) return null;
  const achievedCount = objectives.filter((o) => o.achieved).length;
  if (achievedCount === objectives.length) return "YES";
  if (achievedCount === 0) return "NO";
  return "PARTIALLY";
}

interface Props {
  meetingId: string;
  classId: string;
  learningObjectives: string[];
  curriculumReportFormat?: "STANDARD" | "ALBRIGHT";
  /** Present when this meeting already has a report — switches the form
   * into edit mode (prefilled, submits via update_teaching_report instead
   * of create_teaching_report). */
  existingReport?: TeachingReport | null;
  /** True once the 7-day edit window has passed — renders every field
   * disabled with a notice instead of a submit button, mirroring how
   * LessonPlanForm handles its own expired/not-owner readOnly state. */
  readOnly?: boolean;
  onSubmitSuccess?: () => void;
}

export function ReportForm({
  meetingId,
  classId,
  learningObjectives,
  curriculumReportFormat = "STANDARD",
  existingReport,
  readOnly = false,
  onSubmitSuccess,
}: Props) {
  const isAlbright = curriculumReportFormat === "ALBRIGHT";
  const isEdit = Boolean(existingReport);
  const t = useTranslations("reportForm");
  const reportSchema = useMemo(() => buildReportSchema(t), [t]);
  const createReport = useCreateReport(meetingId);
  const updateReport = useUpdateReport(meetingId);
  const { data: roster, refetch: refetchRoster } = useClassRoster(classId);
  const [followUps, setFollowUps] = useState<{ studentId: string; studentName: string; note: string }[]>(
    existingReport?.followUps ?? [],
  );
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [isCheckingRoster, setIsCheckingRoster] = useState(false);
  const [photoDriveFileId, setPhotoDriveFileId] = useState(existingReport?.photoDriveFileId ?? "");
  const [photoFileName, setPhotoFileName] = useState(existingReport?.photoFileName ?? "");
  // Defaults to every objective achieved — the teacher unchecks the ones
  // that weren't met, rather than picking a flat YES/PARTIALLY/NO status.
  const [objectives, setObjectives] = useState(
    existingReport && existingReport.objectives.length > 0
      ? existingReport.objectives.map((o) => ({ text: o.objectiveText, achieved: o.achieved }))
      : learningObjectives.map((text) => ({ text, achieved: true })),
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      meetingId,
      skills: existingReport?.skills ?? [],
      whatWentWell: existingReport?.whatWentWell ?? undefined,
      whatNeedsImprovement: existingReport?.whatNeedsImprovement ?? undefined,
      actionPlan: existingReport?.actionPlan ?? undefined,
      nextLessonNotes: existingReport?.nextLessonNotes ?? undefined,
      homeworkAssigned: existingReport?.homeworkAssigned ?? undefined,
      languageSkillsFocus: existingReport?.languageSkillsFocus ?? undefined,
      activitiesLog: existingReport?.activitiesLog ?? undefined,
      resourcesUsed: existingReport?.resourcesUsed ?? undefined,
      followUps: [],
    },
  });

  function toggleObjective(index: number, achieved: boolean) {
    setObjectives((prev) => prev.map((o, i) => (i === index ? { ...o, achieved } : o)));
  }

  const derivedStatus = deriveObjectivesAchieved(objectives);
  const whatNeedsImprovement = watch("whatNeedsImprovement");
  const showActionPlan = Boolean((whatNeedsImprovement ?? "").trim());

  async function addFollowUp() {
    if (!selectedStudentId || !followUpNote.trim()) return;

    setIsCheckingRoster(true);
    try {
      // Re-check enrollment against the latest roster right before recording
      // the follow-up — the roster fetched at mount may be stale if the
      // student was unenrolled in the meantime.
      const { data: freshRoster } = await refetchRoster();
      const student = freshRoster?.find((s) => s.studentId === selectedStudentId);
      if (!student) {
        toast.error(t("studentNoLongerEnrolled"), {
          description: t("rosterUpdatedNotice"),
        });
        setSelectedStudentId("");
        return;
      }

      setFollowUps((prev) => [
        ...prev,
        { studentId: selectedStudentId, studentName: student.fullName, note: followUpNote.trim() },
      ]);
      setSelectedStudentId("");
      setFollowUpNote("");
    } finally {
      setIsCheckingRoster(false);
    }
  }

  function removeFollowUp(index: number) {
    setFollowUps((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: Record<string, unknown>) {
    const v = values as unknown as ReportInput;
    const payload = {
      skills: isAlbright ? [] : v.skills || [],
      objectives: isAlbright ? [] : objectives,
      whatWentWell: isAlbright ? undefined : v.whatWentWell,
      whatNeedsImprovement: isAlbright ? undefined : v.whatNeedsImprovement,
      actionPlan: isAlbright ? undefined : v.actionPlan,
      nextLessonNotes: isAlbright ? undefined : v.nextLessonNotes,
      homeworkAssigned: v.homeworkAssigned,
      languageSkillsFocus: isAlbright ? v.languageSkillsFocus : undefined,
      activitiesLog: isAlbright ? v.activitiesLog : undefined,
      resourcesUsed: isAlbright ? v.resourcesUsed : undefined,
      followUps: followUps.map((f) => ({ studentId: f.studentId, note: f.note })),
      photoDriveFileId: photoDriveFileId || undefined,
      photoFileName: photoFileName || undefined,
    };
    if (isEdit && existingReport) {
      await updateReport.mutateAsync({ reportId: existingReport.id, ...payload });
    } else {
      await createReport.mutateAsync(payload);
    }
    onSubmitSuccess?.();
  }

  const isSubmitting = createReport.isPending || updateReport.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {readOnly && (
        <div className="bg-chart-4/10 text-foreground flex items-start gap-2.5 rounded-lg border border-chart-4/20 px-4 py-3 text-sm">
          <span className="bg-chart-4/20 text-chart-4 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            !
          </span>
          <span>{t("editWindowExpiredNotice")}</span>
        </div>
      )}
      <fieldset disabled={readOnly} className="space-y-4 border-0 p-0">
      {isAlbright ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="languageSkillsFocus">{t("albright.languageSkillsFocus")}</Label>
            <p className="text-muted-foreground text-xs">{t("albright.languageSkillsFocusHint")}</p>
            <Textarea id="languageSkillsFocus" rows={2} {...register("languageSkillsFocus")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="activitiesLog">{t("albright.activities")}</Label>
            <p className="text-muted-foreground text-xs">{t("albright.activitiesHint")}</p>
            <Textarea id="activitiesLog" rows={5} {...register("activitiesLog")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resourcesUsed">{t("albright.resources")}</Label>
            <p className="text-muted-foreground text-xs">{t("albright.resourcesHint")}</p>
            <Textarea id="resourcesUsed" rows={2} {...register("resourcesUsed")} />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label>{t("skillsTaught")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <label key={skill} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    value={skill}
                    className="accent-primary size-4"
                    {...register("skills")}
                  />
                  {skill}
                </label>
              ))}
            </div>
          </div>

          {objectives.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>{t("objectivesAchieved")}</Label>
                {derivedStatus && (
                  <Badge variant={OBJECTIVES_BADGE_VARIANT[derivedStatus]} className="text-[10px]">
                    {t(`objectivesStatus.${OBJECTIVES_KEY[derivedStatus]}`)}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">{t("objectivesDefaultHint")}</p>
              <div className="divide-y rounded-lg border">
                {objectives.map((o, i) => (
                  <label key={i} className="flex items-start gap-2.5 px-3 py-2.5 text-sm">
                    <Checkbox
                      checked={o.achieved}
                      onCheckedChange={(checked) => toggleObjective(i, checked === true)}
                      className="mt-0.5"
                    />
                    <span className={o.achieved ? undefined : "text-muted-foreground line-through"}>{o.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="whatWentWell">{t("whatWentWell")}</Label>
            <Textarea id="whatWentWell" rows={2} {...register("whatWentWell")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatNeedsImprovement">{t("whatNeedsImprovement")}</Label>
            <Textarea id="whatNeedsImprovement" rows={2} {...register("whatNeedsImprovement")} />
          </div>

          {showActionPlan && (
            <div className="space-y-2">
              <Label htmlFor="actionPlan">
                {t("actionPlan")} <span className="text-destructive">*</span>
              </Label>
              <p className="text-muted-foreground text-xs">{t("actionPlanHint")}</p>
              <Textarea id="actionPlan" rows={2} {...register("actionPlan")} aria-invalid={Boolean(errors.actionPlan)} />
              {errors.actionPlan && (
                <p className="text-destructive text-xs">{errors.actionPlan.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nextLessonNotes">{t("nextLessonNotes")}</Label>
            <Textarea id="nextLessonNotes" rows={2} {...register("nextLessonNotes")} />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="homeworkAssigned">{isAlbright ? t("albright.homework") : t("homework")}</Label>
        <Textarea id="homeworkAssigned" rows={2} {...register("homeworkAssigned")} />
      </div>

      <div className="space-y-2">
        <Label>{t("followUpStudents")}</Label>
        <div className="flex gap-2">
          <Select
            items={roster?.filter((s) => !followUps.some((f) => f.studentId === s.studentId)).map((s) => ({ value: s.studentId, label: s.fullName })) ?? []}
            value={selectedStudentId}
            onValueChange={(v) => v && setSelectedStudentId(v)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t("selectStudent")} />
            </SelectTrigger>
            <SelectContent>
              {roster
                ?.filter((s) => !followUps.some((f) => f.studentId === s.studentId))
                .map((s) => (
                  <SelectItem key={s.studentId} value={s.studentId}>
                    {s.fullName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <input
            className="border-input flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
            placeholder={t("notePlaceholder")}
            value={followUpNote}
            onChange={(e) => setFollowUpNote(e.target.value)}
          />
          <Button type="button" variant="outline" size="sm" onClick={addFollowUp} disabled={isCheckingRoster}>
            +
          </Button>
        </div>
        {followUps.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {followUps.map((f, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {f.studentName}: {f.note}
                <button type="button" onClick={() => removeFollowUp(i)} className="ml-1">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("activityPhoto")}</Label>
        <FileUpload
          label={t("uploadActivityPhoto")}
          currentFile={photoFileName || null}
          onUploaded={(id, name) => {
            setPhotoDriveFileId(id);
            setPhotoFileName(name);
          }}
        />
      </div>
      </fieldset>

      {!readOnly && (
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("submitting") : isEdit ? t("update") : t("submit")}
        </Button>
      )}
    </form>
  );
}
