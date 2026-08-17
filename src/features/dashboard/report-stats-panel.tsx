"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, Minus, NotebookText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReportStats } from "./use-dashboard";

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  const pct = previous === 0 ? 100 : Math.round((diff / previous) * 100);
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const color = diff > 0 ? "text-[var(--status-good)]" : diff < 0 ? "text-[var(--status-critical)]" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${color}`}>
      <Icon className="size-3" />
      {diff === 0 ? "sama" : `${pct > 0 ? "+" : ""}${pct}%`}
    </span>
  );
}

function formatDateLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

const OBJECTIVES_COLOR: Record<string, string> = {
  Tercapai: "var(--status-good)",
  Sebagian: "var(--status-warning)",
  Belum: "var(--status-critical)",
};

export function ReportStatsPanel({ days = 14 }: { days?: number }) {
  const { data, isLoading } = useReportStats(days);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <NotebookText className="size-4" style={{ color: "var(--status-good)" }} />
          Daily Teaching Report ({days} hari terakhir)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div
                className="rounded-lg p-3 text-center"
                style={{ backgroundColor: "color-mix(in oklab, var(--chart-1) 10%, transparent)" }}
              >
                <p className="text-xl font-semibold" style={{ color: "var(--chart-1)" }}>
                  {data.totalCompletedMeetings}
                </p>
                <p className="text-muted-foreground text-xs">Kelas Selesai</p>
              </div>
              <div
                className="rounded-lg p-3 text-center"
                style={{ backgroundColor: "color-mix(in oklab, var(--status-good) 10%, transparent)" }}
              >
                <p className="text-xl font-semibold" style={{ color: "var(--status-good)" }}>
                  {data.totalReportsSubmitted}
                </p>
                <p className="text-muted-foreground text-xs">Report Masuk</p>
                <DeltaBadge current={data.totalReportsSubmitted} previous={data.previousReportsSubmitted} />
                <p className="text-muted-foreground/70 text-[10px]">vs {days} hari sebelumnya</p>
              </div>
              <div
                className="rounded-lg p-3 text-center"
                style={{
                  backgroundColor:
                    data.totalPendingReports > 0
                      ? "color-mix(in oklab, var(--status-critical) 10%, transparent)"
                      : "color-mix(in oklab, var(--status-good) 10%, transparent)",
                }}
              >
                <p
                  className="text-xl font-semibold"
                  style={{ color: data.totalPendingReports > 0 ? "var(--status-critical)" : "var(--status-good)" }}
                >
                  {data.totalPendingReports}
                </p>
                <p className="text-muted-foreground text-xs">Belum Ada Report</p>
              </div>
            </div>

            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.trend.map((d) => ({ date: formatDateLabel(d.date), Report: d.submitted }))}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }} />
                  <Bar dataKey="Report" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="text-muted-foreground mb-1.5 text-xs">Tujuan Pembelajaran Tercapai</p>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                {data.objectives.map((o) => {
                  const total = data.objectives.reduce((sum, x) => sum + x.value, 0) || 1;
                  const pct = (o.value / total) * 100;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={o.label}
                      style={{ width: `${pct}%`, backgroundColor: OBJECTIVES_COLOR[o.label] }}
                    />
                  );
                })}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                {data.objectives.map((o) => (
                  <span key={o.label} className="flex items-center gap-1">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: OBJECTIVES_COLOR[o.label] }}
                    />
                    {o.label}: {o.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
