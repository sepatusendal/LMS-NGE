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
import { ALL_SCHOOLS_VALUE, holidaySchema, type HolidayInput } from "./schema";
import { useCreateHoliday } from "./use-holidays";

export function HolidayFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: schools } = useSchools();
  const createHoliday = useCreateHoliday();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HolidayInput>({ resolver: zodResolver(holidaySchema) });

  useEffect(() => {
    if (open) {
      reset({ date: "", name: "", schoolId: null });
    }
  }, [open, reset]);

  async function onSubmit(values: HolidayInput) {
    await createHoliday.mutateAsync(values);
    onOpenChange(false);
  }

  const schoolOptions = [
    { value: ALL_SCHOOLS_VALUE, label: "Semua Sekolah" },
    ...(schools?.map((s) => ({ value: s.id, label: s.name })) ?? []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Hari Libur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Tanggal</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-destructive text-sm">{errors.date.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nama Hari Libur</Label>
            <Input
              id="name"
              placeholder="mis. Libur Hari Raya"
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
                  items={schoolOptions}
                  value={field.value ?? ALL_SCHOOLS_VALUE}
                  onValueChange={(v) =>
                    field.onChange(!v || v === ALL_SCHOOLS_VALUE ? null : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih sekolah" />
                  </SelectTrigger>
                  <SelectContent>
                    {schoolOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createHoliday.isPending}>
              {createHoliday.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
