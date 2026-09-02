"use client";

import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { useTranslations } from "next-intl";
import { LessonPlanForm } from "@/features/lesson-plans/lesson-plan-form";
import { useCurrentUser } from "@/features/auth/use-current-user";

export default function NewLessonPlanPage() {
  const { data: currentUser } = useCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";
  const t = useTranslations("lessonPlanForm");

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
      <LessonPlanForm adminMode={isAdmin} />
    </div>
  );
}
