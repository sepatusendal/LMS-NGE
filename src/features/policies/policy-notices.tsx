"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, FileCheck2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { AppRole } from "@/features/auth/role-routes";
import { cn } from "@/lib/utils";
import { formatDay } from "./format";
import { setPolicyPopupOpen } from "./policy-popup-state";
import { isUnder } from "./popup-rules";
import { isPendingPolicy, type MyPolicy } from "./queries";
import { isOverdue } from "./schema";
import { useMyPolicies } from "./use-policies";
import { usePolicyPopup, type ActivePopup } from "./use-policy-popup";

/** Pages that stay open for a tutor after the deadline. Attendance is never
 * blocked: the company rules require tutors to check in and out through this
 * app. Lesson plans stay open for the same reason, because checking in can
 * require writing that day's plan first. */
const OPEN_WHEN_OVERDUE = ["/kebijakan", "/absensi", "/lesson-plan", "/profile"];

/** What this account still has to confirm, the pop-up to show, and whether this
 * page is locked. Only tutors are ever locked, and the lock is a reminder in the
 * interface, not a security boundary.
 * @param role undefined while unknown, or when another layout handles it. */
export function usePolicyNotices(role: AppRole | undefined, pathname: string) {
  const { data } = useMyPolicies(Boolean(role));
  const router = useRouter();
  // A disabled query still returns cached data, hence the check on role.
  const items = useMemo(() => (role ? (data?.items ?? []) : []), [role, data]);
  const pending = useMemo(() => items.filter(isPendingPolicy), [items]);
  const overdue = pending.some((item) => isOverdue(item.packet.deadline));
  const blocked = role === "TEACHER" && overdue && !isUnder(pathname, OPEN_WHEN_OVERDUE);
  const popup = usePolicyPopup({ pending, role, pathname, sessionKey: data?.sessionKey ?? "" });

  useEffect(() => {
    if (blocked) router.replace("/kebijakan");
  }, [blocked, router]);

  return { pending, hasDocuments: items.length > 0, overdue, blocked, ...popup };
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

/** Stays on every page until this account has confirmed. */
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
        {/* The overdue warning is not replaceable: it says what has happened. */}
        <span className="block text-sm font-semibold break-words">
          {overdue ? t("bannerOverdue") : first.packet.noticeTitle || t("title")}
        </span>
        <span className="text-muted-foreground line-clamp-2 text-xs break-words">
          {first.packet.noticeMessage || first.packet.title}
        </span>
      </span>
      <span className="text-primary shrink-0 text-xs font-semibold">{t("readNow")}</span>
    </Link>
  );
}

/** How often it appears is set by the admin per packet. "Later" records no
 * confirmation: only the confirm button on the document page does. */
export function PolicyPopup({
  popup,
  onLater,
  onClose,
}: {
  popup: ActivePopup | null;
  onLater: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("policies.notices");
  const locale = useLocale();
  const isOpen = popup !== null;

  useEffect(() => {
    setPolicyPopupOpen(isOpen);
    return () => setPolicyPopupOpen(false);
  }, [isOpen]);

  if (!popup) return null;
  const { item, firm } = popup;
  const { packet } = item;

  return (
    // A firm pop-up ignores Escape and outside clicks: one of its two buttons
    // has to be used.
    <Dialog open onOpenChange={(next) => !next && !firm && onLater()}>
      <DialogContent showCloseButton={false} className="max-w-[calc(100%-2.5rem)] gap-3 rounded-3xl p-6 text-center sm:max-w-sm">
        <span className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
          <FileCheck2 className="text-primary size-7" />
        </span>
        <DialogTitle className="text-lg leading-snug font-bold break-words">
          {packet.noticeTitle || t("title")}
        </DialogTitle>
        <DialogDescription className="leading-relaxed break-words whitespace-pre-line">
          {packet.noticeMessage || t("popupBody", { title: packet.title })}
        </DialogDescription>
        {packet.deadline && (
          <p className="text-chart-4 text-xs font-semibold">
            {t("popupDeadline", { date: formatDay(packet.deadline, locale) })}
          </p>
        )}
        {firm && <p className="text-muted-foreground text-xs">{t("firmHint")}</p>}
        <Link
          href={`/kebijakan/${packet.id}`}
          onClick={onClose}
          className={cn(buttonVariants({ size: "lg" }), "h-11 w-full")}
        >
          {t("readNow")}
        </Link>
        {firm ? (
          <Link href="/absensi" onClick={onClose} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
            {t("goToAttendance")}
          </Link>
        ) : (
          <Button variant="ghost" className="w-full" onClick={onLater}>
            {t("later")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
