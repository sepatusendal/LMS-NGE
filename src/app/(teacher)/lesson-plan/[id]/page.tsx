"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, NotebookPen } from "lucide-react";
import { LessonPlanForm } from "@/features/lesson-plans/lesson-plan-form";
import { useLessonPlan } from "@/features/lesson-plans/use-lesson-plans";
import { useMyClasses } from "@/features/classes/use-my-classes";
import { LoadingState } from "@/components/shared/loading-state";

export default function EditLessonPlanPage() {
  const params = useParams<{ id: string }>();
  const { data: lessonPlan, isLoading, isError, error } = useLessonPlan(params.id);
  const { data: myClasses } = useMyClasses();

  const isOwner = useMemo(
    () =>
      lessonPlan && myClasses
        ? myClasses.some((c) => c.isPrimary && c.id === lessonPlan.classId)
        : false,
    [lessonPlan, myClasses],
  );

  return (
    <div className="space-y-4">
      <Link
        href="/lesson-plan"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Kembali ke Lesson Plan
      </Link>
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <NotebookPen className="size-5" />
        </div>
        <h1 className="text-xl font-semibold">
          {isOwner ? "Edit Lesson Plan" : "Lihat Lesson Plan"}
        </h1>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="bg-destructive/10 mb-3 flex size-12 items-center justify-center rounded-full">
            <AlertCircle className="text-destructive size-5" />
          </div>
          <p className="text-sm font-medium">Gagal memuat lesson plan</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {error?.message || "Coba refresh halaman."}
          </p>
        </div>
      ) : isLoading || !lessonPlan ? (
        <LoadingState />
      ) : (
        <LessonPlanForm lessonPlan={lessonPlan} readOnly={!isOwner} />
      )}
    </div>
  );
}
