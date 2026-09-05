"use client";

import { useMemo, useState } from "react";
import { AlertCircle, UserRoundX } from "lucide-react";
import { useTranslations } from "next-intl";
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
  isError,
  errorMessage,
  emptyLabel,
  limit,
}: {
  date: string;
  rows: ClassStatusRow[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  emptyLabel?: string;
  /** Cap the number of teachers shown (e.g. for a compact dashboard panel). */
  limit?: number;
}) {
  const t = useTranslations("admin.substitutes.dayList");
  const tCommon = useTranslations("common");
  // Track just the id, not the whole group object — deriving the group
  // fresh from `groups` on every render (instead of freezing a snapshot at
  // click time) means the open dialog picks up live data after a mutation
  // (e.g. cancelling one class's substitute) invalidates and refetches the
  // status board, rather than showing stale state until it's reopened.
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);

  const groups = useMemo(() => groupByTeacher(rows), [rows]);
  const visibleGroups = limit ? groups.slice(0, limit) : groups;
  const activeTeacher = activeTeacherId
    ? (groups.find((g) => g.teacherId === activeTeacherId) ?? null)
    : null;

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{tCommon("dataTable.loading")}</p>;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <AlertCircle className="text-destructive mb-2 size-6" />
        <p className="text-muted-foreground text-center text-sm">
          {errorMessage || t("loadError")}
        </p>
      </div>
    );
  }

  if (groups.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel ?? t("emptyDefault")}</p>;
  }

  return (
    <div className="space-y-2">
      {visibleGroups.map((g) => {
        const classCountLabel = t("classCount", { count: g.classes.length });
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
                    {t("hasSubstitute")}
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
              title={g.allHoliday ? t("allHolidayTitle") : undefined}
              onClick={() => setActiveTeacherId(g.teacherId)}
            >
              <UserRoundX className="size-3.5" />
              {t("markAbsent")}
            </Button>
          </div>
        );
      })}
      {limit && groups.length > limit && (
        <p className="text-muted-foreground text-xs">
          {t("moreTeachers", { count: groups.length - limit })}
        </p>
      )}

      {activeTeacher && (
        <TeacherAbsenceDialog
          open={Boolean(activeTeacher)}
          onOpenChange={(open) => !open && setActiveTeacherId(null)}
          date={date}
          teacherId={activeTeacher.teacherId}
          teacherName={activeTeacher.teacherName}
          classes={activeTeacher.classes}
        />
      )}
    </div>
  );
}
