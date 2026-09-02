"use client";

import { useTranslations } from "next-intl";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDismissAnnouncement, useMyAnnouncements } from "./use-announcements";
import { ANNOUNCEMENT_THEME } from "./schema";

/** Blocking pop-up for announcements the admin marked "Pop-up" instead of
 * "Banner" — reserved for things worth interrupting the user for. Shows
 * one at a time (oldest unread first); dismissing advances to the next,
 * so a backlog never traps the user behind a stack of modals. */
export function AnnouncementPopup() {
  const { data: announcements } = useMyAnnouncements();
  const dismiss = useDismissAnnouncement();
  const t = useTranslations("common.announcements");

  const popups = (announcements ?? []).filter((a) => a.displayMode === "POPUP");
  const current = popups[popups.length - 1];

  if (!current) return null;

  const theme = ANNOUNCEMENT_THEME[current.type];
  const Illustration = theme.Illustration;

  return (
    <Dialog open onOpenChange={(open) => !open && dismiss.mutate(current.id)}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[calc(100%-2.5rem)] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-sm"
      >
        <div className={cn("flex flex-col items-center px-6 pt-8 pb-6 text-center", theme.card)}>
          <Illustration className="h-32 w-32" uid={`popup-${current.id}`} />
          <p className={cn("mt-3 text-lg font-extrabold tracking-tight", theme.titleColor)}>
            {current.title}
          </p>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed whitespace-pre-line">
            {current.body}
          </p>
        </div>
        <div className="px-6 pb-6">
          <Button
            className="w-full"
            disabled={dismiss.isPending}
            onClick={() => dismiss.mutate(current.id)}
            style={{ backgroundColor: theme.swatch }}
          >
            {t("gotIt")}
          </Button>
          {popups.length > 1 && (
            <p className="text-muted-foreground/70 mt-2.5 text-center text-xs">
              {t("othersWaiting", { count: popups.length - 1 })}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
