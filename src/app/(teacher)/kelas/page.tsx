"use client";

import Link from "next/link";
import { Clock, MapPin, NotebookPen, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ModuleCoverBanner } from "@/components/shared/module-cover";
import { ClassAvatar } from "@/components/shared/class-avatar";
import { LoadingState } from "@/components/shared/loading-state";
import { useMyClasses } from "@/features/classes/use-my-classes";
import { formatScheduleSlots } from "@/features/classes/schema";

export default function KelasPage() {
  const { data: classes, isLoading } = useMyClasses();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Kelas Saya</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Jadwal dan modul acuan untuk setiap kelasmu
        </p>
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && (!classes || classes.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
          <Users className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">
            Belum ada kelas yang ditugaskan ke Anda.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {classes?.map((c) => {
          const themeKey = c.module?.curriculumName ?? c.name;
          return (
            <div
              key={c.id}
              className="space-y-4 rounded-3xl border border-black/5 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(20,25,50,0.08)] sm:p-5"
            >
              <div className="flex items-start gap-3.5">
                <ClassAvatar name={c.name} themeKey={themeKey} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-lg leading-tight font-bold">{c.name}</p>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
