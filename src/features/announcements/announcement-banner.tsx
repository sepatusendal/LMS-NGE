"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useDismissAnnouncement, useMyAnnouncements } from "./use-announcements";
import { ANNOUNCEMENT_THEME } from "./schema";

/** Dismissible pengumuman banner — mounted once near the top of each
 * role's landing page (teacher "Hari Ini", admin Dashboard, coordinator
 * Monitoring). Renders nothing once the user has dismissed every active
 * announcement, so it never permanently reserves layout space. */
export function AnnouncementBanner() {
  const { data: announcements, isLoading } = useMyAnnouncements();
  const dismiss = useDismissAnnouncement();

  if (isLoading || !announcements || announcements.length === 0) return null;

  return (
    <div className="space-y-3">
      {announcements.map((a) => {
        const theme = ANNOUNCEMENT_THEME[a.type];
        const Illustration = theme.Illustration;
        return (
          <div
            key={a.id}
            className={cn(
              "relative overflow-hidden rounded-3xl border px-5 py-4 shadow-sm sm:px-6 sm:py-5",
              theme.card,
              theme.border,
            )}
          >
            <div className="relative flex items-start gap-4">
              <div className="min-w-0 flex-1 pr-6">
                <p className={cn("text-[15px] font-bold sm:text-base", theme.titleColor)}>
                  {a.title}
                </p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-line">
                  {a.body}
                </p>
              </div>
              <Illustration className="hidden h-20 w-20 shrink-0 sm:block" />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground/70 hover:text-foreground absolute top-3 right-3 size-7 hover:bg-black/5"
              disabled={dismiss.isPending}
              onClick={() => dismiss.mutate(a.id)}
            >
              <X className="size-4" />
              <span className="sr-only">Tutup pengumuman</span>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
