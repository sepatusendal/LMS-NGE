"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { useClasses } from "@/features/classes/use-classes";
import { GRADE_BAND_OPTIONS, type GradeBand } from "@/features/classes/schema";
import { useSchools } from "@/features/schools/use-schools";
import { buildTemporaryScheduleSchema, type TemporaryScheduleInput } from "./schema";
import { useCreateTemporarySchedule } from "./use-temporary-schedules";

export function TemporaryScheduleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("admin.temporarySchedules");
  const tCommon = useTranslations("common");
  const { data: classes } = useClasses("REGULAR", open);
  const { data: schools } = useSchools();
  const createSchedule = useCreateTemporarySchedule();

  const schema = useMemo(() => buildTemporaryScheduleSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemporaryScheduleInput>({
    resolver: zodResolver(schema),
    defaultValues: { classIds: [], label: "", dateFrom: "", dateTo: "", startTime: "", endTime: "" },
  });

  const [schoolFilter, setSchoolFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const classIds = watch("classIds");

  const visibleClasses = useMemo(() => {
    return (classes ?? []).filter((c) => {
      if (schoolFilter && c.schoolId !== schoolFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [classes, schoolFilter, search]);

  function toggleClass(id: string) {
    const next = classIds.includes(id) ? classIds.filter((c) => c !== id) : [...classIds, id];
    setValue("classIds", next, { shouldValidate: true });
  }

  function selectGradeBand(band: GradeBand) {
    const matching = (classes ?? []).filter((c) => c.gradeBand === band).map((c) => c.id);
    if (matching.length === 0) {
      toast.error(t("noClassesForBand"));
      return;
    }
    const merged = [...new Set([...classIds, ...matching])];
    setValue("classIds", merged, { shouldValidate: true });
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset({ classIds: [], label: "", dateFrom: "", dateTo: "", startTime: "", endTime: "" });
      setSchoolFilter("");
      setSearch("");
    }
    onOpenChange(next);
  }

  async function onSubmit(values: TemporaryScheduleInput) {
    await createSchedule.mutateAsync(values);
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">{t("labelOptional")}</Label>
            <Input id="label" placeholder={t("labelPlaceholder")} {...register("label")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">{t("dateFrom")}</Label>
              <Input id="dateFrom" type="date" {...register("dateFrom")} />
              {errors.dateFrom && <p className="text-destructive text-sm">{errors.dateFrom.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">{t("dateTo")}</Label>
              <Input id="dateTo" type="date" {...register("dateTo")} />
              {errors.dateTo && <p className="text-destructive text-sm">{errors.dateTo.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startTime">{t("newStartTime")}</Label>
              <Input id="startTime" type="time" {...register("startTime")} />
              {errors.startTime && <p className="text-destructive text-sm">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">{t("newEndTime")}</Label>
              <Input id="endTime" type="time" {...register("endTime")} />
              {errors.endTime && <p className="text-destructive text-sm">{errors.endTime.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("quickPickByBand")}</Label>
            <div className="flex flex-wrap gap-2">
              {GRADE_BAND_OPTIONS.map((band) => (
                <Button
                  key={band.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => selectGradeBand(band.value)}
                >
                  {band.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                {t("selectClasses")} ({classIds.length})
              </Label>
              {classIds.length > 0 && (
                <button
                  type="button"
                  className="text-muted-foreground text-xs hover:underline"
                  onClick={() => setValue("classIds", [], { shouldValidate: true })}
                >
                  {t("clearSelection")}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                className="border-input h-8 flex-1 rounded-lg border bg-background px-2 text-sm"
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
              >
                <option value="">{t("allSchools")}</option>
                {schools?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Input
                className="flex-1"
                placeholder={t("searchClassPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
              {visibleClasses.length === 0 && (
                <p className="text-muted-foreground py-2 text-center text-sm">{tCommon("empty")}</p>
              )}
              {visibleClasses.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    className="accent-primary size-4"
                    checked={classIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                  />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-muted-foreground text-xs">{c.schoolName}</span>
                </label>
              ))}
            </div>
            {errors.classIds && <p className="text-destructive text-sm">{errors.classIds.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createSchedule.isPending}>
              {createSchedule.isPending ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
