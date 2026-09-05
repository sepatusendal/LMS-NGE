"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseLocalDate } from "@/lib/date";
import { useMonitoringAnalytics } from "./use-monitoring";

function latestValue(points: (number | null)[]): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i] !== null) return points[i];
  }
  return null;
}

export function AnalyticsCharts() {
  const t = useTranslations("admin.analyticsCharts");
  const locale = useLocale();
  const { data, isLoading } = useMonitoringAnalytics(14);

  const formatDateLabel = (dateStr: string) =>
    parseLocalDate(dateStr).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" });

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          {t("loadingAnalytics")}
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    date: formatDateLabel(d.date),
    "Attendance Rate": d.attendanceTotal > 0 ? d.attendanceRate : null,
    "Completion Rate": d.scheduledCount > 0 ? d.completionRate : null,
  }));

  const attendanceLatest = latestValue(chartData.map((d) => d["Attendance Rate"]));
  const completionLatest = latestValue(chartData.map((d) => d["Completion Rate"]));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">{t("studentAttendanceRate", { days: 14 })}</CardTitle>
          {attendanceLatest !== null && (
            <span className="text-lg font-semibold" style={{ color: "var(--chart-1)" }}>
              {attendanceLatest}%
            </span>
          )}
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                formatter={(v: unknown) => (v === null || v === undefined ? "-" : `${v}%`)}
                cursor={{ stroke: "var(--primary)", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="Attendance Rate"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm">{t("teachingCompletionRate", { days: 14 })}</CardTitle>
          {completionLatest !== null && (
            <span className="text-lg font-semibold" style={{ color: "var(--chart-3)" }}>
              {completionLatest}%
            </span>
          )}
        </CardHeader>
        <CardContent className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip
                formatter={(v: unknown) => (v === null || v === undefined ? "-" : `${v}%`)}
                cursor={{ stroke: "var(--primary)", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="Completion Rate"
                stroke="var(--chart-3)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
