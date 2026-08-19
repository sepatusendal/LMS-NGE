"use client";

import { Building2, Users, GraduationCap, BookOpen } from "lucide-react";
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
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  progress?: number;
  color: string;
}) {
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
          <p className="mt-1 text-2xl font-bold leading-none tracking-tight">{value}</p>
        </div>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` }}
        >
          <Icon className="size-4.5" style={{ color }} />
        </span>
      </div>
      <div className="mt-3">
        {progress != null && <ProgressBar value={progress} color={color} />}
        {sub && <p className="text-muted-foreground mt-1.5 text-[11px]">{sub}</p>}
      </div>
    </div>
  );
}

/** Empat KPI inti operasional (wireframe "KPI Metrics Row"): jumlah entitas
 * aktif — sekolah, siswa, teacher, kelas. Metrik turunan (kelas hari ini,
 * kepatuhan lesson plan, estimasi pendapatan) dipindah ke `overview-sidebar`. */
export function OverviewStats() {
  const { data: schools } = useSchools();
  const { data: students } = useStudents();
  const { data: teachers } = useTeachers();
  const { data: classes } = useClasses();

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
        label="Sekolah Aktif"
        value={String(activeSchools)}
        sub={`${activeSchools} dari ${schools?.length ?? 0} sekolah`}
        progress={schools?.length ? (activeSchools / schools.length) * 100 : 0}
        color="var(--chart-1)"
      />
      <StatBlock
        icon={Users}
        label="Siswa Aktif"
        value={String(activeStudents)}
        sub={`${activeStudents} dari ${students?.length ?? 0} siswa`}
        progress={students?.length ? (activeStudents / students.length) * 100 : 0}
        color="var(--chart-3)"
      />
      <StatBlock
        icon={GraduationCap}
        label="Teacher Aktif"
        value={String(activeTeachers)}
        sub={`${activeTeachers} dari ${teachers?.length ?? 0} teacher`}
        progress={teachers?.length ? (activeTeachers / teachers.length) * 100 : 0}
        color="var(--chart-5)"
      />
      <StatBlock
        icon={BookOpen}
        label="Kelas Siswa Aktif"
        value={String(activeClasses)}
        sub={`${activeClasses} dari ${regularClasses.length} kelas · ${activeTeacherTrainingClasses} kelas guru & staff`}
        progress={regularClasses.length ? (activeClasses / regularClasses.length) * 100 : 0}
        color="var(--chart-2)"
      />
    </div>
  );
}
