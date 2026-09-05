"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
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
import { buildSchoolSchema, type School, type SchoolInput } from "./schema";
import { useCreateSchool, useUpdateSchool } from "./use-schools";

export function SchoolFormDialog({
  open,
  onOpenChange,
  school,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school?: School;
}) {
  const t = useTranslations("admin.schools");
  const tCommon = useTranslations("common");
  const isEdit = Boolean(school);
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();

  const schoolSchema = useMemo(() => buildSchoolSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolInput>({ resolver: zodResolver(schoolSchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: school?.name ?? "",
        address: school?.address ?? "",
        picName: school?.picName ?? "",
        picPhone: school?.picPhone ?? "",
      });
    }
  }, [open, school, reset]);

  async function onSubmit(values: SchoolInput) {
    if (isEdit && school) {
      await updateSchool.mutateAsync({ id: school.id, input: values });
    } else {
      await createSchool.mutateAsync(values);
    }
    onOpenChange(false);
  }

  const isSubmitting = createSchool.isPending || updateSchool.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editTitle") : t("addTitle")}</DialogTitle>
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
            <Label htmlFor="address">{t("address")}</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="picName">{t("picName")}</Label>
            <Input id="picName" {...register("picName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="picPhone">{t("picPhone")}</Label>
            <Input id="picPhone" {...register("picPhone")} />
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
