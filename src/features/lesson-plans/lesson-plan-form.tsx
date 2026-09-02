"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Plus,
  X,
  FileText,
  ClipboardList,
  Target,
  Wrench,
  ListOrdered,
  MessageCircleQuestion,
  type LucideIcon,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleCoverBanner } from "@/components/shared/module-cover";
import { FileUpload } from "@/features/drive/file-upload";
import { useMyClasses } from "@/features/classes/use-my-classes";
import { useClasses } from "@/features/classes/use-classes";
import { formatScheduleSlots } from "@/features/classes/schema";
import {
  LEVEL_OPTIONS,
  MATERIAL_OPTIONS,
  SKILL_OPTIONS,
  STAGE_NAMES,
  buildLessonPlanSchema,
  emptyLearningObjectives,
  emptyStages,
  type LessonPlan,
  type LessonPlanInput,
} from "./schema";
import {
  useCreateLessonPlan,
  useLessonPlans,
  useUpdateLessonPlan,
} from "./use-lesson-plans";

const SECTION_ACCENTS = {
  blue: {
    bar: "bg-chart-1",
    iconBg: "bg-chart-1/10",
    iconText: "text-chart-1",
  },
  green: {
    bar: "bg-chart-3",
    iconBg: "bg-chart-3/10",
    iconText: "text-chart-3",
  },
  gold: {
    bar: "bg-chart-4",
    iconBg: "bg-chart-4/10",
    iconText: "text-chart-4",
  },
  orange: {
    bar: "bg-chart-2",
    iconBg: "bg-chart-2/10",
    iconText: "text-chart-2",
  },
  pink: {
    bar: "bg-chart-5",
    iconBg: "bg-chart-5/10",
    iconText: "text-chart-5",
  },
} as const;

function Section({
  title,
  description,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  accent: keyof typeof SECTION_ACCENTS;
  children: React.ReactNode;
}) {
  const colors = SECTION_ACCENTS[accent];
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className={`h-1.5 w-full ${colors.bar}`} />
      <CardHeader className="gap-0 border-b py-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${colors.iconBg}`}
          >
            <Icon className={`size-4.5 ${colors.iconText}`} />
          </div>
          <div>
            <CardTitle className="text-sm">{title}</CardTitle>
            {description && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 py-4">{children}</CardContent>
    </Card>
  );
}

