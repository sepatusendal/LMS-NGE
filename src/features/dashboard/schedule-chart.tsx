"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClasses } from "@/features/classes/use-classes";

const DAY_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function ScheduleChart() {
  const { data: classes, isLoading } = useClasses();
  const today = new Date().getDay();

  const chartData = useMemo(() => {
    const counts = new Array(7).fill(0);
    (classes ?? [])
      .filter((c) => c.isActive)
      .forEach((c) => c.scheduleDaysOfWeek.forEach((d) => (counts[d] += 1)));
    return DAY_LABELS.map((label, i) => ({ day: label.slice(0, 3), dayIndex: i, Kelas: counts[i] }));
  }, [classes]);

  return (
    <Card className="border-l-4" style={{ borderLeftColor: "var(--chart-2)" }}>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Distribusi Jadwal Mingguan</CardTitle>
        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
          <span className="bg-primary size-2 rounded-full" />
          hari ini
        </span>
      </CardHeader>
      <CardContent className="h-52">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="Kelas" radius={[3, 3, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.dayIndex} fill={d.dayIndex === today ? "var(--primary)" : "var(--chart-2)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
