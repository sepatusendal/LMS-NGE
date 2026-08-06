"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useMyClasses } from "@/features/classes/use-my-classes";
import {
  LEVEL_OPTIONS,
  MATERIAL_OPTIONS,
  PROCEDURE_OPTIONS,
  SKILL_OPTIONS,
  emptyStages,
  lessonPlanSchema,
  type LessonPlan,
  type LessonPlanInput,
} from "./schema";
import {
  useCreateLessonPlan,
  useLessonPlans,
  useUpdateLessonPlan,
} from "./use-lesson-plans";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function LessonPlanForm({
  lessonPlan,
  readOnly = false,
}: {
  lessonPlan?: LessonPlan;
  readOnly?: boolean;
}) {
  const isEdit = Boolean(lessonPlan);
  const router = useRouter();
  const { data: classes } = useMyClasses();
  const { data: existingPlans } = useLessonPlans();
  const createLessonPlan = useCreateLessonPlan();
  const updateLessonPlan = useUpdateLessonPlan();

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
          learningObjectives: lessonPlan.learningObjectives ?? "",
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
        }
      : {
          classId: "",
          meetingNumber: 1,
          week: 1,
          scheduledDate: "",
          skills: [],
          materialsRequired: [],
          stages: emptyStages(),
        },
  });

  const watchedClassId = watch("classId");

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

  async function onSubmit(values: LessonPlanInput) {
    if (isEdit && lessonPlan) {
      await updateLessonPlan.mutateAsync({ id: lessonPlan.id, input: values });
    } else {
      await createLessonPlan.mutateAsync(values);
    }
    router.push("/lesson-plan");
  }

  const isSubmitting = createLessonPlan.isPending || updateLessonPlan.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-6">
      {readOnly && (
        <div className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm">
          Kamu hanya bisa melihat lesson plan ini. Hanya teacher yang
          ditugaskan di kelas ini yang dapat mengedit.
        </div>
      )}

      <fieldset disabled={readOnly} className="space-y-4 border-0 p-0">
        <Section title="Info Dasar">
        <div className="space-y-2">
          <Label>Kelas</Label>
          <Controller
            control={control}
            name="classId"
            render={({ field }) => (
              <Select
                items={classes?.map((c) => ({
                  value: c.id,
                  label: `${c.name} — ${c.schoolName} · ${c.scheduleStartTime}-${c.scheduleEndTime}`,
                }))}
                value={field.value}
                onValueChange={field.onChange}
                disabled={isEdit}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kelas" />
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
          {errors.classId && (
            <p className="text-destructive text-sm">{errors.classId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="meetingNumber">Meeting No.</Label>
            <Input
              id="meetingNumber"
              type="number"
              min={1}
              {...register("meetingNumber")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="week">Minggu Ke-</Label>
            <Input id="week" type="number" min={1} {...register("week")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledDate">Tanggal</Label>
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

        <div className="space-y-2">
          <Label>Level</Label>
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
                  <SelectValue placeholder="Pilih level" />
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

        <div className="space-y-2">
          <Label htmlFor="topic">Topic</Label>
          <Input id="topic" {...register("topic")} />
          {errors.topic && (
            <p className="text-destructive text-sm">{errors.topic.message}</p>
          )}
        </div>
      </Section>

      <Section title="Learning Objectives & Skills">
        <div className="space-y-2">
          <Label htmlFor="learningObjectives">Learning Objectives</Label>
          <Textarea
            id="learningObjectives"
            rows={3}
            placeholder="By the end of this lesson, students will be able to..."
            {...register("learningObjectives")}
          />
        </div>
        <div className="space-y-2">
          <Label>Skill</Label>
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

      <Section title="Method, Procedure & Materials">
        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <Input
            id="method"
            placeholder="mis. Direct Method, TPR"
            {...register("method")}
          />
        </div>
        <div className="space-y-2">
          <Label>Procedure</Label>
          <Controller
            control={control}
            name="procedure"
            render={({ field }) => (
              <Select
                items={PROCEDURE_OPTIONS.map((p) => ({ value: p, label: p }))}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih procedure" />
                </SelectTrigger>
                <SelectContent>
                  {PROCEDURE_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label>Materials Required</Label>
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
          <Label htmlFor="vocabularyFocus">Vocabulary / Language Focus</Label>
          <Textarea
            id="vocabularyFocus"
            rows={2}
            {...register("vocabularyFocus")}
          />
        </div>
      </Section>

      <Section title="Stage-by-Stage">
        <div className="space-y-4">
          {emptyStages().map((stage, index) => (
            <div key={stage.stage} className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
              <p className="text-sm font-medium">{stage.stage}</p>
              <input
                type="hidden"
                value={stage.stage}
                {...register(`stages.${index}.stage` as const)}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Tutor Activity"
                  {...register(`stages.${index}.tutorActivity` as const)}
                />
                <Input
                  placeholder="Student Activity"
                  {...register(`stages.${index}.studentActivity` as const)}
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Media (opsional)"
                  {...register(`stages.${index}.media` as const)}
                />
                <Input
                  placeholder="Assessment (opsional)"
                  {...register(`stages.${index}.assessment` as const)}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Questions & Differentiation">
        <div className="space-y-2">
          <Label htmlFor="questionsToAsk">
            Questions to Ask Students (1 baris = 1 pertanyaan)
          </Label>
          <Textarea id="questionsToAsk" rows={4} {...register("questionsToAsk")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="differentiationSupport">
            Students Needing Extra Support
          </Label>
          <Textarea
            id="differentiationSupport"
            rows={2}
            {...register("differentiationSupport")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="differentiationExtension">
            Extension Activities for Fast Learners
          </Label>
          <Textarea
            id="differentiationExtension"
            rows={2}
            {...register("differentiationExtension")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="differentiationHomework">
            Homework (opsional)
          </Label>
          <Textarea
            id="differentiationHomework"
            rows={2}
            {...register("differentiationHomework")}
          />
        </div>
        </Section>
      </fieldset>

      {!readOnly && (
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan Lesson Plan"}
        </Button>
      )}
    </form>
  );
}
