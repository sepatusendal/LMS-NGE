"use client";

import Link from "next/link";
import { Plus, Clock, MapPin, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleBadge } from "@/components/shared/module-cover";
import { useMyClasses } from "@/features/classes/use-my-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";
import { formatScheduleSlots } from "@/features/classes/schema";
import { parseLocalDate } from "@/lib/date";
import { getCurriculumTheme } from "@/lib/curriculum-theme";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export default function LessonPlanPage() {
  const { data: classes } = useMyClasses();
  const { data: lessonPlans, isLoading } = useLessonPlans();

  const now = Date.now();

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Lesson Plan</h1>
          <p className="text-muted-foreground text-sm">
            Rencana pembelajaran untuk semua kelasmu
          </p>
        </div>
        <Link
          href="/lesson-plan/new"
          className={cn(buttonVariants({ size: "sm" }), "shadow-sm")}
        >
          <Plus className="size-4" aria-hidden="true" />
          Tambah
        </Link>
      </div>

      {classes?.map((classItem) => {
        const classPlans = (lessonPlans ?? [])
          .filter((p) => p.classId === classItem.id)
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
        const latest = classPlans[classPlans.length - 1];
        const isCompliant =
          latest && parseLocalDate(latest.scheduledDate).getTime() - now >= TWO_WEEKS_MS;
        const theme = getCurriculumTheme(classItem.module?.curriculumName ?? classItem.name);

        return (
          <div key={classItem.id} className="space-y-3">
            <div className={cn("overflow-hidden rounded-2xl border bg-white shadow-sm")}>
              <div className={cn("h-1.5 w-full", theme.bar)} />
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1.5">
                  <p className="text-base font-bold">{classItem.name}</p>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span>{classItem.schoolName}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatScheduleSlots(classItem.scheduleSlots)}
                    </span>
                    {classItem.room && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {classItem.room}
                      </span>
                    )}
                  </div>
                  {classItem.module && (
                    <div className="pt-0.5">
                      <ModuleBadge module={classItem.module} />
                    </div>
                  )}
                </div>
                <Badge
                  variant={isCompliant ? "default" : "secondary"}
                  className="shrink-0"
                >
                  {isCompliant ? "Aman" : "Perlu Lesson Plan"}
                </Badge>
              </div>
            </div>

            {classPlans.length === 0 ? (
              <Card className="border-dashed shadow-none">
                <CardContent className="text-muted-foreground py-5 text-center text-sm">
                  Belum ada lesson plan.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {classPlans.map((plan) => (
                  <Link key={plan.id} href={`/lesson-plan/${plan.id}`}>
                    <Card className="border-border/70 rounded-xl shadow-sm transition-colors hover:bg-muted/40">
                      <CardContent className="flex items-center justify-between gap-3 py-3.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            Meeting {plan.meetingNumber} — {plan.topic}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Minggu {plan.week} ·{" "}
                            {new Date(plan.scheduledDate).toLocaleDateString(
                              "id-ID",
                              { day: "numeric", month: "short", year: "numeric" },
                            )}
                          </p>
                        </div>
                        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {!isLoading && (!classes || classes.length === 0) && (
        <p className="text-muted-foreground text-sm">
          Belum ada kelas yang ditugaskan ke Anda.
        </p>
      )}
    </div>
  );
}
