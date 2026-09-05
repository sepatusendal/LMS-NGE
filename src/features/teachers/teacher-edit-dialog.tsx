"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
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
import { PasswordField, generateRandomPassword } from "@/components/shared/password-field";
import {
  buildTeacherEditSchema,
  buildTeacherResetPasswordSchema,
  type Teacher,
  type TeacherEditInput,
  type TeacherResetPasswordInput,
} from "./schema";
import { useUpdateTeacher, useResetTeacherPassword } from "./use-teachers";

export function TeacherEditDialog({
  open,
  onOpenChange,
  teacher,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher;
}) {
  const t = useTranslations("admin.teachers");
  const tCommon = useTranslations("common");
  const updateTeacher = useUpdateTeacher();
  const resetPassword = useResetTeacherPassword();

  const teacherEditSchema = useMemo(() => buildTeacherEditSchema(t), [t]);
  const teacherResetPasswordSchema = useMemo(() => buildTeacherResetPasswordSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeacherEditInput>({
    resolver: zodResolver(teacherEditSchema),
  });

  const {
    control: pwControl,
    handleSubmit: handlePwSubmit,
    reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm<TeacherResetPasswordInput>({
    resolver: zodResolver(teacherResetPasswordSchema),
  });

  useEffect(() => {
    if (open) {
      reset({
        fullName: teacher?.fullName ?? "",
        tutorId: teacher?.tutorId ?? "",
        feePerMeeting: teacher?.feePerMeeting != null ? String(teacher.feePerMeeting) : "",
        phone: teacher?.phone ?? "",
      });
      resetPw({ password: generateRandomPassword() });
    }
  }, [open, teacher, reset, resetPw]);

  async function onSubmit(values: TeacherEditInput) {
    if (!teacher) return;
    await updateTeacher.mutateAsync({ id: teacher.id, userId: teacher.userId, input: values });
    onOpenChange(false);
  }

  async function onResetPassword(values: TeacherResetPasswordInput) {
    if (!teacher) return;
    await resetPassword.mutateAsync({ userId: teacher.userId, password: values.password });
    resetPw({ password: generateRandomPassword() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <div className="text-muted-foreground -mt-2 text-sm">{teacher?.email}</div>

        <div className="space-y-2 rounded-lg border p-3">
          <Label htmlFor="reset-password" className="text-muted-foreground text-xs">
            {t("changePassword")}
          </Label>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Controller
                control={pwControl}
                name="password"
                render={({ field }) => (
                  <PasswordField id="reset-password" value={field.value} onChange={field.onChange} />
                )}
              />
              {pwErrors.password && (
                <p className="text-destructive mt-1 text-sm">{pwErrors.password.message}</p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={resetPassword.isPending}
              onClick={handlePwSubmit(onResetPassword)}
            >
              <KeyRound className="size-3.5" />
              {resetPassword.isPending ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{tCommon("name")}</Label>
            <Input id="fullName" aria-invalid={!!errors.fullName} {...register("fullName")} />
            {errors.fullName && (
              <p className="text-destructive text-sm">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tutorId">Tutor ID</Label>
            <Input id="tutorId" aria-invalid={!!errors.tutorId} {...register("tutorId")} />
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
            <Label htmlFor="phone">{t("phoneHeader")}</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateTeacher.isPending}>
              {updateTeacher.isPending ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
