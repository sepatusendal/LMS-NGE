"use client";

import { useMemo } from "react";
import { ComplianceAlert } from "@/features/lesson-plans/compliance-alert";
import { TodayTeachersPanel } from "@/features/substitutes/today-teachers-panel";
import { StatusBoard } from "@/features/monitoring/status-board";
import { AnalyticsCharts } from "@/features/monitoring/analytics-charts";
import { OverviewStats } from "@/features/dashboard/overview-stats";
import { TeacherAttendanceTable } from "@/features/dashboard/teacher-attendance-table";
import { ReportStatsPanel } from "@/features/dashboard/report-stats-panel";
import { ScheduleChart } from "@/features/dashboard/schedule-chart";
import { FollowUpsTable } from "@/features/dashboard/followups-table";
import { ReportNotesTable } from "@/features/dashboard/report-notes-table";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { getTimeGreeting } from "@/lib/greeting";
import { TimeOfDayIllustration } from "@/components/shared/time-of-day-illustration";
import { cn } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data: user } = useCurrentUser();
  const now = useMemo(() => new Date(), []);
  const greeting = useMemo(() => getTimeGreeting(now.getHours()), [now]);
  const firstName = user?.fullName?.split(" ")[0] ?? "";

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [now],
  );

  return (
    <div className="space-y-6">
      <DashboardHero
        greeting={greeting}
        firstName={firstName}
        dateLabel={dateLabel}
        hour={now.getHours()}
      />

      <OverviewStats />

      <TodayTeachersPanel />

      <StatusBoard />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportStatsPanel />
        <ScheduleChart />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TeacherAttendanceTable />
        <ComplianceAlert />
      </div>

      <AnalyticsCharts />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportNotesTable />
        <FollowUpsTable />
      </div>
    </div>
  );
}

function DashboardHero({
  greeting,
  firstName,
  dateLabel,
  hour,
}: {
  greeting: { text: string; emoji: string };
  firstName: string;
  dateLabel: string;
  hour: number;
}) {
  const isNight = hour >= 18 || hour < 4;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl px-5 py-6 text-white shadow-[0_16px_40px_-16px_rgba(75,96,172,0.5)] sm:px-7 sm:py-7",
        isNight
          ? "bg-gradient-to-br from-[#2a3466] via-[#3a4585] to-[#4b60ac]"
          : "bg-gradient-to-br from-[#4b60ac] via-[#5468b8] to-[#6b83c9]",
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg className="absolute -top-10 -right-10 size-48 opacity-25 sm:size-56" viewBox="0 0 200 200">
          <path
            fill="#ffffff"
            d="M45.3,-58.6C58.5,-49.9,68.6,-35.5,72.8,-19.5C77,-3.5,75.3,14.1,68.1,29.3C60.9,44.5,48.2,57.3,33.2,64.8C18.2,72.3,0.9,74.5,-16.9,71.8C-34.7,69.1,-53,61.5,-64.5,47.9C-76,34.3,-80.7,14.7,-78.4,-3.6C-76.1,-21.9,-66.8,-38.9,-53.2,-47.9C-39.6,-56.9,-21.7,-57.9,-3.3,-54.1C15.1,-50.3,32.1,-67.3,45.3,-58.6Z"
            transform="translate(100 100)"
          />
        </svg>
        <svg className="absolute -bottom-16 left-1/3 size-56 opacity-15" viewBox="0 0 200 200">
          <path
            fill="#f15c5d"
            d="M39.6,-51.2C52.6,-43.5,65.4,-33.4,70.8,-19.9C76.2,-6.5,74.2,10.3,66.9,24.2C59.6,38.1,47,49.1,32.7,57.2C18.4,65.3,2.4,70.5,-13.9,68.9C-30.2,67.3,-46.8,58.9,-58.4,45.6C-70,32.3,-76.6,14.1,-75.8,-3.7C-75,-21.5,-66.8,-38.9,-53.9,-46.9C-41,-54.9,-23.4,-53.5,-6.9,-45.7C9.6,-37.9,26.6,-58.9,39.6,-51.2Z"
            transform="translate(100 100)"
          />
        </svg>
      </div>

      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">
            {greeting.text}
            {firstName ? `, ${firstName}` : ""} {greeting.emoji}
          </p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Admin Dashboard</h1>
          <p className="mt-0.5 text-xs text-white/70 sm:text-sm">
            Ringkasan operasional NUFA Global Education — {dateLabel}
          </p>
        </div>

        <TimeOfDayIllustration hour={hour} className="hidden h-24 w-24 shrink-0 sm:block" />
      </div>
    </div>
  );
}
