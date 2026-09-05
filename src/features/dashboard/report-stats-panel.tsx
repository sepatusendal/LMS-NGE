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
import { AlertCircle, TrendingDown, TrendingUp, Minus, NotebookText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseLocalDate } from "@/lib/date";
import { useReportStats } from "./use-dashboard";

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const t = useTranslations("admin.dashboard");
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  const pct = previous === 0 ? 100 : Math.round((diff / previous) * 100);
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const color = diff > 0 ? "text-[var(--status-good)]" : diff < 0 ? "text-[var(--status-critical)]" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${color}`}>
      <Icon className="size-3" />
      {diff === 0 ? t("same") : `${pct > 0 ? "+" : ""}${pct}%`}
    </span>
  );
}

const OBJECTIVES_COLOR: Record<string, string> = {
  Tercapai: "var(--status-good)",
  Sebagian: "var(--status-warning)",
  Belum: "var(--status-critical)",
};

export function ReportStatsPanel({ days = 14 }: { days?: number }) {
  const t = useTranslations("admin.dashboard");
  const locale = useLocale();
  const { data, isLoading, isError } = useReportStats(days);

  const formatDateLabel = (dateStr: string) =>
    parseLocalDate(dateStr).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" });

  // The query layer emits fixed Indonesian strings as stable data keys
  // (also used for OBJECTIVES_COLOR lookup) — translate only the label
  // shown to the user, not the key itself.
  const objectivesLabelText: Record<string, string> = {
    Tercapai: t("objectivesAchieved"),
    Sebagian: t("objectivesPartial"),
    Belum: t("objectivesNotAchieved"),
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <NotebookText className="size-4" style={{ color: "var(--status-good)" }} />
          {t("dailyTeachingReportTitle", { days })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-6">
            <AlertCircle className="text-destructive size-5" />
            <p className="text-muted-foreground text-sm">{t("failedToLoadReports")}</p>
          </div>
        ) : isLoading || !data ? (
          <p className="text-muted-foreground text-sm">{t("loadingData")}</p>
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
                <p className="text-muted-foreground text-xs">{t("classesCompleted")}</p>
              </div>
              <div
                className="rounded-lg p-3 text-center"
                style={{ backgroundColor: "color-mix(in oklab, var(--status-good) 10%, transparent)" }}
              >
                <p className="text-xl font-semibold" style={{ color: "var(--status-good)" }}>
                  {data.totalReportsSubmitted}
                </p>
                <p className="text-muted-foreground text-xs">{t("reportsIn")}</p>
                <DeltaBadge current={data.totalReportsSubmitted} previous={data.previousReportsSubmitted} />
                <p className="text-muted-foreground/70 text-[10px]">{t("vsPreviousDays", { days })}</p>
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
                <p className="text-muted-foreground text-xs">{t("noReportYet")}</p>
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
              <p className="text-muted-foreground mb-1.5 text-xs">{t("learningObjectivesAchieved")}</p>
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
                    {objectivesLabelText[o.label] ?? o.label}: {o.value}
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
