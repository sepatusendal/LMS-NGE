"use client";

import { useEffect, useMemo, useState } from "react";
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
import { buildDayOptions, GRADE_BAND_OPTIONS, type GradeBand } from "@/features/classes/schema";
import { useSchools } from "@/features/schools/use-schools";
import {
  ALL_DAYS_OF_WEEK,
  buildTemporaryScheduleSchema,
  type TemporaryScheduleBatch,
  type TemporaryScheduleInput,
} from "./schema";
import {
  useCreateTemporarySchedule,
  useTemporaryScheduleConflictsPreview,
  useUpdateTemporarySchedule,
} from "./use-temporary-schedules";

const EMPTY_VALUES: TemporaryScheduleInput = {
  classIds: [],
  label: "",
  dateFrom: "",
  dateTo: "",
  daysOfWeek: ALL_DAYS_OF_WEEK,
  startTime: "",
  endTime: "",
};

function batchToValues(batch: TemporaryScheduleBatch): TemporaryScheduleInput {
  return {
    classIds: batch.classIds,
    label: batch.label ?? "",
    dateFrom: batch.dateFrom,
    dateTo: batch.dateTo,
    daysOfWeek: batch.daysOfWeek.map(String),
    startTime: batch.startTime,
    endTime: batch.endTime,
  };
}

export function TemporaryScheduleDialog({
  open,
  onOpenChange,
  editingBatch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this batch in place instead of creating a new one. */
  editingBatch?: TemporaryScheduleBatch | null;
}) {
  const t = useTranslations("admin.temporarySchedules");
  const tCommon = useTranslations("common");
  const tDay = useTranslations("jadwal.day");
  const { data: classes } = useClasses("REGULAR", open);
  const { data: schools } = useSchools();
  const createSchedule = useCreateTemporarySchedule();
  const updateSchedule = useUpdateTemporarySchedule();
  const isEditing = Boolean(editingBatch);
  const dayOptions = useMemo(() => buildDayOptions(tDay), [tDay]);

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
    defaultValues: EMPTY_VALUES,
  });

  const [schoolFilter, setSchoolFilter] = useState<string>("");
  const [teacherFilter, setTeacherFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const classIds = watch("classIds");
  const daysOfWeek = watch("daysOfWeek");
  const dateFrom = watch("dateFrom");
  const dateTo = watch("dateTo");
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  useEffect(() => {
    if (!open) return;
    reset(editingBatch ? batchToValues(editingBatch) : EMPTY_VALUES);
    setSchoolFilter("");
    setTeacherFilter("");
    setSearch("");
    // Only re-run when the dialog opens or the target batch changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingBatch?.batchId]);

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    (classes ?? []).forEach((c) => map.set(c.teacherId, c.teacherName));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [classes]);

  const visibleClasses = useMemo(() => {
    return (classes ?? []).filter((c) => {
      if (schoolFilter && c.schoolId !== schoolFilter) return false;
      if (teacherFilter && c.teacherId !== teacherFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [classes, schoolFilter, teacherFilter, search]);

  // Debounce so the conflict check doesn't fire on every keystroke.
  const [debounced, setDebounced] = useState<TemporaryScheduleInput>(EMPTY_VALUES);
  useEffect(() => {
    const handle = setTimeout(
      () => setDebounced({ classIds, label: "", dateFrom, dateTo, daysOfWeek, startTime, endTime }),
      400,
    );
    return () => clearTimeout(handle);
  }, [classIds, dateFrom, dateTo, daysOfWeek, startTime, endTime]);

  const conflictsEnabled = Boolean(
    open &&
      debounced.classIds.length > 0 &&
      debounced.dateFrom &&
      debounced.dateTo &&
      debounced.daysOfWeek.length > 0 &&
      debounced.startTime &&
      debounced.endTime,
  );
  const { data: conflicts } = useTemporaryScheduleConflictsPreview(
    debounced,
    conflictsEnabled,
    editingBatch?.batchId,
  );
  const conflictByClassId = useMemo(() => new Map((conflicts ?? []).map((c) => [c.classId, c.message])), [conflicts]);
  const hasConflicts = conflictByClassId.size > 0;

  function toggleClass(id: string) {
    const next = classIds.includes(id) ? classIds.filter((c) => c !== id) : [...classIds, id];
    setValue("classIds", next, { shouldValidate: true });
  }

  function toggleDay(value: string) {
    const next = daysOfWeek.includes(value) ? daysOfWeek.filter((d) => d !== value) : [...daysOfWeek, value];
    setValue("daysOfWeek", next, { shouldValidate: true });
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
      reset(EMPTY_VALUES);
      setSchoolFilter("");
      setTeacherFilter("");
      setSearch("");
    }
    onOpenChange(next);
  }

  async function onSubmit(values: TemporaryScheduleInput) {
    if (editingBatch) {
      await updateSchedule.mutateAsync({ batchId: editingBatch.batchId, input: values });
    } else {
      await createSchedule.mutateAsync(values);
    }
    handleOpenChange(false);
  }

  const isSaving = createSchedule.isPending || updateSchedule.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("addTitle")}</DialogTitle>
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

          <div className="space-y-2">
            <Label>{t("daysOfWeek")}</Label>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  size="sm"
                  variant={daysOfWeek.includes(day.value) ? "default" : "outline"}
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">{t("daysOfWeekHint")}</p>
            {errors.daysOfWeek && <p className="text-destructive text-sm">{errors.daysOfWeek.message}</p>}
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
              <select
                className="border-input h-8 flex-1 rounded-lg border bg-background px-2 text-sm"
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
              >
                <option value="">{t("allTeachers")}</option>
                {teachers.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              placeholder={t("searchClassPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
              {visibleClasses.length === 0 && (
                <p className="text-muted-foreground py-2 text-center text-sm">{tCommon("empty")}</p>
              )}
              {visibleClasses.map((c) => {
                const conflictMessage = conflictByClassId.get(c.id);
                return (
                  <div key={c.id} className="rounded px-1 py-1 hover:bg-muted">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="accent-primary size-4"
                        checked={classIds.includes(c.id)}
                        onChange={() => toggleClass(c.id)}
                      />
                      <span className="flex-1">{c.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {c.schoolName} · {c.teacherName}
                      </span>
                    </label>
                    {classIds.includes(c.id) && conflictMessage && (
                      <p className="text-destructive pl-6 text-xs">{conflictMessage}</p>
                    )}
                  </div>
                );
              })}
            </div>
            {errors.classIds && <p className="text-destructive text-sm">{errors.classIds.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSaving || hasConflicts}>
              {isSaving ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
