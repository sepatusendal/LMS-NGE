"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Clock, MapPin, School, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ClassAvatar } from "@/components/shared/class-avatar";
import { LoadingState } from "@/components/shared/loading-state";
import { useMyClasses, type MyClass } from "@/features/classes/use-my-classes";
import { formatScheduleSlots } from "@/features/classes/schema";

interface SchoolGroup {
  schoolName: string;
  classes: MyClass[];
}

export default function KelasPage() {
  const { data: classes, isLoading } = useMyClasses();
  const t = useTranslations("kelas");
  const tCommon = useTranslations("common");
  const dayLabels = tCommon.raw("daysShort") as Record<string, string>;

  const groups = useMemo<SchoolGroup[]>(() => {
    if (!classes) return [];
    const bySchool = new Map<string, MyClass[]>();
    for (const c of classes) {
      const list = bySchool.get(c.schoolName) ?? [];
      list.push(c);
      bySchool.set(c.schoolName, list);
    }
    return [...bySchool.entries()]
      .map(([schoolName, list]) => ({ schoolName, classes: list }))
      .sort((a, b) => a.schoolName.localeCompare(b.schoolName));
  }, [classes]);

  // Every section starts open when there's just one school (the common
  // case — no reason to make a teacher tap to see their only school's
  // classes); only the first section starts open when there's more than
  // one, so the list opens up manageable instead of a full wall of cards.
  const [openSchools, setOpenSchools] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (groups.length === 0) return;
    setOpenSchools(new Set([groups[0].schoolName]));
  }, [groups]);

  function toggleSection(schoolName: string) {
    setOpenSchools((prev) => {
      const next = new Set(prev);
      if (next.has(schoolName)) {
        next.delete(schoolName);
      } else {
        next.add(schoolName);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">{t("subtitle")}</p>
      </div>

      {isLoading && <LoadingState />}

      {!isLoading && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
          <Users className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">{t("noClassesAssigned")}</p>
        </div>
      )}

      <div className="space-y-5">
        {groups.map((group) => (
          <SchoolSection
            key={group.schoolName}
            group={group}
            open={openSchools.has(group.schoolName)}
            onToggle={() => toggleSection(group.schoolName)}
            dayLabels={dayLabels}
            classCountLabel={t("classCount", { count: group.classes.length })}
          />
        ))}
      </div>
    </div>
  );
}

function SchoolSection({
  group,
  open,
  onToggle,
  dayLabels,
  classCountLabel,
}: {
  group: SchoolGroup;
  open: boolean;
  onToggle: () => void;
  dayLabels: Record<string, string>;
  classCountLabel: string;
}) {
  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-1 py-1 text-left"
      >
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform",
            !open && "-rotate-90",
          )}
        />
        <School className="text-muted-foreground size-4 shrink-0" />
        <span className="text-sm font-bold">{group.schoolName}</span>
        <span className="text-muted-foreground text-xs">({classCountLabel})</span>
      </button>

      {open && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {group.classes.map((c, i) => (
            <Link
              key={c.id}
              href={`/kelas/${c.id}`}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 active:bg-muted",
                i !== group.classes.length - 1 && "border-b",
              )}
            >
              <ClassAvatar name={c.name} themeKey={c.module?.curriculumName ?? c.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <div className="text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatScheduleSlots(c.scheduleSlots, dayLabels)}
                  </span>
                  {c.room && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {c.room}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="text-muted-foreground/50 size-4 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
