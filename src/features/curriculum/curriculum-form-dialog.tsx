"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  buildCurriculumSchema,
  buildReportFormatLabel,
  REPORT_FORMAT_OPTIONS,
  type Curriculum,
  type CurriculumInput,
} from "./schema";
import { useCreateCurriculum, useUpdateCurriculum } from "./use-curriculum";

export function CurriculumFormDialog({
  open,
  onOpenChange,
  curriculum,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  curriculum?: Curriculum;
}) {
  const t = useTranslations("admin.curriculum");
  const tCommon = useTranslations("common");
  const isEdit = Boolean(curriculum);
  const createCurriculum = useCreateCurriculum();
  const updateCurriculum = useUpdateCurriculum();

  const curriculumSchema = useMemo(() => buildCurriculumSchema(t), [t]);
  const REPORT_FORMAT_LABEL = useMemo(() => buildReportFormatLabel(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CurriculumInput>({ resolver: zodResolver(curriculumSchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: curriculum?.name ?? "",
        gradeLevel: curriculum?.gradeLevel ?? "",
        description: curriculum?.description ?? "",
        reportFormat: curriculum?.reportFormat ?? "STANDARD",
      });
    }
  }, [open, curriculum, reset]);

  async function onSubmit(values: CurriculumInput) {
    if (isEdit && curriculum) {
      await updateCurriculum.mutateAsync({ id: curriculum.id, input: values });
    } else {
      await createCurriculum.mutateAsync(values);
    }
    onOpenChange(false);
  }

  const isSubmitting = createCurriculum.isPending || updateCurriculum.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("editTitle") : t("addTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("nameHeader")}</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gradeLevel">Grade Level</Label>
            <Input
              id="gradeLevel"
              placeholder={t("gradeLevelPlaceholder")}
              {...register("gradeLevel")}
            />
            {errors.gradeLevel && (
              <p className="text-destructive text-sm">
                {errors.gradeLevel.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <div className="space-y-2">
            <Label>{t("reportFormatLabel")}</Label>
            <Controller
              control={control}
              name="reportFormat"
              render={({ field }) => (
                <Select
                  items={REPORT_FORMAT_OPTIONS.map((v) => ({ value: v, label: REPORT_FORMAT_LABEL[v] }))}
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_FORMAT_OPTIONS.map((v) => (
                      <SelectItem key={v} value={v}>
                        {REPORT_FORMAT_LABEL[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-muted-foreground text-xs">{t("reportFormatHint")}</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
