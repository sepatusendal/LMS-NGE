"use client";

import Link from "next/link";
import { ArrowRight, CalendarOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStatusBoard } from "@/features/monitoring/use-monitoring";
import { TeacherDayList } from "./teacher-day-list";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Dashboard-front shortcut for the teacher-centric absence workflow — lets
 * admin notice a teacher is out and reassign their classes for today
 * without leaving the dashboard, before drilling into the full /substitutes
 * page for other dates. */
export function TodayTeachersPanel() {
  const date = todayStr();
  const { data: rows, isLoading } = useStatusBoard(date);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <CalendarOff className="text-muted-foreground size-4" />
          Guru Aktif Hari Ini
        </CardTitle>
        <Link
          href="/substitutes"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          Lihat semua tanggal
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent>
        <TeacherDayList
          date={date}
          rows={rows ?? []}
          isLoading={isLoading}
          emptyLabel="Tidak ada guru terjadwal hari ini."
          limit={6}
        />
      </CardContent>
    </Card>
  );
}
