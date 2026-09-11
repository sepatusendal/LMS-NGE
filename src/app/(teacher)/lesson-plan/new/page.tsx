"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";
import { LessonPlanForm } from "@/features/lesson-plans/lesson-plan-form";
import { useCurrentUser } from "@/features/auth/use-current-user";

export default function NewLessonPlanPage() {
  return (
    <Suspense fallback={null}>
      <NewLessonPlanPageInner />
    </Suspense>
  );
}

function NewLessonPlanPageInner() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const t = useTranslations("lessonPlanForm");
  // Pre-selects the class when arriving from a specific class's card (e.g.
  // Absensi's "Buat Lesson Plan" CTA) so a teacher juggling several classes
  // can't accidentally author the plan under the wrong one.
  const defaultClassId = useSearchParams().get("classId") ?? undefined;

  return (
    <div className="space-y-4">
      <Link
        href={isAdmin ? "/lesson-plans" : "/lesson-plan"}
        className="text-muted-foreground text-sm hover:underline"
      >
        {t("backToLessonPlan")}
      </Link>
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <NotebookPen className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{t("addTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("addSubtitle")}</p>
        </div>
      </div>
      <LessonPlanForm adminMode={isAdmin} defaultClassId={defaultClassId} />
    </div>
  );
}
