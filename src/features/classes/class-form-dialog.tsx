"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { DAY_OPTIONS, classSchema, type Class, type ClassInput } from "./schema";
import { useCreateClass, useUpdateClass } from "./use-classes";

export function ClassFormDialog({
  open,
  onOpenChange,
  classItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classItem?: Class;
}) {
  const isEdit = Boolean(classItem);
  const { data: schools } = useSchools();
  const { data: teachers } = useTeachers();
  const { data: curriculums } = useCurriculums();
  const createClass = useCreateClass();
  const updateClass = useUpdateClass();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassInput>({ resolver: zodResolver(classSchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: classItem?.name ?? "",
        schoolId: classItem?.schoolId ?? "",
        teacherId: classItem?.teacherId ?? "",
        curriculumId: classItem?.curriculumId ?? "",
        room: classItem?.room ?? "",
        scheduleDaysOfWeek: classItem
          ? classItem.scheduleDaysOfWeek.map(String)
          : [],
        scheduleStartTime: classItem?.scheduleStartTime ?? "",
        scheduleEndTime: classItem?.scheduleEndTime ?? "",
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

  const isSubmitting = createClass.isPending || updateClass.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Kelas</Label>
            <Input id="name" placeholder="mis. Grade 5A" {...register("name")} />
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
                  <SelectTrigger className="w-full">
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
                  <SelectTrigger className="w-full">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleStartTime">Jam Mulai</Label>
              <Input
                id="scheduleStartTime"
                type="time"
                {...register("scheduleStartTime")}
              />
              {errors.scheduleStartTime && (
                <p className="text-destructive text-sm">
                  {errors.scheduleStartTime.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduleEndTime">Jam Selesai</Label>
              <Input
                id="scheduleEndTime"
                type="time"
                {...register("scheduleEndTime")}
              />
              {errors.scheduleEndTime && (
                <p className="text-destructive text-sm">
                  {errors.scheduleEndTime.message}
                </p>
              )}
            </div>
          </div>

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
