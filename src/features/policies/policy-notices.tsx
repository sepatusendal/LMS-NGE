"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, FileCheck2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDay } from "./format";
import { setPolicyPopupOpen } from "./policy-popup-state";
import { isPendingPolicy, type MyPolicy } from "./queries";
import { isOverdue } from "./schema";
import { useMyPolicies } from "./use-policies";

/** Pages that stay open after the deadline. Attendance is never blocked: the
 * company rules require tutors to check in and out through this app. */
const OPEN_WHEN_OVERDUE = ["/kebijakan", "/absensi", "/profile"];
/** Pages where a pop-up would get in the way. */
const NO_POPUP = ["/kebijakan", "/absensi"];

function isUnder(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** What the tutor still has to confirm, and whether this page is locked. The
 * lock is a reminder in the interface, not a security boundary. */
export function usePolicyNotices(enabled: boolean, pathname: string) {
  const { data } = useMyPolicies(enabled);
  const router = useRouter();
  const pending = useMemo(() => (enabled ? (data?.items ?? []).filter(isPendingPolicy) : []), [enabled, data]);
  const overdue = pending.some((item) => isOverdue(item.packet.deadline));
  const blocked = overdue && !isUnder(pathname, OPEN_WHEN_OVERDUE);

  useEffect(() => {
    if (blocked) router.replace("/kebijakan");
  }, [blocked, router]);

  return { pending, overdue, blocked, sessionKey: data?.sessionKey ?? "" };
}

export function PolicyBell({ count }: { count: number }) {
  const t = useTranslations("policies.notices");
  return (
    <Link href="/kebijakan" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "relative")}>
      <Bell className="size-4" aria-hidden="true" />
      {count > 0 && (
        <span className="bg-destructive absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
      <span className="sr-only">{t("bell", { count })}</span>
    </Link>
  );
}

/** Stays on every page until the tutor has confirmed. */
export function PolicyBanner({ pending, pathname }: { pending: MyPolicy[]; pathname: string }) {
  const t = useTranslations("policies.notices");
  if (pending.length === 0 || isUnder(pathname, ["/kebijakan"])) return null;
  const first = pending[0];
  const overdue = pending.some((item) => isOverdue(item.packet.deadline));

  return (
    <Link
      href={pending.length === 1 ? `/kebijakan/${first.packet.id}` : "/kebijakan"}
      className={cn(
        "mb-4 flex items-center gap-3 rounded-2xl border px-4 py-3",
        overdue ? "border-destructive/30 bg-destructive/10" : "border-chart-4/30 bg-chart-4/10",
      )}
    >
      <FileCheck2 className={cn("size-5 shrink-0", overdue ? "text-destructive" : "text-chart-4")} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{overdue ? t("bannerOverdue") : t("title")}</span>
        <span className="text-muted-foreground block truncate text-xs">{first.packet.title}</span>
      </span>
      <span className="text-primary shrink-0 text-xs font-semibold">{t("readNow")}</span>
    </Link>
  );
}

/** Shown once per sign-in. "Later" records nothing: only the confirm button on
 * the document page does. */
export function PolicyPopup({
  pending,
  sessionKey,
  pathname,
}: {
  pending: MyPolicy[];
  sessionKey: string;
  pathname: string;
}) {
  const t = useTranslations("policies.notices");
  const locale = useLocale();
  const [, setDismissals] = useState(0);
  const storageKey = (id: string) => `policy-later:${sessionKey}:${id}`;
  // Only reached in the browser: there is nothing pending during server rendering.
  const current = isUnder(pathname, NO_POPUP)
    ? undefined
    : pending.find((item) => !window.sessionStorage.getItem(storageKey(item.packet.id)));

  useEffect(() => {
    setPolicyPopupOpen(Boolean(current));
    return () => setPolicyPopupOpen(false);
  }, [current]);

  if (!current) return null;

  const later = () => {
    window.sessionStorage.setItem(storageKey(current.packet.id), "1");
    setDismissals((n) => n + 1);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && later()}>
      <DialogContent showCloseButton={false} className="max-w-[calc(100%-2.5rem)] gap-3 rounded-3xl p-6 text-center sm:max-w-sm">
        <span className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
          <FileCheck2 className="text-primary size-7" />
        </span>
        <DialogTitle className="text-lg leading-snug font-bold">{t("title")}</DialogTitle>
        <DialogDescription className="leading-relaxed">
          {t("popupBody", { title: current.packet.title })}
        </DialogDescription>
        {current.packet.deadline && (
          <p className="text-chart-4 text-xs font-semibold">
            {t("popupDeadline", { date: formatDay(current.packet.deadline, locale) })}
          </p>
        )}
        <Link
          href={`/kebijakan/${current.packet.id}`}
          onClick={later}
          className={cn(buttonVariants({ size: "lg" }), "h-11 w-full")}
        >
          {t("readNow")}
        </Link>
        <Button variant="ghost" className="w-full" onClick={later}>
          {t("later")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
