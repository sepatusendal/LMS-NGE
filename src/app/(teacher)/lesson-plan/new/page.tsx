import Link from "next/link";
import { NotebookPen } from "lucide-react";
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
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <NotebookPen className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Tambah Lesson Plan</h1>
          <p className="text-muted-foreground text-sm">
            Isi setiap bagian untuk menyiapkan rencana pertemuan.
          </p>
        </div>
      </div>
      <LessonPlanForm />
    </div>
  );
}
