"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarCheck, ClipboardCheck, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProgressBar, getThresholdColor } from "@/components/shared/progress-bar";
import { useClasses } from "@/features/classes/use-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";
import { useStudents } from "@/features/students/use-students";
import { computeComplianceRate } from "@/features/lesson-plans/compliance";
import { buildDayLabelsSundayFirst } from "@/features/classes/schema";
import { formatRupiah } from "@/lib/currency";

function SidebarCard({
  icon: Icon,
  iconColor,
  title,
  children,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4" style={{ color: iconColor }} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

/** Estimasi pendapatan bulanan = siswa aktif × harga per siswa (wireframe
 * "Earning" card pada kolom samping). */
export function RevenueCard() {
  const t = useTranslations("admin.dashboard");
  const { data: students, isError } = useStudents();
  const [pricePerStudent, setPricePerStudent] = useState(300000);

  const activeStudents = students?.filter((s) => s.isActive).length ?? 0;
  const estimatedRevenue = activeStudents * pricePerStudent;

  if (isError) {
    return (
      <SidebarCard icon={Wallet} iconColor="var(--primary)" title={t("estimatedRevenue")}>
        <p className="text-destructive flex items-center gap-1.5 text-xs font-medium">
          <AlertCircle className="size-3.5" />
          {t("failedToLoadStudents")}
        </p>
      </SidebarCard>
    );
  }

  return (
    <SidebarCard icon={Wallet} iconColor="var(--primary)" title={t("estimatedRevenue")}>
      <div>
        <p className="text-2xl font-bold leading-none tracking-tight">{formatRupiah(estimatedRevenue)}</p>
        <p className="text-muted-foreground mt-1 text-xs">{t("perMonthFromActiveStudents", { count: activeStudents })}</p>
      </div>
      <div className="flex items-center gap-1">
        <Label htmlFor="revenue-per-student" className="sr-only">
          {t("pricePerStudentPerMonth")}
        </Label>
        <span className="text-muted-foreground text-[11px]">Rp</span>
        <Input
          id="revenue-per-student"
          type="number"
          value={pricePerStudent}
          onChange={(e) => setPricePerStudent(Number(e.target.value) || 0)}
          className="h-6 w-24 text-[11px]"
        />
        <span className="text-muted-foreground text-[11px]">{t("perStudentPerMonthShort")}</span>
      </div>
      <p className="text-muted-foreground/70 text-[10px]">{t("localCalculatorHint")}</p>
    </SidebarCard>
  );
}

/** Ringkasan operasional hari ini (wireframe "Orders" card): kelas aktif hari
 * ini + persentase kepatuhan lesson plan. Owns the "kelas hari ini" metric —
 * `OverviewStats` no longer duplicates it. */
export function TodayCard() {
  const t = useTranslations("admin.dashboard");
  const tDay = useTranslations("jadwal.day");
  const dayLabelsSundayFirst = useMemo(() => buildDayLabelsSundayFirst(tDay), [tDay]);
  const { data: classes, isError: classesError } = useClasses();
  const { data: lessonPlans, isError: lessonPlansError } = useLessonPlans();
  const isError = classesError || lessonPlansError;

  // Deferred to client-only, same as `schedule-chart.tsx`'s `today`: reading
  // the viewer's local clock during SSR can genuinely produce the wrong
  // weekday in the server-rendered HTML, not just a one-time console warning.
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(new Date().getDay()), []);

  const todayClasses =
    today === null ? null : classes?.filter((c) => c.isActive && c.scheduleDaysOfWeek.includes(today)).length ?? 0;

  const complianceRate = useMemo(() => {
    if (!classes || !lessonPlans) return null;
    return computeComplianceRate(
      classes.map((c) => c.id),
      lessonPlans,
    );
  }, [classes, lessonPlans]);

  if (isError) {
    return (
      <SidebarCard icon={CalendarCheck} iconColor="var(--chart-4)" title={t("today")}>
        <p className="text-destructive flex items-center gap-1.5 text-xs font-medium">
          <AlertCircle className="size-3.5" />
          {t("failedToLoad")}
        </p>
      </SidebarCard>
    );
  }

  return (
    <SidebarCard icon={CalendarCheck} iconColor="var(--chart-4)" title={t("today")}>
      <div>
        <p className="text-2xl font-bold leading-none tracking-tight">{todayClasses ?? "-"}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {t("activeClassesOn", { day: today === null ? "-" : dayLabelsSundayFirst[today] })}
        </p>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1">
            <ClipboardCheck className="size-3.5" />
            {t("lessonPlanCompliance")}
          </span>
          <span className="font-semibold">{complianceRate === null ? "-" : `${complianceRate}%`}</span>
        </div>
        <div className="mt-1.5">
          <ProgressBar
            value={complianceRate ?? 0}
            color={getThresholdColor(complianceRate ?? 0, 50)}
          />
        </div>
        <p className="text-muted-foreground/70 mt-1 text-[10px]">{t("minTwoWeeksAhead")}</p>
      </div>
    </SidebarCard>
  );
}
