"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Play, NotebookPen, MapPin, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { WizardHeader } from "@/features/meetings/wizard-header";
import { useTodayClasses, useStartClass, useCheckInWithDraftPlan } from "@/features/meetings/use-today";
import { todayLocalDateStr } from "@/lib/date";
import { cn } from "@/lib/utils";

export default function CheckInPage() {
  const params = useParams<{ classId: string }>();
  const router = useRouter();
  const t = useTranslations("workflowWizard");
  const tWorkflow = useTranslations("workflow");
  const { data: classes, isLoading } = useTodayClasses();
  const startClass = useStartClass();
  const checkInDraft = useCheckInWithDraftPlan();

  const c = classes?.find((cls) => cls.classId === params.classId);

  // Already past check-in (came back here via a stale link/back button) —
  // send them straight to wherever they actually are in the flow instead of
  // showing a "Mulai Kelas" button that would just error on a second tap.
  useEffect(() => {
    if (!c) return;
    if (c.meetingStatus === "checked_in" || c.meetingStatus === "attendance_done") {
      router.replace(`/absensi/${c.classId}/attendance`);
    } else if (c.meetingStatus === "checked_out") {
      router.replace(`/absensi/meeting/${c.meetingId}/report`);
    } else if (c.meetingStatus === "report_submitted") {
      router.replace("/absensi");
    }
  }, [c, router]);

  const isRedirecting = Boolean(
    c && ["checked_in", "attendance_done", "checked_out", "report_submitted"].includes(c.meetingStatus),
  );

  if (isLoading || isRedirecting) return <LoadingState />;

  if (!c) {
    return (
      <div className="space-y-4">
        <WizardHeader className="" step={1} totalSteps={3} backHref="/absensi" />
        <p className="text-muted-foreground text-sm">{t("classNotFound")}</p>
      </div>
    );
  }

  const noPlanToday = c.meetingStatus === "no_plan_today";
  const draftCheckInBlocked = noPlanToday && c.draftCheckInBlocked;
  const isPending = startClass.isPending || checkInDraft.isPending;

  function handleStartClass() {
    if (!c) return;
    if (noPlanToday) {
      checkInDraft.mutate(
        {
          classId: c.classId,
          meetingNumber: c.draftMeetingNumber,
          week: c.draftWeek,
          scheduledDate: todayLocalDateStr(),
        },
        { onSuccess: () => router.push(`/absensi/${c.classId}/attendance`) },
      );
    } else {
      startClass.mutate(c.lessonPlanId!, {
        onSuccess: () => router.push(`/absensi/${c.classId}/attendance`),
      });
    }
  }

  return (
    <div className="space-y-5">
      <WizardHeader className={c.className} step={1} totalSteps={3} backHref="/absensi" />

      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {c.scheduleStartTime} - {c.scheduleEndTime}
            </span>
            {c.room && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {c.room}
              </span>
            )}
          </div>

          {noPlanToday ? (
            <div className="bg-chart-4/10 text-chart-4 rounded-lg px-3 py-2.5 text-sm">
              {draftCheckInBlocked ? t("draftCheckInBlockedNotice") : t("noPlanYetNotice")}
            </div>
          ) : (
            <div>
              <p className="text-muted-foreground text-xs">{tWorkflow("topic")}</p>
              <p className="text-sm font-medium">{c.topic}</p>
            </div>
          )}

          {!draftCheckInBlocked && (
            <Button
              size="lg"
              className="w-full"
              disabled={isPending}
              onClick={handleStartClass}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Play className="size-4" />
                  <span className="ml-1.5">{tWorkflow("startClass")}</span>
                </>
              )}
            </Button>
          )}

          {noPlanToday && (
            <Link
              href={`/lesson-plan/new?classId=${c.classId}`}
              className={
                draftCheckInBlocked
                  ? cn(buttonVariants({ size: "lg" }), "w-full")
                  : "text-muted-foreground flex items-center justify-center gap-1 text-xs hover:text-foreground"
              }
            >
              <NotebookPen className="size-3" />
              {tWorkflow("orWriteLessonPlanFirst")}
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
