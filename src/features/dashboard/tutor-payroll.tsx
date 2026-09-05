"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Banknote, ListChecks } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionHeading } from "@/components/shared/section-heading";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { formatRupiah } from "@/lib/currency";
import type { ExcelColumn } from "@/lib/export-excel";
import { useTutorPayroll } from "./use-dashboard";
import type { TutorPayrollRow } from "./queries";

// Compact label buat sumbu chart — "Rp 1,25jt" / "Rp 125rb", biar tick
// gak berdesakan. Tooltip tetap pakai formatRupiah penuh.
function compactRupiah(n: number, locale: string): string {
  if (n >= 1_000_000) {
    return `Rp ${(n / 1_000_000).toLocaleString(locale === "en" ? "en-US" : "id-ID", { maximumFractionDigits: 1 })}${locale === "en" ? "M" : "jt"}`;
  }
  if (n >= 1_000) {
    return `Rp ${Math.round(n / 1_000).toLocaleString(locale === "en" ? "en-US" : "id-ID")}${locale === "en" ? "K" : "rb"}`;
  }
  return formatRupiah(n);
}

type Period = "this-month" | "last-month" | "custom";

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(d: Date, locale: string): string {
  return d.toLocaleDateString(locale === "en" ? "en-US" : "id-ID", { month: "long", year: "numeric" });
}

function computeRange(
  period: Period,
  customFrom: string,
  customTo: string,
  locale: string,
  allTimeLabel: string,
) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (period === "this-month") {
    const from = new Date(y, m, 1);
    const to = new Date(y, m + 1, 1);
    return { from: from.toISOString(), to: to.toISOString(), label: monthLabel(from, locale) };
  }

  if (period === "last-month") {
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 1);
    return { from: from.toISOString(), to: to.toISOString(), label: monthLabel(from, locale) };
  }

  // custom — `to` eksklusif (hari setelah tanggal akhir).
  const from = customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : null;
  let to: string | null = null;
  if (customTo) {
    const d = new Date(`${customTo}T00:00:00`);
    d.setDate(d.getDate() + 1);
    to = d.toISOString();
  }
  const label = [customFrom, customTo].filter(Boolean).join(" – ") || allTimeLabel;
  return { from, to, label };
}

function buildExportColumns(
  t: (key: string) => string,
): ExcelColumn<TutorPayrollRow>[] {
  return [
    { header: t("tutor"), key: "teacher", width: 24, value: (r) => r.teacherName },
    { header: "Fee per Meeting", key: "fee", width: 18, value: (r) => (r.feePerMeeting != null ? r.feePerMeeting : t("notSet")) },
    { header: t("attended"), key: "attended", width: 10, value: (r) => r.attendedCount },
    { header: t("subtotal"), key: "subtotal", width: 18, value: (r) => r.subtotal },
  ];
}

interface PayrollSummaryRow {
  label: string;
  value: string | number;
}

function buildSummaryColumns(t: (key: string) => string): ExcelColumn<PayrollSummaryRow>[] {
  return [
    { header: t("summary"), key: "label", width: 26, value: (r) => r.label },
    { header: t("value"), key: "value", width: 20, value: (r) => r.value },
  ];
}

