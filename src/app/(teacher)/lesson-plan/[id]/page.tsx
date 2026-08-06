"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LessonPlanForm } from "@/features/lesson-plans/lesson-plan-form";
import { useLessonPlan } from "@/features/lesson-plans/use-lesson-plans";
import { useMyClasses } from "@/features/classes/use-my-classes";

export default function EditLessonPlanPage() {
  const params = useParams<{ id: string }>();
  const { data: lessonPlan, isLoading } = useLessonPlan(params.id);
  const { data: myClasses } = useMyClasses();

  const isOwner = useMemo(
    () =>
      lessonPlan && myClasses
        ? myClasses.some((c) => c.id === lessonPlan.classId)
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
      <h1 className="text-xl font-semibold">
        {isOwner ? "Edit Lesson Plan" : "Lihat Lesson Plan"}
      </h1>
      {isLoading || !lessonPlan ? (
        <p className="text-muted-foreground text-sm">Memuat data...</p>
      ) : (
        <LessonPlanForm lessonPlan={lessonPlan} readOnly={!isOwner} />
      )}
    </div>
  );
}
