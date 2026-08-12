"use client";

import { Clock, MapPin, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useMyClasses, type MyClass } from "@/features/classes/use-my-classes";
import { DAY_OPTIONS } from "@/features/classes/schema";
import { getCurriculumTheme } from "@/lib/curriculum-theme";

// DAY_OPTIONS is Senin-first with Minggu last (value "0") — today's actual
// JS getDay() index (0=Sunday) is remapped so "today" highlights correctly
// against that display order.
const TODAY_VALUE = String(new Date().getDay());

export default function JadwalPage() {
  const { data: classes, isLoading } = useMyClasses();

  const byDay = new Map<string, Array<{ cls: MyClass; startTime: string; endTime: string }>>();
  for (const day of DAY_OPTIONS) byDay.set(day.value, []);
  for (const cls of classes ?? []) {
    for (const slot of cls.scheduleSlots) {
      byDay.get(String(slot.dayOfWeek))?.push({ cls, startTime: slot.startTime, endTime: slot.endTime });
    }
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Jadwal Mengajar</h1>
        <p className="text-muted-foreground text-sm">Jadwal mingguan semua kelasmu</p>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Memuat jadwal...</p>}

      {!isLoading && (!classes || classes.length === 0) && (
        <p className="text-muted-foreground text-sm">
          Belum ada kelas yang ditugaskan ke Anda.
        </p>
      )}

      {DAY_OPTIONS.map((day) => {
        const entries = byDay.get(day.value) ?? [];
        const isToday = day.value === TODAY_VALUE;
        if (entries.length === 0) return null;

        return (
          <div key={day.value} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <h2
                className={cn(
                  "text-sm font-bold",
                  isToday ? "text-primary" : "text-foreground",
                )}
              >
                {day.label}
              </h2>
              {isToday && (
                <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  Hari ini
                </span>
              )}
            </div>
            <div className="space-y-2">
              {entries.map(({ cls, startTime, endTime }, i) => {
                const theme = getCurriculumTheme(cls.module?.curriculumName ?? cls.name);
                return (
                  <Card key={`${cls.id}-${i}`} className="overflow-hidden rounded-xl py-0 shadow-sm">
                    <div className="flex">
                      <div className={cn("w-1.5 shrink-0", theme.bar)} />
                      <CardContent className="flex flex-1 items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{cls.name}</p>
                          <p className="text-muted-foreground truncate text-xs">{cls.schoolName}</p>
                        </div>
                        <div className="text-muted-foreground flex shrink-0 flex-col items-end gap-0.5 text-xs">
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Clock className="size-3" />
                            {startTime}-{endTime}
                          </span>
                          {cls.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="size-3" />
                              {cls.room}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {!isLoading && classes && classes.length > 0 && [...byDay.values()].every((v) => v.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
          <CalendarDays className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">Belum ada jadwal terjadwal.</p>
        </div>
      )}
    </div>
  );
}
