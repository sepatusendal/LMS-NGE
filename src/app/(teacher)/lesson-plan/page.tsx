"use client";

import Link from "next/link";
import { Plus, Clock, MapPin, ChevronRight, CheckCircle2, AlarmClockCheck, NotebookPen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModuleBadge } from "@/components/shared/module-cover";
import { ClassAvatar } from "@/components/shared/class-avatar";
import { LoadingState } from "@/components/shared/loading-state";
import { useMyClasses } from "@/features/classes/use-my-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";
import { formatScheduleSlots } from "@/features/classes/schema";
import { parseLocalDate } from "@/lib/date";
import { getCurriculumTheme } from "@/lib/curriculum-theme";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export default function LessonPlanPage() {
  const { data: classes, isLoading: classesLoading } = useMyClasses();
  const { data: lessonPlans, isLoading: plansLoading } = useLessonPlans();
  const isLoading = classesLoading || plansLoading;

  const now = Date.now();
  const classesNeedingPlan = (classes ?? []).filter((c) => {
    const plans = (lessonPlans ?? []).filter((p) => p.classId === c.id);
    const latest = plans[plans.length - 1];
    return !latest || parseLocalDate(latest.scheduledDate).getTime() - now < TWO_WEEKS_MS;
  }).length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Lesson Plan</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Rencana pembelajaran untuk semua kelasmu
          </p>
          {!isLoading && classes && classes.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
                {classes.length} kelas
              </span>
              {classesNeedingPlan > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eda100]/12 px-3 py-1 text-xs font-semibold text-[#a3730a]">
                  <AlarmClockCheck className="size-3.5" />
                  {classesNeedingPlan} perlu lesson plan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1baf7a]/12 px-3 py-1 text-xs font-semibold text-[#0e7a53]">
                  <CheckCircle2 className="size-3.5" />
                  Semua kelas aman
                </span>
              )}
            </div>
          )}
        </div>
        <Link
          href="/lesson-plan/new"
          className={cn(buttonVariants({ size: "sm" }), "shrink-0 shadow-sm")}
        >
          <Plus className="size-4" aria-hidden="true" />
          Tambah
        </Link>
      </div>

      {isLoading && <LoadingState />}

      {!isLoading &&
        classes?.map((classItem) => {
          const classPlans = (lessonPlans ?? [])
            .filter((p) => p.classId === classItem.id)
            .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
          const latest = classPlans[classPlans.length - 1];
          const isCompliant =
            latest && parseLocalDate(latest.scheduledDate).getTime() - now >= TWO_WEEKS_MS;
          const themeKey = classItem.module?.curriculumName ?? classItem.name;
          const theme = getCurriculumTheme(themeKey);

          return (
            <div key={classItem.id} className="space-y-3.5">
              <div className="flex items-start gap-3.5 rounded-3xl border border-black/5 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(20,25,50,0.08)] sm:p-5">
                <ClassAvatar name={classItem.name} themeKey={themeKey} size="lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg leading-tight font-bold">{classItem.name}</p>
                    {isCompliant ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1baf7a]/12 px-2.5 py-1 text-[11px] font-bold text-[#0e7a53]">
                        <CheckCircle2 className="size-3" />
                        Aman
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#eda100]/15 px-2.5 py-1 text-[11px] font-bold text-[#a3730a]">
                        <AlarmClockCheck className="size-3" />
                        Perlu Lesson Plan
                      </span>
                    )}
                  </div>
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
                  {classItem.module && <ModuleBadge module={classItem.module} />}
                </div>
              </div>

              {classPlans.length === 0 ? (
                <div className="border-border/60 flex flex-col items-center gap-2 rounded-2xl border border-dashed py-8 text-center">
                  <NotebookPen className="text-muted-foreground/60 size-6" />
                  <p className="text-muted-foreground text-sm">
                    Belum ada lesson plan untuk kelas ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {classPlans.map((plan) => (
                    <Link key={plan.id} href={`/lesson-plan/${plan.id}`}>
                      <div className="group border-border/60 flex items-center gap-3 rounded-2xl border bg-white p-3.5 transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-md">
                        <div
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white",
                            theme.solid,
                          )}
                        >
                          {plan.meetingNumber}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{plan.topic}</p>
                          <p className="text-muted-foreground text-xs">
                            Minggu {plan.week} ·{" "}
                            {new Date(plan.scheduledDate).toLocaleDateString(
                              "id-ID",
                              { day: "numeric", month: "short", year: "numeric" },
                            )}
                          </p>
                        </div>
                        <ChevronRight className="text-muted-foreground/50 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      {!isLoading && (!classes || classes.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
          <NotebookPen className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">
            Belum ada kelas yang ditugaskan ke Anda.
          </p>
        </div>
      )}
    </div>
  );
}
