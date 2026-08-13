"use client";

import { Banknote, ListChecks } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionHeading } from "@/components/shared/section-heading";
import { formatRupiah } from "@/lib/currency";
import { useTutorPayroll } from "./use-dashboard";

// Compact label buat sumbu chart — "Rp 1,25jt" / "Rp 125rb", biar tick
// gak berdesakan. Tooltip tetap pakai formatRupiah penuh.
function compactRupiah(n: number): string {
  if (n >= 1_000_000) {
    return `Rp ${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  }
  if (n >= 1_000) {
    return `Rp ${Math.round(n / 1_000).toLocaleString("id-ID")}rb`;
  }
  return formatRupiah(n);
}

export function TutorPayroll() {
  const { data, isLoading } = useTutorPayroll();

  if (isLoading || !data) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          Memuat beban gaji tutor...
        </CardContent>
      </Card>
    );
  }

  const chartData = data.rows
    .filter((t) => t.subtotal > 0)
    .map((t) => ({ name: t.teacherName, subtotal: t.subtotal }));

  return (
    <section className="space-y-3">
      <SectionHeading
        icon={Banknote}
        title="Beban Gaji Tutor"
        description="Akumulasi fee per meeting × jumlah check-in. Tutor tanpa fee tidak masuk total beban."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Card 1 — ringkasan beban pengeluaran + chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Banknote className="size-4" style={{ color: "var(--chart-3)" }} />
              Beban Pengeluaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-2xl font-semibold leading-tight">
                {formatRupiah(data.totalExpense)}
              </p>
              <p className="text-muted-foreground text-xs">Total beban gaji tutor</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-lg p-3 text-center"
                style={{ backgroundColor: "color-mix(in oklab, var(--chart-3) 10%, transparent)" }}
              >
                <p className="text-xl font-semibold" style={{ color: "var(--chart-3)" }}>
                  {data.totalAttended}
                </p>
                <p className="text-muted-foreground text-xs">Total Kehadiran</p>
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
                <p className="text-muted-foreground text-xs">Belum Set Fee</p>
              </div>
            </div>

            <div className="h-60">
              {chartData.length === 0 ? (
                <p className="text-muted-foreground text-sm">Belum ada data check-in.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => compactRupiah(Number(v))}
                    />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: unknown) => formatRupiah(Number(v))} />
                    <Bar dataKey="subtotal" fill="var(--chart-3)" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 2 — detail per tutor */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ListChecks className="size-4" style={{ color: "var(--chart-5)" }} />
              Detail Gaji Tutor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada data check-in.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tutor</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                    <TableHead className="text-right">Hadir</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((t) => (
                    <TableRow key={t.teacherId}>
                      <TableCell className="font-medium">{t.teacherName}</TableCell>
                      <TableCell className="text-right">
                        {t.feePerMeeting != null ? (
                          formatRupiah(t.feePerMeeting)
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            belum set
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{t.attendedCount}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupiah(t.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs" colSpan={2}>
                      {data.totalAttended} kehadiran
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatRupiah(data.totalExpense)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
