"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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
import { buildTeacherCreateSchema, type TeacherCreateInput } from "./schema";
import { useCreateTeacher } from "./use-teachers";

export function TeacherCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("admin.teachers");
  const tCommon = useTranslations("common");
  const createTeacher = useCreateTeacher();

  const teacherCreateSchema = useMemo(() => buildTeacherCreateSchema(t), [t]);

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
          <DialogTitle>{t("addTitle")}</DialogTitle>
          <DialogDescription>{t("passwordHint")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{tCommon("name")}</Label>
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
            <Label htmlFor="tutorId">{t("tutorIdOptional")}</Label>
            <Input id="tutorId" {...register("tutorId")} />
            {errors.tutorId && (
              <p className="text-destructive text-sm">{errors.tutorId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="feePerMeeting">{t("feePerMeetingOptional")}</Label>
            <Input
              id="feePerMeeting"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder={t("feePerMeetingPlaceholder")}
              {...register("feePerMeeting")}
            />
            {errors.feePerMeeting && (
              <p className="text-destructive text-sm">{errors.feePerMeeting.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("phoneOptional")}</Label>
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
              {createTeacher.isPending ? t("creatingAccount") : t("createAccount")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
