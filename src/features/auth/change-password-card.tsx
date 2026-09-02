"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildChangePasswordSchema, type ChangePasswordInput } from "./change-password-schema";

function PasswordInput({
  id,
  name,
  autoComplete,
  register,
  showLabel,
  hideLabel,
}: {
  id: string;
  name: keyof ChangePasswordInput;
  autoComplete: string;
  register: ReturnType<typeof useForm<ChangePasswordInput>>["register"];
  showLabel: string;
  hideLabel: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        className="pr-10"
        {...register(name)}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3"
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        <span className="sr-only">{show ? hideLabel : showLabel}</span>
      </button>
    </div>
  );
}

export function ChangePasswordCard() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("changePassword");

  const changePasswordSchema = useMemo(() => buildChangePasswordSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(values: ChangePasswordInput) {
    setIsSubmitting(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      toast.error(t("errorTitle"), { description: t("errorNoSession") });
      setIsSubmitting(false);
      return;
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: values.currentPassword,
    });

    if (reauthError) {
      setError("currentPassword", { message: t("errorWrongCurrentPassword") });
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: values.newPassword,
    });

    setIsSubmitting(false);

    if (updateError) {
      toast.error(t("errorTitle"), { description: updateError.message });
      return;
    }

    toast.success(t("success"));
    reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" aria-hidden="true" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              autoComplete="current-password"
              register={register}
              showLabel={t("showPassword")}
              hideLabel={t("hidePassword")}
            />
            {errors.currentPassword && (
              <p className="text-destructive text-sm">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t("newPassword")}</Label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              autoComplete="new-password"
              register={register}
              showLabel={t("showPassword")}
              hideLabel={t("hidePassword")}
            />
            {errors.newPassword && (
              <p className="text-destructive text-sm">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              autoComplete="new-password"
              register={register}
              showLabel={t("showPassword")}
              hideLabel={t("hidePassword")}
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
