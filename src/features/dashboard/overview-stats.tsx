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
  subSuppressHydrationWarning,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  subSuppressHydrationWarning?: boolean;
  color: string;
}) {
  return (
    <div className="bg-card flex min-h-[5.75rem] flex-col justify-between gap-2 p-4">
      <div className="flex items-center gap-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)` }}
        >
          <Icon className="size-4.5" style={{ color }} />
        </div>
        <p className="text-xl font-semibold leading-tight">{value}</p>
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground line-clamp-2 text-[11px] leading-tight">{label}</p>
        {sub && (
          <p
            className="text-muted-foreground/70 mt-0.5 text-[10px] leading-tight"
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
  const [targetMonthly, setTargetMonthly] = useState(150_000_000);

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

  // Pertumbuhan basis siswa aktif vs bulan lalu (baseline = aktif sebelum bulan ini).
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const lastMonthActive =
    students?.filter((s) => s.isActive && new Date(s.createdAt) < firstOfMonth).length ?? 0;
  const deltaPct = lastMonthActive > 0 ? Math.round(((activeStudents - lastMonthActive) / lastMonthActive) * 100) : 0;
  const targetPct = targetMonthly > 0 ? Math.round((estimatedRevenue / targetMonthly) * 100) : 0;

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
      <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-xl border sm:grid-cols-3 xl:grid-cols-6">
        <StatBlock icon={Building2} label="Sekolah Aktif" value={String(activeSchools)} sub={`Dari ${schools?.length ?? 0} sekolah`} color="var(--chart-1)" />
        <StatBlock icon={Users} label="Siswa Aktif" value={String(activeStudents)} sub={`Dari ${students?.length ?? 0} siswa`} color="var(--chart-3)" />
        <StatBlock icon={GraduationCap} label="Teacher Aktif" value={String(activeTeachers)} sub={`Dari ${teachers?.length ?? 0} teacher`} color="var(--chart-5)" />
        <StatBlock icon={BookOpen} label="Kelas Aktif" value={String(activeClasses)} sub={`Dari ${classes?.length ?? 0} kelas`} color="var(--chart-2)" />
        <StatBlock
          icon={CalendarCheck}
          label="Kelas Hari Ini"
          value={String(todayClasses)}
          sub="Jadwal hari ini"
          color="var(--chart-4)"
        />
        <StatBlock
          icon={ClipboardCheck}
          label="Kepatuhan Lesson Plan"
          value={complianceRate === null ? "-" : `${complianceRate}%`}
          sub="min. 2 minggu ke depan"
          color={complianceRate !== null && complianceRate < 50 ? "var(--status-critical)" : "var(--status-good)"}
        />
      </div>

      <Card className="bg-primary/[0.04] border-primary/20">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
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
              </div>
            </div>
            <span
              className="mt-0.5 shrink-0 text-[11px] font-medium"
              style={{ color: deltaPct >= 0 ? "var(--status-good)" : "var(--status-critical)" }}
              suppressHydrationWarning
            >
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct}% dari bulan lalu
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Target Bulanan</span>
              <span className="text-muted-foreground">{targetPct}%</span>
            </div>
            <div className="bg-primary/10 mt-1.5 h-1.5 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${Math.min(targetPct, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-[11px]">Rp</span>
            <Input
              id="revenue-per-student"
              type="number"
              value={pricePerStudent}
              onChange={(e) => setPricePerStudent(Number(e.target.value) || 0)}
              className="h-6 w-24 text-[11px]"
            />
            <span className="text-muted-foreground text-[11px]">/siswa/bln</span>
            <span className="text-muted-foreground ml-2 text-[11px]">Target</span>
            <Input
              id="target-monthly"
              type="number"
              value={targetMonthly}
              onChange={(e) => setTargetMonthly(Number(e.target.value) || 0)}
              className="h-6 w-28 text-[11px]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
