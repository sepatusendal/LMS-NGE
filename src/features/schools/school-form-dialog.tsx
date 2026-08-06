"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { schoolSchema, type School, type SchoolInput } from "./schema";
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
  const isEdit = Boolean(school);
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();

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
          <DialogTitle>{isEdit ? "Edit Sekolah" : "Tambah Sekolah"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Sekolah</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input id="address" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="picName">Nama PIC Sekolah</Label>
            <Input id="picName" {...register("picName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="picPhone">No. HP PIC</Label>
            <Input id="picPhone" {...register("picPhone")} />
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
