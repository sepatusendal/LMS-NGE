"use client";

import Link from "next/link";
import { Plus, Clock, MapPin } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useMyClasses } from "@/features/classes/use-my-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";
import { DAY_LABEL } from "@/features/classes/schema";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export default function LessonPlanPage() {
  const { data: classes } = useMyClasses();
  const { data: lessonPlans, isLoading } = useLessonPlans();

  const now = Date.now();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Lesson Plan</h1>
        <Link
          href="/lesson-plan/new"
          className={cn(buttonVariants({ size: "sm" }))}
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
          latest && new Date(latest.scheduledDate).getTime() - now >= TWO_WEEKS_MS;

        const days = classItem.scheduleDaysOfWeek
          .map((d) => DAY_LABEL[String(d)])
          .join(", ");

        return (
          <div key={classItem.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{classItem.name}</p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  <span>{classItem.schoolName}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {classItem.scheduleStartTime} - {classItem.scheduleEndTime}
                  </span>
                  {classItem.room && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {classItem.room}
                    </span>
                  )}
                  <span>{days}</span>
                </div>
              </div>
              <Badge variant={isCompliant ? "default" : "secondary"}>
                {isCompliant ? "Aman" : "Perlu Lesson Plan"}
              </Badge>
            </div>

            {classPlans.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground py-4 text-center text-sm">
                  Belum ada lesson plan.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {classPlans.map((plan) => (
                  <Link key={plan.id} href={`/lesson-plan/${plan.id}`}>
                    <Card className="hover:bg-muted/50">
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium">
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
