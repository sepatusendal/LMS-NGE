import Link from "next/link";
import { LessonPlanForm } from "@/features/lesson-plans/lesson-plan-form";

export default function NewLessonPlanPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/lesson-plan"
        className="text-muted-foreground text-sm hover:underline"
      >
        ← Kembali ke Lesson Plan
      </Link>
      <h1 className="text-xl font-semibold">Tambah Lesson Plan</h1>
      <LessonPlanForm />
    </div>
  );
}
