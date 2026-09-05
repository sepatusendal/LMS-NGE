"use client";

import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  buildAnnouncementSchema,
  ANNOUNCEMENT_THEME,
  ANNOUNCEMENT_TYPES,
  ANNOUNCEMENT_DISPLAY_MODES,
  ANNOUNCEMENT_TARGET_ROLES,
  buildTargetRoleLabel,
  buildDisplayModeInfo,
  buildThemeLabel,
} from "./schema";
import type { AnnouncementInput } from "./schema";
import { useCreateAnnouncement } from "./use-announcements";

const DEFAULT_VALUES: AnnouncementInput = {
  title: "",
  body: "",
  type: "INFO",
  displayMode: "BANNER",
  expiresAt: null,
  targetRoles: [],
};

export function AnnouncementFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("admin.announcements");
  const createAnnouncement = useCreateAnnouncement();

  const announcementSchema = useMemo(() => buildAnnouncementSchema(t), [t]);
  const targetRoleLabel = useMemo(() => buildTargetRoleLabel(t), [t]);
  const displayModeInfo = useMemo(() => buildDisplayModeInfo(t), [t]);
  const themeLabel = useMemo(() => buildThemeLabel(t), [t]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AnnouncementInput>({
    resolver: zodResolver(announcementSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) reset(DEFAULT_VALUES);
  }, [open, reset]);

  const title = watch("title");
  const body = watch("body");
  const type = watch("type");
  const displayMode = watch("displayMode");
  const previewTheme = ANNOUNCEMENT_THEME[type];
  const PreviewIllustration = previewTheme.Illustration;

  async function onSubmit(values: AnnouncementInput) {
    await createAnnouncement.mutateAsync(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("typeLabel")}</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="grid grid-cols-4 gap-2">
                  {ANNOUNCEMENT_TYPES.map((ty) => {
                    const theme = ANNOUNCEMENT_THEME[ty];
                    const selected = field.value === ty;
                    return (
                      <button
                        key={ty}
                        type="button"
                        onClick={() => field.onChange(ty)}
                        className={cn(
                          "relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-2.5 transition-all",
                          selected ? "border-current shadow-sm" : "border-transparent bg-muted/40 hover:bg-muted/70",
                        )}
                        style={selected ? { borderColor: theme.swatch, color: theme.swatch } : undefined}
                      >
                        {selected && (
                          <span
                            className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: theme.swatch }}
                          >
                            <Check className="size-2.5" strokeWidth={3} />
                          </span>
                        )}
                        <span
                          className="flex size-8 items-center justify-center rounded-full"
                          style={{ backgroundColor: `color-mix(in srgb, ${theme.swatch} 10%, transparent)` }}
                        >
                          <span className="size-3 rounded-full" style={{ backgroundColor: theme.swatch }} />
                        </span>
                        <span className="text-[11px] font-medium text-foreground">{themeLabel[ty]}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("displayLabel")}</Label>
            <Controller
              control={control}
              name="displayMode"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {ANNOUNCEMENT_DISPLAY_MODES.map((mode) => {
                    const info = displayModeInfo[mode];
                    const selected = field.value === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => field.onChange(mode)}
                        className={cn(
                          "rounded-xl border-2 px-3 py-2.5 text-left transition-all",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted/40 hover:bg-muted/70",
                        )}
                      >
                        <p className={cn("text-sm font-semibold", selected && "text-primary")}>
                          {info.label}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                          {info.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">{t("titleLabel")}</Label>
            <Input
              id="title"
              placeholder={t("titlePlaceholder")}
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">{t("bodyLabel")}</Label>
            <Textarea
              id="body"
              rows={4}
              placeholder={t("bodyPlaceholder")}
              aria-invalid={!!errors.body}
              {...register("body")}
            />
            {errors.body && <p className="text-destructive text-sm">{errors.body.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>{t("targetAudience")}</Label>
            <Controller
              control={control}
              name="targetRoles"
              render={({ field }) => (
                <div className="space-y-1.5 rounded-xl border px-3 py-2.5">
                  {ANNOUNCEMENT_TARGET_ROLES.map((role) => {
                    const checked = (field.value ?? []).includes(role);
                    return (
                      <label key={role} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const current = field.value ?? [];
                            field.onChange(
                              v ? [...current, role] : current.filter((r) => r !== role),
                            );
                          }}
                        />
                        {targetRoleLabel[role]}
                      </label>
                    );
                  })}
                </div>
              )}
            />
            <p className="text-muted-foreground text-xs">{t("targetAudienceHint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">{t("expiresAtOptional")}</Label>
            <Input id="expiresAt" type="date" {...register("expiresAt")} />
            <p className="text-muted-foreground text-xs">{t("expiresAtHint")}</p>
          </div>

          {(title || body) && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                {t("previewLabel")} — {displayModeInfo[displayMode].label}
              </Label>

              {displayMode === "BANNER" ? (
                <div
                  className={cn(
                    "relative overflow-hidden rounded-2xl border px-4 py-3.5",
                    previewTheme.card,
                    previewTheme.border,
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-bold", previewTheme.titleColor)}>
                        {title || t("previewTitlePlaceholder")}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed whitespace-pre-line">
                        {body || t("previewBodyPlaceholder")}
                      </p>
                    </div>
                    <PreviewIllustration className="hidden h-14 w-14 shrink-0 sm:block" uid="preview-banner" />
                  </div>
                </div>
              ) : (
                <div className="flex justify-center rounded-2xl bg-muted/40 p-4">
                  <div className="w-full max-w-[220px] overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
                    <div
                      className={cn("flex flex-col items-center px-4 pt-5 pb-4 text-center", previewTheme.card)}
                    >
                      <PreviewIllustration className="h-16 w-16" uid="preview-popup" />
                      <p className={cn("mt-2 text-xs font-extrabold", previewTheme.titleColor)}>
                        {title || t("previewTitlePlaceholder")}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[10px] leading-snug">
                        {body || t("previewBodyPlaceholder")}
                      </p>
                    </div>
                    <div className="px-4 pb-4">
                      <div
                        className="rounded-lg py-1.5 text-center text-[10px] font-semibold text-white"
                        style={{ backgroundColor: previewTheme.swatch }}
                      >
                        {t("previewGotIt")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={createAnnouncement.isPending}>
              {createAnnouncement.isPending ? t("publishing") : t("publish")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
