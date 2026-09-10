"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { buildDayLabel } from "@/features/classes/schema";
import { useTeacherAssignments, useUnassignTeacherFromDay } from "./use-teacher-assignments";
import { AssignClassDialog } from "./assign-class-dialog";
import type { Teacher } from "./schema";

/** Shows every class/day this teacher currently teaches (their own classes'
 * default slots, plus any day handed to them via another class's override)
 * and lets an admin assign them to an additional class/day directly from
 * here — the mirror of the "Jadwal per Hari" panel on the Class detail page,
 * which does the same assignment starting from the class instead. */
export function TeacherClassAssignmentsPanel({ teacher }: { teacher: Teacher }) {
  const t = useTranslations("admin.teachers.assignments");
  const tCommon = useTranslations("common");
  const tDay = useTranslations("jadwal.day");
  const DAY_LABEL = buildDayLabel(tDay);
  const { data: assignments, isLoading } = useTeacherAssignments(teacher.id);
  const unassign = useUnassignTeacherFromDay(teacher.id);
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-xs">{t("title")}</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
          <Plus />
          {t("assignButton")}
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">{tCommon("loading")}</p>}
      {!isLoading && (assignments?.length ?? 0) === 0 && (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      )}

      <div className="divide-y">
        {assignments?.map((a) => (
          <div key={`${a.classId}-${a.dayOfWeek}`} className="flex items-center justify-between py-1.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">{a.className}</p>
              <p className="text-muted-foreground text-xs">
                {DAY_LABEL[String(a.dayOfWeek)]} · {a.startTime}-{a.endTime}
                {a.isOverride ? ` · ${t("overrideBadge")}` : ""}
              </p>
            </div>
            {a.isOverride && a.overrideId && (
              <Button
                size="sm"
                variant="ghost"
                disabled={unassign.isPending}
                onClick={() => {
                  const overrideId = a.overrideId;
                  if (!overrideId) return;
                  if (
                    window.confirm(
                      t("unassignConfirm", { class: a.className, day: DAY_LABEL[String(a.dayOfWeek)] }),
                    )
                  ) {
                    unassign.mutate(overrideId);
                  }
                }}
              >
                {tCommon("delete")}
              </Button>
            )}
          </div>
        ))}
      </div>

      <AssignClassDialog open={assignOpen} onOpenChange={setAssignOpen} teacher={teacher} />
    </div>
  );
}
