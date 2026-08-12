"use client";

import Link from "next/link";
import { Clock, MapPin, NotebookPen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModuleCoverBanner } from "@/components/shared/module-cover";
import { useMyClasses } from "@/features/classes/use-my-classes";
import { formatScheduleSlots } from "@/features/classes/schema";
import { getCurriculumTheme } from "@/lib/curriculum-theme";

export default function KelasPage() {
  const { data: classes, isLoading } = useMyClasses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Kelas Saya</h1>
        <p className="text-muted-foreground text-sm">
          Jadwal dan modul acuan untuk setiap kelasmu
        </p>
      </div>

      {isLoading && (
        <p className="text-muted-foreground text-sm">Memuat kelas...</p>
      )}

      {!isLoading && (!classes || classes.length === 0) && (
        <p className="text-muted-foreground text-sm">
          Belum ada kelas yang ditugaskan ke Anda.
        </p>
      )}

      {classes?.map((c) => {
        const theme = getCurriculumTheme(c.module?.curriculumName ?? c.name);
        return (
          <Card key={c.id} className="overflow-hidden rounded-2xl py-0 shadow-sm">
            <div className={cn("h-1.5 w-full", theme.bar)} />
            <CardContent className="space-y-4 pt-4 pb-4">
              <div>
                <p className="text-base font-bold">{c.name}</p>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span>{c.schoolName}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatScheduleSlots(c.scheduleSlots)}
                  </span>
                  {c.room && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {c.room}
                    </span>
                  )}
                </div>
              </div>

              <ModuleCoverBanner module={c.module} />

              {c.isPrimary && (
                <Link
                  href="/lesson-plan/new"
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full")}
                >
                  <NotebookPen className="size-4" />
                  Buat Lesson Plan
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
