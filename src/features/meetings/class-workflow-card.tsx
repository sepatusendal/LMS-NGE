"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Clock,
  CheckCircle,
  Play,
  LogOut,
  FileText,
  ClipboardCheck,
  NotebookPen,
  CalendarClock,
  AlertTriangle,
  Users2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ClassAvatar } from "@/components/shared/class-avatar";
import { HandoverSummaryPanel } from "@/features/substitutes/handover-summary-panel";
import { ABSENCE_REASON_LABEL, ABSENCE_REASON_KEY } from "@/features/substitutes/schema";
import type { TodayClass } from "@/features/meetings/schema";

// Every state carries its own icon on top of color/label — two teachers
// colorblind to the amber/green distinction (or just glancing quickly on a
// small phone screen in bright sunlight) still get a distinct shape to read.
export const STATUS_CONFIG: Record<
  string,
  {
    labelKey: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    accent: string;
    barColor: string;
    icon: LucideIcon;
  }
> = {
  not_started: {
    labelKey: "notStarted",
    variant: "secondary",
    accent: "text-slate-500",
    barColor: "bg-slate-300",
    icon: Clock,
  },
  checked_in: {
    labelKey: "fillAttendance",
    variant: "outline",
    accent: "border-chart-4/30 bg-chart-4/10 text-chart-4",
    barColor: "bg-chart-4",
    icon: ClipboardCheck,
  },
  attendance_done: {
    labelKey: "checkOut",
    variant: "outline",
    accent: "border-chart-4/30 bg-chart-4/10 text-chart-4",
    barColor: "bg-chart-4",
    icon: LogOut,
  },
  checked_out: {
    labelKey: "fillReport",
    variant: "outline",
    accent: "border-primary/30 bg-primary/10 text-primary",
    barColor: "bg-primary",
    icon: FileText,
  },
  report_submitted: {
    labelKey: "done",
    variant: "outline",
    accent: "border-transparent bg-chart-3 px-2.5 py-1 text-[13px] font-semibold text-primary-foreground",
    barColor: "bg-chart-3",
    icon: CheckCircle,
  },
  // Genuinely nothing to check in against today — either no lesson plan has
  // ever been written for this class, or every plan on file has already been
  // taught and none exists for today specifically. Reuses the app's own
  // amber token (chart-4) rather than a raw Tailwind amber so it stays
  // theme/dark-mode-correct, but a solid fill + warning icon sets it apart
  // from the softer "in progress" chart-4 tint above — this one needs
  // action before the class can even start, those are already underway.
  no_plan_today: {
    labelKey: "noPlanToday",
    variant: "outline",
    accent: "border-transparent bg-chart-4 px-2.5 py-1 text-[13px] font-semibold text-white",
    barColor: "bg-chart-4",
    icon: AlertTriangle,
  },
};

/** Where the primary action button for each meetingStatus should send the
 * teacher — each step now lives on its own page (see plan: wizard, not an
 * expand-in-place accordion) so a dropped connection or closed app mid-flow
 * always resumes at the right screen instead of losing local state. */
function wizardHref(c: TodayClass): string {
  switch (c.meetingStatus) {
    case "checked_in":
    case "attendance_done":
      return `/absensi/${c.classId}/attendance`;
    case "checked_out":
      return `/absensi/meeting/${c.meetingId}/report`;
    default:
      return `/absensi/${c.classId}/checkin`;
  }
}

/** Summary card for one class's today status — the primary button always
 * links into the check-in → attendance → report wizard at whatever step
 * is next; this component itself no longer runs any of those steps inline. */
