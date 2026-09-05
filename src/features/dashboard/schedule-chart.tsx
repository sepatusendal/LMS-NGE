"use client";

import { useEffect, useMemo, useState } from "react";
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
import { AlertCircle, Clock, MapPin, CalendarRange } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClasses } from "@/features/classes/use-classes";
import { buildDayLabelsSundayFirst, getSlotForDay, type Class, type ScheduleSlot } from "@/features/classes/schema";

type ClassWithSlot = Class & { slot: ScheduleSlot | null };

function ScheduleTooltip({
  active,
  payload,
  getClassesForDay,
  dayLabels,
}: {
  active?: boolean;
  payload?: Array<{ payload: { dayIndex: number } }>;
  getClassesForDay: (dayIndex: number) => ClassWithSlot[];
  dayLabels: string[];
}) {
  const t = useTranslations("admin.dashboard");
  if (!active || !payload || payload.length === 0) return null;
  const dayIndex = payload[0].payload.dayIndex;
  const list = getClassesForDay(dayIndex);

  return (
    <div className="max-w-[260px] rounded-lg border bg-popover p-2.5 text-popover-foreground shadow-md">
      <p className="mb-1.5 text-xs font-semibold">
        {dayLabels[dayIndex]} · {t("classCount", { count: list.length })}
      </p>
      {list.length === 0 ? (
        <p className="text-muted-foreground text-xs">{t("noClassesScheduled")}</p>
      ) : (
        <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
          {list.map((c) => (
            <div key={c.id} className="rounded-md bg-muted/40 px-2 py-1.5">
              <p className="truncate text-xs font-medium">{c.name}</p>
              <p className="text-muted-foreground truncate text-[11px]">
                {c.schoolName} · {c.teacherName}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[10px]">
                <span className="inline-flex items-center gap-0.5">
                  <Clock className="size-3" />
                  {c.slot ? `${c.slot.startTime}-${c.slot.endTime}` : "-"}
                </span>
                {c.room && (
                  <span className="text-muted-foreground inline-flex items-center gap-0.5">
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
  );
}

export function ScheduleChart() {
  const t = useTranslations("admin.dashboard");
  const tDay = useTranslations("jadwal.day");
  const dayLabels = useMemo(() => buildDayLabelsSundayFirst(tDay), [tDay]);
  const { data: classes, isLoading, isError } = useClasses();
  // Deferred to client-only: `new Date().getDay()` reads the viewer's local
  // clock, which can differ from the server's at render time (e.g. near the
  // UTC-midnight/WIB-7am boundary) — computing it during the initial render
  // would make the "today" highlight/dot mismatch between SSR and hydration.
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(new Date().getDay()), []);

  // Tapping a bar pins its day's class list below the chart — the hover
  // tooltip alone isn't reachable on touch devices, which have no hover.
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const effectiveSelectedDay = selectedDay ?? today;

  const chartData = useMemo(() => {
    const counts = new Array(7).fill(0);
    (classes ?? [])
      .filter((c) => c.isActive)
      .forEach((c) => c.scheduleDaysOfWeek.forEach((d) => (counts[d] += 1)));
    return dayLabels.map((label, i) => ({ day: label.slice(0, 3), dayIndex: i, Kelas: counts[i] }));
  }, [classes, dayLabels]);

  // Kelas untuk satu hari (diurutkan per jam) — dihitung on-demand per hari
  // yang di-hover/di-tap, bukan semua 7 hari sekaligus di setiap render.
  const getClassesForDay = useMemo(() => {
    return (dayIndex: number): ClassWithSlot[] =>
      (classes ?? [])
        .filter((c) => c.isActive && c.scheduleDaysOfWeek.includes(dayIndex))
        .map((c) => ({ ...c, slot: getSlotForDay(c.scheduleSlots, dayIndex) }))
        .sort((a, b) => (a.slot?.startTime ?? "").localeCompare(b.slot?.startTime ?? ""));
  }, [classes]);

  const selectedList = effectiveSelectedDay === null ? [] : getClassesForDay(effectiveSelectedDay);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarRange className="size-4" style={{ color: "var(--chart-2)" }} />
          {t("weeklyScheduleDistribution")}
        </CardTitle>
        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
          <span className="bg-primary size-2 rounded-full" />
          {t("todayLower")}
        </span>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          {isError ? (
            <div className="flex h-full flex-col items-center justify-center gap-1.5">
              <AlertCircle className="text-destructive size-5" />
              <p className="text-muted-foreground text-sm">{t("failedToLoadSchedule")}</p>
            </div>
          ) : isLoading ? (
            <p className="text-muted-foreground text-sm">{t("loadingData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }}
                  content={<ScheduleTooltip getClassesForDay={getClassesForDay} dayLabels={dayLabels} />}
                />
                <Bar
                  dataKey="Kelas"
                  radius={[3, 3, 0, 0]}
                  className="cursor-pointer"
                  onClick={(data) => {
                    const dayIndex = (data as unknown as { payload: { dayIndex: number } }).payload.dayIndex;
                    setSelectedDay((prev) => (prev === dayIndex ? null : dayIndex));
                  }}
                >
                  {chartData.map((d) => (
                    <Cell
                      key={d.dayIndex}
                      fill={d.dayIndex === effectiveSelectedDay ? "var(--primary)" : "var(--chart-2)"}
                      fillOpacity={d.dayIndex === effectiveSelectedDay ? 1 : 0.55}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {!isLoading && !isError && effectiveSelectedDay !== null && (
          <div className="mt-3 border-t pt-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              {t("classesOnDay", { count: selectedList.length, day: dayLabels[effectiveSelectedDay] })}
              {effectiveSelectedDay === today && ` (${t("todayLower")})`}
              {selectedDay !== null && ` · ${t("tapAgainToClose")}`}
            </p>
            {selectedList.length === 0 ? (
              <p className="text-muted-foreground py-2 text-center text-xs">
                {t("noClassesScheduledOnDay", { day: dayLabels[effectiveSelectedDay] })}
              </p>
            ) : (
              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                {selectedList.map((c) => (
                  <div
                    key={c.id}
                    className="bg-muted/40 flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{c.name}</p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {c.schoolName} · {c.teacherName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[10px]">
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="size-3" />
                        {c.slot ? `${c.slot.startTime}-${c.slot.endTime}` : "-"}
                      </span>
                      {c.room && (
                        <span className="text-muted-foreground inline-flex items-center gap-0.5">
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
