import { ComplianceAlert } from "@/features/lesson-plans/compliance-alert";
import { StatusBoard } from "@/features/monitoring/status-board";
import { AnalyticsCharts } from "@/features/monitoring/analytics-charts";
import { OverviewStats } from "@/features/dashboard/overview-stats";
import { TeacherAttendanceTable } from "@/features/dashboard/teacher-attendance-table";
import { ReportStatsPanel } from "@/features/dashboard/report-stats-panel";
import { ScheduleChart } from "@/features/dashboard/schedule-chart";
import { FollowUpsTable } from "@/features/dashboard/followups-table";
import { ReportNotesTable } from "@/features/dashboard/report-notes-table";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">NGE English Course — laporan operasional.</p>
      </div>

      <OverviewStats />

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
