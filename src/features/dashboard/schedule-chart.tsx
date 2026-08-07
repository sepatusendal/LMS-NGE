"use client";

import { useMemo, useState } from "react";
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
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useClasses } from "@/features/classes/use-classes";
import { getSlotForDay } from "@/features/classes/schema";

const DAY_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export function ScheduleChart() {
  const { data: classes, isLoading } = useClasses();
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);

  const chartData = useMemo(() => {
    const counts = new Array(7).fill(0);
    (classes ?? [])
      .filter((c) => c.isActive)
      .forEach((c) => c.scheduleDaysOfWeek.forEach((d) => (counts[d] += 1)));
    return DAY_LABELS.map((label, i) => ({ day: label.slice(0, 3), dayIndex: i, Kelas: counts[i] }));
  }, [classes]);

  const classesByDay = useMemo(() => {
    return (classes ?? [])
      .filter((c) => c.isActive && c.scheduleDaysOfWeek.includes(selectedDay))
      .map((c) => ({ ...c, slot: getSlotForDay(c.scheduleSlots, selectedDay) }))
      .sort((a, b) => (a.slot?.startTime ?? "").localeCompare(b.slot?.startTime ?? ""));
  }, [classes, selectedDay]);

  return (
    <Card className="border-l-4" style={{ borderLeftColor: "var(--chart-2)" }}>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Distribusi Jadwal Mingguan</CardTitle>
        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
          <span className="bg-primary size-2 rounded-full" />
          hari ini
        </span>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Memuat data...</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar
                  dataKey="Kelas"
                  radius={[3, 3, 0, 0]}
                  className="cursor-pointer"
                  onClick={(data) => {
                    const dayIndex = (data as unknown as { payload: { dayIndex: number } }).payload.dayIndex;
                    setSelectedDay(dayIndex);
                  }}
                >
                  {chartData.map((d) => (
                    <Cell
                      key={d.dayIndex}
                      fill={d.dayIndex === selectedDay ? "var(--primary)" : "var(--chart-2)"}
                      fillOpacity={d.dayIndex === selectedDay ? 1 : 0.55}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {!isLoading && (
          <div className="mt-3 border-t pt-3">
            <div className="mb-2.5 flex flex-wrap gap-1">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedDay(i)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    i === selectedDay
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {label.slice(0, 3)}
                  {i === today && <span className="ml-1 opacity-70">•</span>}
                </button>
              ))}
            </div>

            <p className="text-muted-foreground mb-2 text-xs font-medium">
              {classesByDay.length} kelas pada hari {DAY_LABELS[selectedDay]}
              {selectedDay === today && " (hari ini)"}
            </p>

            {classesByDay.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Tidak ada kelas terjadwal pada hari {DAY_LABELS[selectedDay]}.
              </p>
            ) : (
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {classesByDay.map((c) => (
                  <div
                    key={c.id}
                    className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {c.schoolName} · {c.teacherName}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Clock className="size-3" />
                        {c.slot ? `${c.slot.startTime}-${c.slot.endTime}` : "-"}
                      </Badge>
                      {c.room && (
                        <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                          <MapPin className="size-2.5" />
                          {c.room}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