export function LessonPlanForm({
  lessonPlan,
  readOnly = false,
  adminMode = false,
}: {
  lessonPlan?: LessonPlan;
  readOnly?: boolean;
  /** Admin authoring/editing on behalf of any teacher — picks from every
   * class instead of the logged-in teacher's own, and the module-cover
   * banner (which needs teacher-scoped data) is skipped. */
  adminMode?: boolean;
}) {
  const isEdit = Boolean(lessonPlan);
  const router = useRouter();
  const t = useTranslations("lessonPlanForm");
  const dayLabels = useTranslations("common").raw("daysShort") as Record<string, string>;
  const lessonPlanSchema = useMemo(() => buildLessonPlanSchema(t), [t]);
  const { data: myClasses } = useMyClasses();
  const { data: allClasses } = useClasses(undefined, adminMode);
  // Lesson-plan authorship is restricted to a class's primary teacher at the
  // DB level (RLS) — a covering teacher reached only via a weekly schedule
  // override can read plans but not create/own one, so exclude those here.
  const classes = adminMode
    ? allClasses?.map((c) => ({
        id: c.id,
        name: c.name,
        schoolName: c.schoolName,
        scheduleSlots: c.scheduleSlots,
        teacherId: c.teacherId as string | undefined,
      }))
    : myClasses?.filter((c) => c.isPrimary);
  const { data: existingPlans } = useLessonPlans();
  const updateLessonPlan = useUpdateLessonPlan();

  const [moduleDriveFileId, setModuleDriveFileId] = useState(
    lessonPlan?.moduleDriveFileId ?? "",
  );
  const [moduleFileName, setModuleFileName] = useState(
    lessonPlan?.moduleFileName ?? "",
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(lessonPlanSchema),
    defaultValues: lessonPlan
      ? {
          classId: lessonPlan.classId,
          meetingNumber: lessonPlan.meetingNumber,
          week: lessonPlan.week,
          scheduledDate: lessonPlan.scheduledDate.slice(0, 10),
          level: lessonPlan.level ?? "",
          topic: lessonPlan.topic,
          learningObjectives: lessonPlan.learningObjectives.length
            ? lessonPlan.learningObjectives
            : emptyLearningObjectives(),
          skills: lessonPlan.skills,
          method: lessonPlan.method ?? "",
          procedure: lessonPlan.procedure ?? "",
          materialsRequired: lessonPlan.materialsRequired,
          vocabularyFocus: lessonPlan.vocabularyFocus ?? "",
          stages: lessonPlan.stages.length
            ? lessonPlan.stages
            : emptyStages(),
          questionsToAsk: lessonPlan.questionsToAsk.join("\n"),
          differentiationSupport: lessonPlan.differentiationSupport ?? "",
          differentiationExtension: lessonPlan.differentiationExtension ?? "",
          differentiationHomework: lessonPlan.differentiationHomework ?? "",
          moduleDriveFileId: lessonPlan.moduleDriveFileId ?? "",
          moduleFileName: lessonPlan.moduleFileName ?? "",
        }
      : {
          classId: "",
          meetingNumber: 1,
          week: 1,
          scheduledDate: "",
          learningObjectives: emptyLearningObjectives(),
          skills: [],
          materialsRequired: [],
          stages: emptyStages(),
        },
  });

  // Bound to the actual "stages" field array so each row's label/content
  // reflects what's really loaded, instead of always rendering the fixed
  // STAGE_NAMES constant — a mismatch there would silently reattribute a
  // legacy plan's stage content to the wrong stage name on save.
  const { fields: stageFields } = useFieldArray({ control, name: "stages" });

  const watchedClassId = watch("classId");
  const learningObjectives = watch("learningObjectives") ?? [];
  const selectedClassModule = myClasses?.find((c) => c.id === watchedClassId)?.module ?? null;
  const selectedClassTeacherId = allClasses?.find((c) => c.id === watchedClassId)?.teacherId;
  const createLessonPlan = useCreateLessonPlan(adminMode ? selectedClassTeacherId : undefined);
  // Albright-curriculum classes use a lighter-weight lesson plan — just
  // schedule + Unit & Topic — since the detailed pedagogical breakdown
  // (stages, materials, differentiation) isn't part of that curriculum's
  // format. The Activities/Resources/Language Focus specific to Albright
  // are captured post-class in the Teaching Report instead.
  const isAlbright = adminMode
    ? allClasses?.find((c) => c.id === watchedClassId)?.curriculumReportFormat === "ALBRIGHT"
    : myClasses?.find((c) => c.id === watchedClassId)?.curriculumReportFormat === "ALBRIGHT";

  useEffect(() => {
    if (isEdit || !watchedClassId || !existingPlans) return;
    const classPlans = existingPlans.filter(
      (p) => p.classId === watchedClassId,
    );
    const nextMeetingNumber =
      classPlans.length > 0
        ? Math.max(...classPlans.map((p) => p.meetingNumber)) + 1
        : 1;
    setValue("meetingNumber", nextMeetingNumber);
    setValue("week", Math.ceil(nextMeetingNumber / 2));
  }, [watchedClassId, existingPlans, isEdit, setValue]);

  function addObjective() {
    setValue("learningObjectives", [...learningObjectives, ""]);
  }

  function removeObjective(index: number) {
    setValue(
      "learningObjectives",
      learningObjectives.filter((_, i) => i !== index),
    );
  }

  async function onSubmit(values: LessonPlanInput) {
    const payload = { ...values, moduleDriveFileId, moduleFileName };
    if (isEdit && lessonPlan) {
      await updateLessonPlan.mutateAsync({ id: lessonPlan.id, input: payload });
    } else {
      await createLessonPlan.mutateAsync(payload);
    }
    router.push("/lesson-plan");
  }

  const isSubmitting = createLessonPlan.isPending || updateLessonPlan.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-6">
      {readOnly && (
        <div className="bg-chart-4/10 text-foreground flex items-start gap-2.5 rounded-lg border border-chart-4/20 px-4 py-3 text-sm">
          <span className="bg-chart-4/20 text-chart-4 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            !
          </span>
          <span>{t("readOnlyNotice")}</span>
        </div>
      )}

      <fieldset disabled={readOnly} className="space-y-5 border-0 p-0">
        <Section
          title={t("sections.basicInfo.title")}
          description={t("sections.basicInfo.description")}
          icon={ClipboardList}
          accent="blue"
        >
        <div className="space-y-2">
          <Label>{t("fields.class")}</Label>
          {isEdit ? (
            // Editing/viewing an existing plan: classId is immutable, and
            // the viewer (another teacher, or an admin with no "my classes"
            // at all) may not have this class in their own list — render
            // the plan's own className instead of relying on a Select whose
            // items may not include this class, which used to fall back to
            // showing the raw classId UUID in the trigger.
            <p className="border-input bg-muted/40 rounded-lg border px-2.5 py-2 text-sm">
              {lessonPlan?.className ?? "-"}
            </p>
          ) : (
            <Controller
              control={control}
              name="classId"
              render={({ field }) => (
                <Select
                  items={classes?.map((c) => ({
                    value: c.id,
                    label: `${c.name} — ${c.schoolName} · ${formatScheduleSlots(c.scheduleSlots, dayLabels)}`,
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fields.classPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.schoolName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
          {errors.classId && (
            <p className="text-destructive text-sm">{errors.classId.message}</p>
          )}
        </div>

        {watchedClassId && !adminMode && <ModuleCoverBanner module={selectedClassModule} />}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="meetingNumber">{t("fields.meetingNumber")}</Label>
            <Input
              id="meetingNumber"
              type="number"
              min={1}
              {...register("meetingNumber")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="week">{t("fields.week")}</Label>
            <Input id="week" type="number" min={1} {...register("week")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledDate">{t("fields.date")}</Label>
          <Input
            id="scheduledDate"
            type="date"
            {...register("scheduledDate")}
          />
          {errors.scheduledDate && (
            <p className="text-destructive text-sm">
              {errors.scheduledDate.message}
            </p>
          )}
        </div>

        {!isAlbright && (
        <div className="space-y-2">
          <Label>{t("fields.level")}</Label>
          <Controller
            control={control}
            name="level"
            render={({ field }) => (
              <Select
                items={LEVEL_OPTIONS.map((l) => ({ value: l, label: l }))}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("fields.levelPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="topic">{isAlbright ? t("fields.unitAndTopic") : t("fields.topic")}</Label>
          <Input
            id="topic"
            placeholder={isAlbright ? t("fields.unitAndTopicPlaceholder") : undefined}
            {...register("topic")}
          />
          {errors.topic && (
            <p className="text-destructive text-sm">{errors.topic.message}</p>
          )}
          {isAlbright && (
            <p className="text-muted-foreground text-xs">{t("albrightNotice")}</p>
          )}
        </div>
      </Section>

      {!isAlbright && (
        <Section
          title={t("sections.objectives.title")}
          description={t("sections.objectives.description")}
          icon={Target}
          accent="green"
        >
          <div className="space-y-2">
            <Label>{t("fields.learningObjectives")}</Label>
            <div className="space-y-2">
              {learningObjectives.map((_, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground w-5 shrink-0 pt-2 text-sm">
                    {index + 1}.
                  </span>
                  <Textarea
                    rows={1}
                    placeholder={t("fields.learningObjectivePlaceholder")}
                    className="min-h-9 resize-none py-1.5"
                    {...register(`learningObjectives.${index}` as const)}
                  />
                  {learningObjectives.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mt-0.5 shrink-0"
                      onClick={() => removeObjective(index)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addObjective}>
              <Plus className="size-3.5" />
              {t("fields.addObjective")}
            </Button>
          </div>
          <div className="space-y-2">
            <Label>{t("fields.skill")}</Label>
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
        </Section>
      )}

      {!isAlbright && (
        <Section
          title={t("sections.materials.title")}
          description={t("sections.materials.description")}
          icon={Wrench}
          accent="gold"
        >
          <div className="space-y-2">
            <Label>{t("fields.materialsRequired")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {MATERIAL_OPTIONS.map((material) => (
                <label
                  key={material}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    value={material}
                    className="accent-primary size-4"
                    {...register("materialsRequired")}
                  />
                  {material}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vocabularyFocus">{t("fields.vocabularyFocus")}</Label>
            <Textarea
              id="vocabularyFocus"
              rows={2}
              {...register("vocabularyFocus")}
            />
          </div>
        </Section>
      )}

      {!isAlbright && (
        <Section
          title={t("sections.stages.title")}
          description={t("sections.stages.description")}
          icon={ListOrdered}
          accent="orange"
        >
          <div className="space-y-3">
            {stageFields.map((field, index) => (
              <div
                key={field.id}
                className="bg-muted/30 space-y-2 rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-chart-2/15 text-chart-2 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                    {index + 1}
                  </span>
                  <p className="text-sm font-medium">
                    {field.stage || STAGE_NAMES[index] || t("fields.stageFallback", { number: index + 1 })}
                  </p>
                </div>
                <input
                  type="hidden"
                  defaultValue={field.stage || STAGE_NAMES[index] || ""}
                  {...register(`stages.${index}.stage` as const)}
                />
                <Textarea
                  rows={2}
                  placeholder={t("fields.stageActivityPlaceholder")}
                  className="bg-card"
                  {...register(`stages.${index}.activity` as const)}
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    placeholder={t("fields.stageMediaPlaceholder")}
                    className="bg-card"
                    {...register(`stages.${index}.media` as const)}
                  />
                  <Input
                    placeholder={t("fields.stageAssessmentPlaceholder")}
                    className="bg-card"
                    {...register(`stages.${index}.assessment` as const)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {!isAlbright && (
        <Section
          title={t("sections.differentiation.title")}
          description={t("sections.differentiation.description")}
          icon={MessageCircleQuestion}
          accent="pink"
        >
          <div className="space-y-2">
            <Label htmlFor="differentiationSupport">{t("fields.differentiationSupport")}</Label>
            <Textarea
              id="differentiationSupport"
              rows={2}
              {...register("differentiationSupport")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="differentiationExtension">{t("fields.differentiationExtension")}</Label>
            <Textarea
              id="differentiationExtension"
              rows={2}
              {...register("differentiationExtension")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="differentiationHomework">{t("fields.differentiationHomework")}</Label>
            <Textarea
              id="differentiationHomework"
              rows={2}
              {...register("differentiationHomework")}
            />
          </div>
        </Section>
      )}

        <Section
          title={t("sections.module.title")}
          description={t("sections.module.description")}
          icon={FileText}
          accent="blue"
        >
          <div className="space-y-2">
            <Label>{t("fields.module")}</Label>
            {readOnly ? (
              moduleFileName ? (
                <a
                  href={`https://drive.google.com/file/d/${moduleDriveFileId}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary flex items-center gap-2 text-sm underline underline-offset-2"
                >
                  <FileText className="size-4 shrink-0" />
                  {moduleFileName}
                </a>
              ) : (
                <p className="text-muted-foreground text-sm">{t("fields.noModuleUploaded")}</p>
              )
            ) : (
              <FileUpload
                label={t("fields.uploadModule")}
                accept="application/pdf"
                currentFile={moduleFileName || null}
                onUploaded={(id, name) => {
                  setModuleDriveFileId(id);
                  setModuleFileName(name);
                }}
              />
            )}
          </div>
        </Section>
      </fieldset>

      {!readOnly && (
        <div className="bg-background/95 sticky bottom-16 -mx-4 border-t px-4 pt-3 pb-1 backdrop-blur-sm md:bottom-0 md:-mx-8 md:px-8">
          <Button
            type="submit"
            size="lg"
            className="w-full shadow-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </div>
      )}
    </form>
  );
}
