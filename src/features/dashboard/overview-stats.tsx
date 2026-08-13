"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSchools } from "@/features/schools/use-schools";
import { useStudents } from "@/features/students/use-students";
import { useTeachers } from "@/features/teachers/use-teachers";
import { useClasses } from "@/features/classes/use-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";
import { formatRupiah } from "@/lib/currency";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function StatBlock({
  icon: Icon,
  label,
  value,
  sub,
  progress,
  subSuppressHydrationWarning,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  progress?: number;
  subSuppressHydrationWarning?: boolean;
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
        {progress != null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color }}
            />
          </div>
        )}
        {sub && (
          <p
            className="text-muted-foreground mt-1.5 text-[11px]"
            suppressHydrationWarning={subSuppressHydrationWarning}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export function OverviewStats() {
  const { data: schools } = useSchools();
  const { data: students } = useStudents();
  const { data: teachers } = useTeachers();
  const { data: classes } = useClasses();
  const { data: lessonPlans } = useLessonPlans();
  const [pricePerStudent, setPricePerStudent] = useState(300000);

  const today = new Date().getDay();

  const activeSchools = schools?.filter((s) => s.isActive).length ?? 0;
  const activeStudents = students?.filter((s) => s.isActive).length ?? 0;
  const activeTeachers = teachers?.filter((t) => t.isActive).length ?? 0;
  const activeClasses = classes?.filter((c) => c.isActive).length ?? 0;
  const todayClasses = classes?.filter((c) => c.isActive && c.scheduleDaysOfWeek.includes(today)).length ?? 0;

  const complianceRate = useMemo(() => {
    if (!classes || !lessonPlans || classes.length === 0) return null;
    const now = Date.now();
    const threshold = now + TWO_WEEKS_MS;
    const compliant = classes.filter((c) => {
      // Compliant means continuous ~2-week-ahead coverage, not just a
      // distant latest plan: sort this class's plans ascending and make
      // sure there's no gap between consecutive dates larger than the
      // 2-week cadence, and that coverage reaches at least 2 weeks out.
      const futurePlans = lessonPlans
        .filter((p) => p.classId === c.id && new Date(p.scheduledDate).getTime() >= now)
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
      if (futurePlans.length === 0) return false;

      const latest = futurePlans[futurePlans.length - 1];
      const reachesHorizon = new Date(latest.scheduledDate).getTime() >= threshold;
      if (!reachesHorizon) return false;

      let previousTime = now;
      for (const plan of futurePlans) {
        const planTime = new Date(plan.scheduledDate).getTime();
        if (planTime - previousTime > TWO_WEEKS_MS) return false;
        previousTime = planTime;
      }
      return true;
    }).length;
    return Math.round((compliant / classes.length) * 100);
  }, [classes, lessonPlans]);

  const estimatedRevenue = activeStudents * pricePerStudent;

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
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
          label="Kelas Aktif"
          value={String(activeClasses)}
          sub={`${activeClasses} dari ${classes?.length ?? 0} kelas`}
          progress={classes?.length ? (activeClasses / classes.length) * 100 : 0}
          color="var(--chart-2)"
        />
        <StatBlock
          icon={CalendarCheck}
          label="Kelas Hari Ini"
          value={String(todayClasses)}
          sub={new Date().toLocaleDateString("id-ID", { weekday: "long" })}
          // Reads the viewer's local clock, which can legitimately differ
          // from the server's at render time (e.g. near the UTC-midnight/
          // WIB-7am boundary) — suppress the one-time hydration warning for
          // this text node rather than deferring the whole component to a
          // client-only render pass.
          subSuppressHydrationWarning
          color="var(--chart-4)"
        />
        <StatBlock
          icon={ClipboardCheck}
          label="Kepatuhan Lesson Plan"
          value={complianceRate === null ? "-" : `${complianceRate}%`}
          sub="min. 2 minggu ke depan"
          progress={complianceRate ?? 0}
          color={complianceRate !== null && complianceRate < 50 ? "var(--status-critical)" : "var(--status-good)"}
        />
      </div>

      <Card className="bg-primary/[0.04] border-primary/20">
        <CardContent className="flex items-center gap-3 py-3.5">
          <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Wallet className="text-primary size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-semibold leading-tight whitespace-nowrap">
              {formatRupiah(estimatedRevenue)}
            </p>
            <p className="text-muted-foreground text-[11px] whitespace-nowrap">
              Estimasi Pendapatan / Bulan
            </p>
            <div className="mt-1.5 flex items-center gap-1">
              <span className="text-muted-foreground text-[11px]">Rp</span>
              <Input
                id="revenue-per-student"
                type="number"
                value={pricePerStudent}
                onChange={(e) => setPricePerStudent(Number(e.target.value) || 0)}
                className="h-6 w-24 text-[11px]"
              />
              <span className="text-muted-foreground text-[11px]">/siswa/bln</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
