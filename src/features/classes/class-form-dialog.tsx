"use client";

import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchools } from "@/features/schools/use-schools";
import { useTeachers } from "@/features/teachers/use-teachers";
import { useCurriculums } from "@/features/curriculum/use-curriculum";
import { DAY_OPTIONS, classSchema, type Class, type ClassInput, type ClassType } from "./schema";
import { useCreateClass, useUpdateClass } from "./use-classes";

export function ClassFormDialog({
  open,
  onOpenChange,
  classItem,
  classType = "REGULAR",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem?: Class;
  classType?: ClassType;
}) {
  const isEdit = Boolean(classItem);
  const { data: schools } = useSchools();
  const { data: teachers } = useTeachers();
  const { data: curriculums } = useCurriculums();
  const createClass = useCreateClass(classType);
  const updateClass = useUpdateClass(classType);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassInput>({ resolver: zodResolver(classSchema) });

  const selectedDays = useWatch({ control, name: "scheduleDaysOfWeek" }) ?? [];
  const scheduleTimesValue = useWatch({ control, name: "scheduleTimes" }) ?? {};

  useEffect(() => {
    if (open) {
      const scheduleTimes: ClassInput["scheduleTimes"] = {};
      classItem?.scheduleSlots.forEach((s) => {
        scheduleTimes[String(s.dayOfWeek)] = { startTime: s.startTime, endTime: s.endTime };
      });
      reset({
        name: classItem?.name ?? "",
        schoolId: classItem?.schoolId ?? "",
        teacherId: classItem?.teacherId ?? "",
        curriculumId: classItem?.curriculumId ?? "",
        room: classItem?.room ?? "",
        scheduleDaysOfWeek: classItem
          ? classItem.scheduleDaysOfWeek.map(String)
          : [],
        scheduleTimes,
      });
    }
  }, [open, classItem, reset]);

  async function onSubmit(values: ClassInput) {
    if (isEdit && classItem) {
      await updateClass.mutateAsync({ id: classItem.id, input: values });
    } else {
      await createClass.mutateAsync(values);
    }
    onOpenChange(false);
  }

  function onInvalid() {
    toast.error("Ada field yang belum lengkap", {
      description: "Cek bagian yang ditandai merah di form.",
    });
  }

  const isSubmitting = createClass.isPending || updateClass.isPending;

  // Keep DAY_OPTIONS order for the per-day time rows, not selection order.
  const orderedSelectedDays = DAY_OPTIONS.filter((d) => selectedDays.includes(d.value));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Kelas</Label>
            <Input
              id="name"
              placeholder="mis. Grade 5A"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Sekolah</Label>
            <Controller
              control={control}
              name="schoolId"
              render={({ field }) => (
                <Select
                  items={schools?.map((s) => ({ value: s.id, label: s.name }))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.schoolId}>
                    <SelectValue placeholder="Pilih sekolah" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.schoolId && (
              <p className="text-destructive text-sm">
                {errors.schoolId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Teacher</Label>
            <Controller
              control={control}
              name="teacherId"
              render={({ field }) => (
                <Select
                  items={teachers?.map((t) => ({ value: t.id, label: t.fullName }))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.teacherId}>
                    <SelectValue placeholder="Pilih teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.teacherId && (
              <p className="text-destructive text-sm">
                {errors.teacherId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Kurikulum (opsional)</Label>
            <Controller
              control={control}
              name="curriculumId"
              render={({ field }) => (
                <Select
                  items={curriculums?.map((c) => ({ value: c.id, label: c.name }))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih kurikulum" />
                  </SelectTrigger>
                  <SelectContent>
                    {curriculums?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Ruang (opsional)</Label>
            <Input id="room" placeholder="mis. 2 A" {...register("room")} />
          </div>

          <div className="space-y-2">
            <Label>Hari (kelas bisa ketemu lebih dari 1x/minggu)</Label>
            <div className="grid grid-cols-4 gap-2">
              {DAY_OPTIONS.map((d) => (
                <label
                  key={d.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    value={d.value}
                    className="accent-primary size-4"
                    {...register("scheduleDaysOfWeek")}
                  />
                  {d.label}
                </label>
              ))}
            </div>
            {errors.scheduleDaysOfWeek && (
              <p className="text-destructive text-sm">
                {errors.scheduleDaysOfWeek.message}
              </p>
            )}
          </div>

          {orderedSelectedDays.length > 0 && (
            <div className="space-y-2">
              <Label>Jam per hari</Label>
              <div className="space-y-2">
                {orderedSelectedDays.map((d) => (
                  <div key={d.value} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-14 shrink-0 text-sm">
                      {d.label}
                    </span>
                    <Input
                      type="time"
                      aria-invalid={
                        !!errors.scheduleTimes?.[d.value]?.startTime ||
                        (!!errors.scheduleTimes && !scheduleTimesValue[d.value]?.startTime)
                      }
                      {...register(`scheduleTimes.${d.value}.startTime`)}
                    />
                    <span className="text-muted-foreground text-sm">–</span>
                    <Input
                      type="time"
                      aria-invalid={
                        !!errors.scheduleTimes?.[d.value]?.endTime ||
                        (!!errors.scheduleTimes && !scheduleTimesValue[d.value]?.endTime)
                      }
                      {...register(`scheduleTimes.${d.value}.endTime`)}
                    />
                  </div>
                ))}
              </div>
              {errors.scheduleTimes && (
                <p className="text-destructive text-sm">
                  {errors.scheduleTimes.message as string}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
