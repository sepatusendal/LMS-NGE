"use client";

import { useMemo, useState } from "react";
import { Megaphone, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useAnnouncementsAdmin,
  useDeleteAnnouncement,
  useSetAnnouncementActive,
} from "@/features/announcements/use-announcements";
import { AnnouncementFormDialog } from "@/features/announcements/announcement-form-dialog";
import { ANNOUNCEMENT_THEME, buildTargetRoleLabel, buildThemeLabel } from "@/features/announcements/schema";
import type { Announcement } from "@/features/announcements/schema";
import { LoadingState } from "@/components/shared/loading-state";

export default function AnnouncementsPage() {
  const t = useTranslations("admin.announcements");
  const { data: announcements, isLoading } = useAnnouncementsAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isExpired = (a: Announcement) => Boolean(a.expiresAt && new Date(a.expiresAt) < new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Megaphone className="size-4" />
          {t("createTitle")}
        </Button>
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && (!announcements || announcements.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
          <Megaphone className="text-muted-foreground/40 mb-3 size-10" />
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      )}

      {!isLoading && announcements && announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((a) => (
            <AnnouncementRow key={a.id} announcement={a} expired={isExpired(a)} />
          ))}
        </div>
      )}

      <AnnouncementFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function AnnouncementRow({ announcement: a, expired }: { announcement: Announcement; expired: boolean }) {
  const t = useTranslations("admin.announcements");
  const locale = useLocale();
  const setActive = useSetAnnouncementActive();
  const deleteAnnouncement = useDeleteAnnouncement();
  const theme = ANNOUNCEMENT_THEME[a.type];
  const themeLabel = useMemo(() => buildThemeLabel(t), [t])[a.type];
  const targetRoleLabel = useMemo(() => buildTargetRoleLabel(t), [t]);
  const Illustration = theme.Illustration;
  const live = a.isActive && !expired;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border bg-white shadow-sm", !live && "opacity-60")}>
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <Illustration className="hidden h-16 w-16 shrink-0 sm:block" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("text-sm font-bold", theme.titleColor)}>{a.title}</p>
            <Badge
              variant="outline"
              className="text-[10px]"
              style={{ borderColor: theme.swatch, color: theme.swatch }}
            >
              {themeLabel}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {a.displayMode === "POPUP" ? "Pop-up" : "Banner"}
            </Badge>
            {expired && (
              <Badge variant="secondary" className="text-[10px]">
                {t("expired")}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              {a.targetRoles.length === 0
                ? t("allRoles")
                : a.targetRoles.map((r) => targetRoleLabel[r]).join(", ")}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{a.body}</p>
          <p className="text-muted-foreground/70 mt-2 text-xs">
            {t("byAuthor", { author: a.createdByName })} ·{" "}
            {new Date(a.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {a.expiresAt &&
              ` · ${t("validUntil", {
                date: new Date(a.expiresAt).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
              })}`}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <Switch
            checked={a.isActive}
            disabled={setActive.isPending}
            onCheckedChange={(checked) => setActive.mutate({ id: a.id, isActive: checked })}
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-7"
            disabled={deleteAnnouncement.isPending}
            onClick={() => {
              if (window.confirm(t("deleteConfirm", { title: a.title }))) {
                deleteAnnouncement.mutate(a.id);
              }
            }}
          >
            <Trash2 className="size-4" />
            <span className="sr-only">{t("delete")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
