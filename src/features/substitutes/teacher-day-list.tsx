"use client";

import { useMemo, useState } from "react";
import { UserRoundX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClassStatusRow } from "@/features/monitoring/schema";
import { TeacherAbsenceDialog } from "./teacher-absence-dialog";

interface TeacherGroup {
  teacherId: string;
  teacherName: string;
  classes: ClassStatusRow[];
  hasSubstitute: boolean;
  allHoliday: boolean;
}

function groupByTeacher(rows: ClassStatusRow[]): TeacherGroup[] {
  const map = new Map<string, TeacherGroup>();
  for (const r of rows) {
    const g = map.get(r.teacherId) ?? {
      teacherId: r.teacherId,
      teacherName: r.teacherName,
      classes: [],
      hasSubstitute: false,
      allHoliday: true,
    };
    g.classes.push(r);
    if (r.isSubstitute) g.hasSubstitute = true;
    if (!r.isHoliday) g.allHoliday = false;
    map.set(r.teacherId, g);
  }
  return [...map.values()].sort((a, b) => a.teacherName.localeCompare(b.teacherName));
}

export function TeacherDayList({
  date,
  rows,
  isLoading,
  emptyLabel = "Tidak ada kelas terjadwal di tanggal ini.",
  limit,
}: {
  date: string;
  rows: ClassStatusRow[];
  isLoading?: boolean;
  emptyLabel?: string;
  /** Cap the number of teachers shown (e.g. for a compact dashboard panel). */
  limit?: number;
}) {
  const [activeTeacher, setActiveTeacher] = useState<TeacherGroup | null>(null);

  const groups = useMemo(() => groupByTeacher(rows), [rows]);
  const visibleGroups = limit ? groups.slice(0, limit) : groups;

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Memuat data...</p>;
  }

  if (groups.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {visibleGroups.map((g) => {
        const classCountLabel = `${g.classes.length} kelas`;
        return (
          <div
            key={g.teacherId}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium">{g.teacherName}</p>
                {g.hasSubstitute && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    Ada pengganti
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {classCountLabel} ·{" "}
                {g.classes
                  .map((c) => `${c.className} (${c.scheduleStartTime})`)
                  .join(", ")}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5"
              disabled={g.allHoliday}
              title={g.allHoliday ? "Semua kelas guru ini libur di tanggal ini" : undefined}
              onClick={() => setActiveTeacher(g)}
            >
              <UserRoundX className="size-3.5" />
              Tandai Absen
            </Button>
          </div>
        );
      })}
      {limit && groups.length > limit && (
        <p className="text-muted-foreground text-xs">
          +{groups.length - limit} guru lain terjadwal hari ini.
        </p>
      )}

      {activeTeacher && (
        <TeacherAbsenceDialog
          open={Boolean(activeTeacher)}
          onOpenChange={(open) => !open && setActiveTeacher(null)}
          date={date}
          teacherId={activeTeacher.teacherId}
          teacherName={activeTeacher.teacherName}
          classes={activeTeacher.classes}
        />
      )}
    </div>
  );
}