export function ClassWorkflowCard({ c }: { c: TodayClass }) {
  const [showHandover, setShowHandover] = useState(false);
  const t = useTranslations("workflow");
  const tStatus = useTranslations("workflow.status");
  const locale = useLocale();
  const dtLocale = locale === "en" ? "en-US" : "id-ID";

  const status = STATUS_CONFIG[c.meetingStatus] || STATUS_CONFIG.not_started;
  const noPlanToday = c.meetingStatus === "no_plan_today";
  const newPlanHref = `/lesson-plan/new?classId=${c.classId}`;

  return (
    <div className="space-y-3.5">
      <Card className="overflow-hidden border-2 border-transparent py-0 shadow-sm">
        <div className={cn("h-1.5 w-full", status.barColor)} />
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <ClassAvatar name={c.className} size="md" className="mt-0.5" />
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="truncate text-base font-semibold">{c.className}</h2>
                <p className="text-muted-foreground text-xs">{c.schoolName}</p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  <span className="flex shrink-0 items-center gap-1">
                    <Clock className="size-3 shrink-0" />
                    {c.scheduleStartTime} - {c.scheduleEndTime}
                  </span>
                  {c.room && (
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{c.room}</span>
                    </span>
                  )}
                </div>
                {noPlanToday ? (
                  <p className="text-chart-4 flex items-center gap-1 text-xs font-medium">
                    <AlertTriangle className="size-3 shrink-0" />
                    {t("noLessonPlanForMeeting")}
                  </p>
                ) : (
                  <p className="text-xs font-medium">
                    {t("meetingTopic", { number: c.meetingNumber, topic: c.topic ?? "" })}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={status.variant} className={cn("ml-2 flex shrink-0 items-center gap-1", status.accent)}>
              <status.icon className="size-3" />
              {tStatus(status.labelKey)}
            </Badge>
          </div>

          {c.isSubstitute && (
            <div className="bg-chart-4/10 text-chart-4 mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-xs">
              <Users2 className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {t("teachingAsSubstitute")} <span className="font-medium">{c.originalTeacherName}</span>
                {c.substituteReason && (
                  <>
                    {" — "}
                    {ABSENCE_REASON_KEY[c.substituteReason]
                      ? t(`absenceReason.${ABSENCE_REASON_KEY[c.substituteReason]}`)
                      : (ABSENCE_REASON_LABEL[c.substituteReason] ?? c.substituteReason)}
                  </>
                )}
              </span>
            </div>
          )}

          {c.checkInTime && (
            <div className="mt-3 flex gap-4 text-xs">
              <span className="text-muted-foreground">
                {t("checkIn")}:{" "}
                <span className="font-medium text-foreground">
                  {new Date(c.checkInTime).toLocaleTimeString(dtLocale, { hour: "2-digit", minute: "2-digit" })}
                </span>
              </span>
              {c.checkOutTime && (
                <>
                  <span className="text-muted-foreground">
                    {t("checkOut")}:{" "}
                    <span className="font-medium text-foreground">
                      {new Date(c.checkOutTime).toLocaleTimeString(dtLocale, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </span>
                  {c.durationMinutes && (
                    <span className="text-muted-foreground">
                      {t("duration")}:{" "}
                      <span className="font-medium text-foreground">{t("durationMinutes", { minutes: c.durationMinutes })}</span>
                    </span>
                  )}
                </>
              )}
              {c.isLate && (
                <Badge variant="destructive" className="text-[10px]">
                  {t("late")}
                </Badge>
              )}
            </div>
          )}

          {c.isSubstitute && c.lessonPlanId && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => setShowHandover((prev) => !prev)}
            >
              {showHandover ? t("closeHandoverSummary") : t("viewHandoverSummary")}
            </Button>
          )}

          <div className="mt-3 flex flex-col gap-1.5">
            {noPlanToday && (
              <>
                <Link
                  href={wizardHref(c)}
                  className={cn(buttonVariants({ size: "sm" }), "w-full bg-chart-4 text-white hover:bg-chart-4/90")}
                >
                  <Play className="size-4" />
                  <span className="ml-1.5">{t("startClass")}</span>
                </Link>
                <Link
                  href={newPlanHref}
                  className="text-muted-foreground flex items-center justify-center gap-1 text-xs hover:text-foreground"
                >
                  <NotebookPen className="size-3" />
                  {t("orWriteLessonPlanFirst")}
                </Link>
              </>
            )}

            {!noPlanToday && c.meetingStatus === "not_started" && (
              <Link href={wizardHref(c)} className={cn(buttonVariants({ size: "sm" }), "w-full bg-primary hover:bg-primary/80")}>
                <Play className="size-4" />
                <span className="ml-1.5">{t("startClass")}</span>
              </Link>
            )}

            {(c.meetingStatus === "checked_in" || c.meetingStatus === "attendance_done") && (
              <Link
                href={wizardHref(c)}
                className={cn(buttonVariants({ size: "sm" }), "w-full bg-chart-4 hover:bg-chart-4/80")}
              >
                <ClipboardCheck className="size-4" />
                <span className="ml-1.5">{t("fillStudentAttendance")}</span>
              </Link>
            )}

            {c.meetingStatus === "checked_out" && (
              <Link
                href={wizardHref(c)}
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "w-full border-primary/40 text-primary hover:bg-primary/10",
                )}
              >
                <FileText className="size-4" />
                <span className="ml-1.5">{t("fillDailyReport")}</span>
              </Link>
            )}

            {c.meetingStatus === "report_submitted" && (
              <div className="flex w-full items-center justify-between gap-2 rounded-md bg-chart-3/10 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-chart-3" />
                  <span className="font-medium text-chart-3">{t("classDone")}</span>
                </span>
                {c.meetingId && (
                  <Link
                    href={`/absensi/meeting/${c.meetingId}/report`}
                    className="text-chart-3 flex items-center gap-0.5 text-xs font-medium hover:underline"
                  >
                    {t("viewOrEditReport")}
                    <ChevronRight className="size-3" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Forward-looking reminder only — today's own status above
              (e.g. "Selesai") already reflects that today was handled.
              This never appears together with the "no_plan_today" badge:
              that one already carries its own "create a plan" CTA above,
              so a second one here would just be a confusing duplicate. */}
          {c.needsNextLessonPlan && (
            <Link
              href={newPlanHref}
              className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-dashed border-chart-4/40 bg-chart-4/5 px-3 py-2.5 text-xs transition-colors hover:bg-chart-4/10"
            >
              <CalendarClock className="text-chart-4 size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-chart-4">{t("planAheadTitle")}</span>
                <span className="text-muted-foreground block">{t("planAheadDescription")}</span>
              </span>
              <span className="text-chart-4 shrink-0 font-medium whitespace-nowrap">{t("planAheadCta")}</span>
            </Link>
          )}
        </CardContent>
      </Card>

      {showHandover && c.lessonPlanId && (
        <Card>
          <CardContent className="pt-4">
            <h3 className="mb-3 text-sm font-medium">{t("handoverSummary")}</h3>
            <HandoverSummaryPanel classId={c.classId} lessonPlanId={c.lessonPlanId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
