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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchools } from "@/features/schools/use-schools";
import { ALL_SCHOOLS_VALUE, buildHolidaySchema, type HolidayInput } from "./schema";
import { useCreateHoliday } from "./use-holidays";

export function HolidayFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("admin.holidays");
  const tCommon = useTranslations("common");
  const { data: schools } = useSchools();
  const createHoliday = useCreateHoliday();

  const holidaySchema = useMemo(() => buildHolidaySchema(t), [t]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HolidayInput>({ resolver: zodResolver(holidaySchema) });

  useEffect(() => {
    if (open) {
      reset({ dateFrom: "", dateTo: "", name: "", schoolId: null });
    }
  }, [open, reset]);

  async function onSubmit(values: HolidayInput) {
    await createHoliday.mutateAsync(values);
    onOpenChange(false);
  }

  const schoolOptions = [
    { value: ALL_SCHOOLS_VALUE, label: t("allSchools") },
    ...(schools?.map((s) => ({ value: s.id, label: s.name })) ?? []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addTitle")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">{t("dateFrom")}</Label>
              <Input id="dateFrom" type="date" {...register("dateFrom")} />
              {errors.dateFrom && (
                <p className="text-destructive text-sm">{errors.dateFrom.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">{t("dateTo")}</Label>
              <Input id="dateTo" type="date" {...register("dateTo")} />
              {errors.dateTo && (
                <p className="text-destructive text-sm">{errors.dateTo.message}</p>
              )}
            </div>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">{t("sameDateHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              placeholder={t("namePlaceholder")}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{tCommon("school")}</Label>
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
                    <SelectValue placeholder={t("selectSchool")} />
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
              {createHoliday.isPending ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
