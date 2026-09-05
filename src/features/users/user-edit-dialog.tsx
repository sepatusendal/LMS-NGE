"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField, generateRandomPassword } from "@/components/shared/password-field";
import {
  ROLE_LABEL,
  buildUserEditSchema,
  buildUserResetPasswordSchema,
  type AppUser,
  type UserEditInput,
  type UserResetPasswordInput,
} from "./schema";
import { useResetAppUserPassword, useUpdateAppUser } from "./use-users";

export function UserEditDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AppUser;
}) {
  const t = useTranslations("admin.users");
  const tCommon = useTranslations("common");
  const resetPassword = useResetAppUserPassword();
  const updateUser = useUpdateAppUser();

  const userResetPasswordSchema = useMemo(() => buildUserResetPasswordSchema(t), [t]);
  const userEditSchema = useMemo(() => buildUserEditSchema(t), [t]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserResetPasswordInput>({
    resolver: zodResolver(userResetPasswordSchema),
  });

  const {
    register: registerName,
    handleSubmit: handleNameSubmit,
    reset: resetName,
    formState: { errors: nameErrors },
  } = useForm<UserEditInput>({
    resolver: zodResolver(userEditSchema),
  });

  useEffect(() => {
    if (open) {
      reset({ password: generateRandomPassword() });
      resetName({ fullName: user?.fullName ?? "" });
    }
  }, [open, user, reset, resetName]);

  async function onResetPassword(values: UserResetPasswordInput) {
    if (!user) return;
    await resetPassword.mutateAsync({ userId: user.id, password: values.password });
    reset({ password: generateRandomPassword() });
  }

  async function onSaveName(values: UserEditInput) {
    if (!user) return;
    await updateUser.mutateAsync({ id: user.id, input: values });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
        </DialogHeader>
        <div className="text-muted-foreground -mt-2 text-sm">
          {user?.email} · {user ? ROLE_LABEL[user.role] : ""}
        </div>

        <form onSubmit={handleNameSubmit(onSaveName)} className="space-y-2">
          <Label htmlFor="fullName">{tCommon("name")}</Label>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                id="fullName"
                aria-invalid={!!nameErrors.fullName}
                {...registerName("fullName")}
              />
              {nameErrors.fullName && (
                <p className="text-destructive mt-1 text-sm">{nameErrors.fullName.message}</p>
              )}
            </div>
            <Button type="submit" variant="outline" disabled={updateUser.isPending}>
              {updateUser.isPending ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </form>

        <div className="space-y-2 rounded-lg border p-3">
          <Label htmlFor="reset-password" className="text-muted-foreground text-xs">
            {t("changePassword")}
          </Label>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Controller
                control={control}
                name="password"
                render={({ field }) => (
                  <PasswordField id="reset-password" value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.password && (
                <p className="text-destructive mt-1 text-sm">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={resetPassword.isPending}
              onClick={handleSubmit(onResetPassword)}
            >
              <KeyRound className="size-3.5" />
              {resetPassword.isPending ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
