"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { announcementSchema, ANNOUNCEMENT_THEME, ANNOUNCEMENT_TYPES } from "./schema";
import type { AnnouncementInput, AnnouncementType } from "./schema";
import { useCreateAnnouncement } from "./use-announcements";

export function AnnouncementFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createAnnouncement = useCreateAnnouncement();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AnnouncementInput>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: "", body: "", type: "INFO", expiresAt: null },
  });

  useEffect(() => {
    if (open) reset({ title: "", body: "", type: "INFO", expiresAt: null });
  }, [open, reset]);

  const title = watch("title");
  const body = watch("body");
  const type = watch("type");
  const previewTheme = ANNOUNCEMENT_THEME[type];
  const PreviewIllustration = previewTheme.Illustration;

  async function onSubmit(values: AnnouncementInput) {
    await createAnnouncement.mutateAsync(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buat Pengumuman</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Jenis Pengumuman</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="grid grid-cols-4 gap-2">
                  {ANNOUNCEMENT_TYPES.map((t) => {
                    const theme = ANNOUNCEMENT_THEME[t];
                    const selected = field.value === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => field.onChange(t)}
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
                          style={{ backgroundColor: `${theme.swatch}1a` }}
                        >
                          <span className="size-3 rounded-full" style={{ backgroundColor: theme.swatch }} />
                        </span>
                        <span className="text-[11px] font-medium text-foreground">{theme.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Judul</Label>
            <Input
              id="title"
              placeholder="Contoh: Aplikasi sudah bisa dipakai lagi"
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Isi Pengumuman</Label>
            <Textarea
              id="body"
              rows={4}
              placeholder="Tulis pengumuman dengan jelas dan singkat..."
              aria-invalid={!!errors.body}
              {...register("body")}
            />
            {errors.body && <p className="text-destructive text-sm">{errors.body.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Berlaku Sampai (opsional)</Label>
            <Input id="expiresAt" type="date" {...register("expiresAt")} />
            <p className="text-muted-foreground text-xs">
              Kosongkan kalau pengumuman ini gak perlu kadaluarsa otomatis.
            </p>
          </div>

          {(title || body) && (
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Pratinjau</Label>
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
                      {title || "Judul pengumuman"}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed whitespace-pre-line">
                      {body || "Isi pengumuman akan tampil di sini."}
                    </p>
                  </div>
                  <PreviewIllustration className="hidden h-14 w-14 shrink-0 sm:block" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={createAnnouncement.isPending}>
              {createAnnouncement.isPending ? "Mempublikasikan..." : "Publikasikan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
