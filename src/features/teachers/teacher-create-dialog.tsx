"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField, generateRandomPassword } from "@/components/shared/password-field";
import { teacherCreateSchema, type TeacherCreateInput } from "./schema";
import { useCreateTeacher } from "./use-teachers";

export function TeacherCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createTeacher = useCreateTeacher();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeacherCreateInput>({ resolver: zodResolver(teacherCreateSchema) });

  useEffect(() => {
    if (open)
      reset({
        fullName: "",
        email: "",
        tutorId: "",
        feePerMeeting: "",
        phone: "",
        password: generateRandomPassword(),
      });
  }, [open, reset]);

  async function onSubmit(values: TeacherCreateInput) {
    await createTeacher.mutateAsync(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Teacher</DialogTitle>
          <DialogDescription>
            Tentukan password akunnya sendiri, atau klik ikon dadu untuk generate
            acak.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nama</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-destructive text-sm">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tutorId">Tutor ID (opsional)</Label>
            <Input id="tutorId" {...register("tutorId")} />
            {errors.tutorId && (
              <p className="text-destructive text-sm">{errors.tutorId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="feePerMeeting">Fee per Meeting (Rp, opsional)</Label>
            <Input
              id="feePerMeeting"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="Contoh: 100000"
              {...register("feePerMeeting")}
            />
            {errors.feePerMeeting && (
              <p className="text-destructive text-sm">{errors.feePerMeeting.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">No. HP (opsional)</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <PasswordField id="password" value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.password && (
              <p className="text-destructive text-sm">{errors.password.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createTeacher.isPending}>
              {createTeacher.isPending ? "Membuat akun..." : "Buat Akun Teacher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
