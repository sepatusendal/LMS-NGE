"use client";

import { Building2, Users, GraduationCap, BookOpen, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProgressBar } from "@/components/shared/progress-bar";
import { useSchools } from "@/features/schools/use-schools";
import { useStudents } from "@/features/students/use-students";
import { useTeachers } from "@/features/teachers/use-teachers";
import { useClasses } from "@/features/classes/use-classes";

function StatBlock({
  icon: Icon,
  label,
  value,
  sub,
  progress,
  color,
  isError,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  progress?: number;
  color: string;
  isError?: boolean;
}) {
  const t = useTranslations("admin.dashboard");
  return (
    <div
      className="relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 10%, var(--card)) 0%, var(--card) 60%)`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-[11px] font-medium">{label}</p>
          {isError ? (
            <p className="text-destructive mt-1 flex items-center gap-1 text-xs font-medium">
              <AlertCircle className="size-3.5" />
              {t("failedToLoad")}
            </p>
          ) : (
            <p className="mt-1 text-2xl font-bold leading-none tracking-tight">{value}</p>
          )}
        </div>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` }}
        >
          <Icon className="size-4.5" style={{ color }} />
        </span>
      </div>
      {!isError && (
        <div className="mt-3">
          {progress != null && <ProgressBar value={progress} color={color} />}
          {sub && <p className="text-muted-foreground mt-1.5 text-[11px]">{sub}</p>}
        </div>
      )}
    </div>
  );
}

/** Empat KPI inti operasional (wireframe "KPI Metrics Row"): jumlah entitas
 * aktif — sekolah, siswa, teacher, kelas. Metrik turunan (kelas hari ini,
 * kepatuhan lesson plan, estimasi pendapatan) dipindah ke `overview-sidebar`. */
export function OverviewStats() {
  const t = useTranslations("admin.dashboard");
  const { data: schools, isError: schoolsError } = useSchools();
  // Excludes teacher-training trainees (scripts/seed-teacher-training.ts) —
  // they live in the `students` table too, but aren't real K-12 students and
  // would otherwise inflate this headcount.
  const { data: students, isError: studentsError } = useStudents(undefined, { excludeTeacherTraining: true });
  const { data: teachers, isError: teachersError } = useTeachers();
  const { data: classes, isError: classesError } = useClasses();

  const activeSchools = schools?.filter((s) => s.isActive).length ?? 0;
  const activeStudents = students?.filter((s) => s.isActive).length ?? 0;
  const activeTeachers = teachers?.filter((t) => t.isActive).length ?? 0;
  // Kartu ini fokus ke kelas siswa (REGULAR); kelas guru & staff dihitung terpisah
  // biar angka "Kelas Aktif" gak nyampur dua populasi yang beda.
  const regularClasses = classes?.filter((c) => c.classType === "REGULAR") ?? [];
  const activeClasses = regularClasses.filter((c) => c.isActive).length;
  const activeTeacherTrainingClasses =
    classes?.filter((c) => c.classType === "TEACHER_TRAINING" && c.isActive).length ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatBlock
        icon={Building2}
        label={t("activeSchools")}
        value={String(activeSchools)}
        sub={t("ofTotalSchools", { active: activeSchools, total: schools?.length ?? 0 })}
        progress={schools?.length ? (activeSchools / schools.length) * 100 : 0}
        color="var(--chart-1)"
        isError={schoolsError}
      />
      <StatBlock
        icon={Users}
        label={t("activeStudents")}
        value={String(activeStudents)}
        sub={t("ofTotalStudents", { active: activeStudents, total: students?.length ?? 0 })}
        progress={students?.length ? (activeStudents / students.length) * 100 : 0}
        color="var(--chart-3)"
        isError={studentsError}
      />
      <StatBlock
        icon={GraduationCap}
        label={t("activeTeachers")}
        value={String(activeTeachers)}
        sub={t("ofTotalTeachers", { active: activeTeachers, total: teachers?.length ?? 0 })}
        progress={teachers?.length ? (activeTeachers / teachers.length) * 100 : 0}
        color="var(--chart-5)"
        isError={teachersError}
      />
      <StatBlock
        icon={BookOpen}
        label={t("activeStudentClasses")}
        value={String(activeClasses)}
        sub={t("ofTotalClasses", { active: activeClasses, total: regularClasses.length, training: activeTeacherTrainingClasses })}
        progress={regularClasses.length ? (activeClasses / regularClasses.length) * 100 : 0}
        color="var(--chart-2)"
        isError={classesError}
      />
    </div>
  );
}