export function TutorPayroll() {
  const t = useTranslations("admin.dashboard.payroll");
  const locale = useLocale();
  const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: "this-month", label: t("thisMonth") },
    { value: "last-month", label: t("lastMonth") },
    { value: "custom", label: t("custom") },
  ];
  const [period, setPeriod] = useState<Period>("this-month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const isIncomplete = period === "custom" && (!customFrom || !customTo);

  const range = useMemo(
    () => computeRange(period, customFrom, customTo, locale, t("allTime")),
    [period, customFrom, customTo, locale, t],
  );
  const { data, isLoading, isError } = useTutorPayroll(range.from, range.to, !isIncomplete);

  const chartData = useMemo(
    () =>
      data?.rows
        .filter((t) => t.subtotal > 0)
        .map((t) => ({ name: t.teacherName, subtotal: t.subtotal })) ?? [],
    [data],
  );

  function handlePeriodChange(v: string | null) {
    if (!v) return;
    setPeriod(v as Period);
    if (v === "custom" && !customFrom && !customTo) {
      const now = new Date();
      setCustomFrom(toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
      setCustomTo(toDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeading
          icon={Banknote}
          title={t("title")}
          description={t("description")}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton
            filename={`gaji-tutor-${range.label}`}
            sheets={[
              {
                name: t("summary"),
                columns: buildSummaryColumns(t),
                rows: data
                  ? [
                      { label: t("period"), value: range.label },
                      { label: t("totalPayrollExpense"), value: data.totalExpense },
                      { label: t("totalAttendance"), value: data.totalAttended },
                      { label: t("tutorsWithoutFee"), value: data.unbilledCount },
                      { label: t("uncountedCheckIns"), value: data.orphanedCheckInCount },
                    ]
                  : [],
              },
              { name: t("tutorPayrollDetail"), columns: buildExportColumns(t), rows: data?.rows ?? [] },
            ]}
          />
          <Select items={PERIOD_OPTIONS} value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {period === "custom" && (
            <>
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-auto"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-auto"
              />
            </>
          )}
        </div>
      </div>

      {isIncomplete ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            {t("completeDateRange")}
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-1.5 py-8">
            <AlertCircle className="text-destructive size-5" />
            <p className="text-muted-foreground text-sm">{t("failedToLoad")}</p>
          </CardContent>
        </Card>
      ) : isLoading || !data ? (
        <Card>
          <CardContent className="text-muted-foreground py-8 text-center text-sm">
            {t("loadingPayroll")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Card 1 — ringkasan beban pengeluaran + chart */}
          <Card className="relative">
            <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: "var(--chart-3)" }} />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base font-bold">
                <span className="flex items-center gap-2">
                  <span
                    className="flex size-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "color-mix(in oklab, var(--chart-3) 16%, transparent)" }}
                  >
                    <Banknote className="size-4" style={{ color: "var(--chart-3)" }} />
                  </span>
                  {t("expenseTitle")}
                </span>
                <span className="text-muted-foreground text-xs font-normal">{range.label}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-3xl font-bold leading-tight" style={{ color: "var(--chart-3)" }}>
                  {formatRupiah(data.totalExpense)}
                </p>
                <p className="text-muted-foreground text-xs">{t("totalPayrollExpense")}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div
                  className="rounded-lg p-3 text-center"
                  style={{ backgroundColor: "color-mix(in oklab, var(--chart-3) 10%, transparent)" }}
                >
                  <p className="text-xl font-semibold" style={{ color: "var(--chart-3)" }}>
                    {data.totalAttended}
                  </p>
                  <p className="text-muted-foreground text-xs">{t("totalAttendance")}</p>
                </div>
                <div
                  className="rounded-lg p-3 text-center"
                  style={{
                    backgroundColor:
                      data.unbilledCount > 0
                        ? "color-mix(in oklab, var(--status-warning) 10%, transparent)"
                        : "color-mix(in oklab, var(--status-good) 10%, transparent)",
                  }}
                >
                  <p
                    className="text-xl font-semibold"
                    style={{ color: data.unbilledCount > 0 ? "var(--status-warning)" : "var(--status-good)" }}
                  >
                    {data.unbilledCount}
                  </p>
                  <p className="text-muted-foreground text-xs">{t("withoutFeeSet")}</p>
                </div>
              </div>

              <div className="h-60">
                {chartData.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("noCheckInData")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        height={52}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => compactRupiah(Number(v), locale)}
                        width={56}
                      />
                      <Tooltip
                        formatter={(v: unknown) => formatRupiah(Number(v))}
                        cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }}
                      />
                      <Bar dataKey="subtotal" fill="var(--chart-3)" radius={[4, 4, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {data.unbilledCount > 0 && (
                <p className="text-muted-foreground text-xs">
                  {t("tutorsWithoutFeeHint", { count: data.unbilledCount })}
                </p>
              )}
              {data.orphanedCheckInCount > 0 && (
                <p className="text-muted-foreground text-xs">
                  {t("uncountedCheckInsHint", { count: data.orphanedCheckInCount })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Card 2 — detail per tutor */}
          <Card className="relative">
            <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: "var(--chart-5)" }} />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <span
                  className="flex size-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "color-mix(in oklab, var(--chart-5) 16%, transparent)" }}
                >
                  <ListChecks className="size-4" style={{ color: "var(--chart-5)" }} />
                </span>
                {t("tutorPayrollDetail")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("noCheckInData")}</p>
              ) : (
                <div className="max-h-80 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader className="[&_tr]:bg-card sticky top-0 z-10 [&_tr]:border-b">
                      <TableRow>
                        <TableHead>{t("tutor")}</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                        <TableHead className="text-right">{t("attended")}</TableHead>
                        <TableHead className="text-right">{t("subtotal")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((row) => (
                        <TableRow key={row.teacherId}>
                          <TableCell className="font-medium">{row.teacherName}</TableCell>
                          <TableCell className="text-right">
                            {row.feePerMeeting != null ? (
                              formatRupiah(row.feePerMeeting)
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {t("notSet")}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{row.attendedCount}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatRupiah(row.subtotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-card sticky bottom-0 border-t hover:bg-card">
                        <TableCell className="font-semibold">{t("total")}</TableCell>
                        <TableCell className="text-muted-foreground text-right text-xs" colSpan={2}>
                          {t("attendanceCount", { count: data.totalAttended })}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatRupiah(data.totalExpense)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
