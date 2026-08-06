"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClasses } from "@/features/classes/use-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

interface NonCompliantClass {
  id: string;
  name: string;
  schoolName: string;
  teacherName: string;
  latestDate: string | null;
  daysLeft: number;
}

export function ComplianceAlert() {
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: lessonPlans, isLoading: plansLoading } = useLessonPlans();

  const { nonCompliant } = useMemo(() => {
    if (!classes || !lessonPlans) return { nonCompliant: [] };
    const now = Date.now();
    const threshold = now + TWO_WEEKS_MS;

    const bad: NonCompliantClass[] = [];

    classes.forEach((c) => {
      const classPlans = lessonPlans
        .filter((p) => p.classId === c.id)
        .sort(
          (a, b) =>
            new Date(b.scheduledDate).getTime() -
            new Date(a.scheduledDate).getTime(),
        );

      const latest = classPlans[0];

      if (!latest) {
        bad.push({
          id: c.id,
          name: c.name,
          schoolName: c.schoolName,
          teacherName: c.teacherName,
          latestDate: null,
          daysLeft: -1,
        });
        return;
      }

      const latestMs = new Date(latest.scheduledDate).getTime();
      const daysLeft = Math.ceil((latestMs - now) / (24 * 60 * 60 * 1000));

      if (latestMs < threshold) {
        bad.push({
          id: c.id,
          name: c.name,
          schoolName: c.schoolName,
          teacherName: c.teacherName,
          latestDate: latest.scheduledDate,
          daysLeft,
        });
      }
    });

    bad.sort((a, b) => a.daysLeft - b.daysLeft);
    return { nonCompliant: bad };
  }, [classes, lessonPlans]);

  const isLoading = classesLoading || plansLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="text-destructive size-4" />
          Kepatuhan Lesson Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : nonCompliant.length === 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="text-emerald-500 size-4" />
            <span>
              Semua kelas aman — lesson plan tersedia minimal 2 minggu ke
              depan.
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              {nonCompliant.length} dari {classes?.length ?? 0} kelas{" "}
              perlu lesson plan segera:
            </p>
            <div className="divide-y rounded-lg border">
              {nonCompliant.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {c.schoolName} · {c.teacherName}
                    </p>
                  </div>
                  <Badge
                    variant={
                      c.latestDate === null ? "destructive" : "secondary"
                    }
                    className="ml-2 shrink-0"
                  >
                    {c.latestDate === null
                      ? "Belum ada"
                      : c.daysLeft < 0
                        ? `${Math.abs(c.daysLeft)} hari terlambat`
                        : `${c.daysLeft} hari tersisa`}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
