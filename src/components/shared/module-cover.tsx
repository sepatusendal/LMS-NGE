import { BookOpen, ExternalLink } from "lucide-react";
import { getCurriculumTheme } from "@/lib/curriculum-theme";
import type { ClassModule } from "@/features/classes/use-my-classes";

/** Small, prominent colored pill — used wherever a module link previously
 * sat as plain text (lesson-plan list header) so it actually stands out
 * instead of blending into the surrounding metadata. */
export function ModuleBadge({ module }: { module: ClassModule }) {
  const theme = getCurriculumTheme(module.curriculumName);
  return (
    <a
      href={`https://drive.google.com/file/d/${module.driveFileId}/view`}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full ${theme.soft} ${theme.text} ring-1 ${theme.ring} px-2.5 py-1 text-xs font-semibold transition-transform hover:scale-[1.03]`}
    >
      <BookOpen className="size-3.5" />
      Modul {module.curriculumName}
    </a>
  );
}

/** Full "cover" banner for a class's module — a colorful gradient card
 * (themed per program) standing in for an actual PDF cover thumbnail, which
 * Google Drive doesn't reliably generate for large program PDFs. Meant to
 * be immediately recognizable at a glance for teachers who'd rather not
 * parse text. */
export function ModuleCoverBanner({ module }: { module: ClassModule | null }) {
  if (!module) {
    return (
      <div className="border-border/60 bg-muted/30 flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3.5">
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
          <BookOpen className="text-muted-foreground size-5" />
        </div>
        <p className="text-muted-foreground text-sm">
          Belum ada modul acuan untuk kelas ini.
        </p>
      </div>
    );
  }

  const theme = getCurriculumTheme(module.curriculumName);

  return (
    <a
      href={`https://drive.google.com/file/d/${module.driveFileId}/view`}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br ${theme.gradient} px-5 py-4 text-white shadow-sm transition-transform hover:scale-[1.01] active:scale-[0.99]`}
    >
      <div className="pointer-events-none absolute -top-6 -right-6 size-24 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-8 right-10 size-16 rounded-full bg-white/10" />
      <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <BookOpen className="size-6" />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="text-xs font-medium text-white/80">Modul Pembelajaran</p>
        <p className="truncate text-base font-bold">{module.curriculumName}</p>
        <p className="truncate text-xs text-white/75">{module.fileName}</p>
      </div>
      <ExternalLink className="relative size-4 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}
