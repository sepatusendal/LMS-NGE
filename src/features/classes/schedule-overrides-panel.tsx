"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildDayLabel, getSlotForDay } from "./schema";
import { useTeachers } from "@/features/teachers/use-teachers";
import {
  useDeleteScheduleOverride,
  useScheduleOverrides,
  useUpsertScheduleOverride,
} from "./use-schedule-overrides";
import type { Class } from "./schema";

interface Props {
  classItem: Class;
}

export function ScheduleOverridesPanel({ classItem }: Props) {
  const t = useTranslations("admin.classes.scheduleOverrides");
  const tCommon = useTranslations("common");
  const tDay = useTranslations("jadwal.day");
  const DAY_LABEL = useMemo(() => buildDayLabel(tDay), [tDay]);
  const { data: overrides } = useScheduleOverrides(classItem.id);
  const { data: teachers } = useTeachers();
  const upsert = useUpsertScheduleOverride(classItem.id);
  const del = useDeleteScheduleOverride(classItem.id);

  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const overrideByDay = new Map((overrides ?? []).map((o) => [o.dayOfWeek, o]));

  function startEdit(day: number) {
    const existing = overrideByDay.get(day);
    const daySlot = getSlotForDay(classItem.scheduleSlots, day);
    setEditingDay(day);
    setStartTime(existing?.startTime ?? daySlot?.startTime ?? "");
    setEndTime(existing?.endTime ?? daySlot?.endTime ?? "");
    setTeacherId(existing?.teacherId ?? classItem.teacherId);
  }

  function cancelEdit() {
    setEditingDay(null);
  }

  async function saveEdit(day: number) {
    if (!startTime || !endTime || !teacherId) return;
    await upsert.mutateAsync({ classId: classItem.id, dayOfWeek: day, startTime, endTime, teacherId });
    setEditingDay(null);
  }

  if (classItem.scheduleDaysOfWeek.length < 2) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-medium">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("description", { teacher: classItem.teacherName })}
        </p>
      </div>

      <div className="divide-y rounded-lg border">
        {classItem.scheduleDaysOfWeek.map((day) => {
          const override = overrideByDay.get(day);
          const isEditing = editingDay === day;
          const daySlot = getSlotForDay(classItem.scheduleSlots, day);

          if (isEditing) {
            return (
              <div key={day} className="space-y-2 px-3 py-3">
                <p className="text-sm font-medium">{DAY_LABEL[String(day)]}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
                <Select
                  items={teachers?.map((te) => ({ value: te.id, label: te.fullName }))}
                  value={teacherId}
                  onValueChange={(v) => v && setTeacherId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectTutor")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((te) => (
                      <SelectItem key={te.id} value={te.id}>
                        {te.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" disabled={upsert.isPending} onClick={() => saveEdit(day)}>
                    {upsert.isPending ? tCommon("saving") : tCommon("save")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    {tCommon("cancel")}
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div key={day} className="flex items-center justify-between px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{DAY_LABEL[String(day)]}</p>
                {override ? (
                  <p className="text-muted-foreground text-xs">
                    {override.teacherName} · {override.startTime}-{override.endTime}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    {classItem.teacherName}
                    {daySlot ? ` · ${daySlot.startTime}-${daySlot.endTime}` : ""} {t("defaultSuffix")}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" onClick={() => startEdit(day)}>
                  {override ? tCommon("edit") : t("setOverride")}
                </Button>
                {override && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={del.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          t("deleteConfirm", {
                            day: DAY_LABEL[String(day)],
                            teacher: classItem.teacherName,
                          }),
                        )
                      ) {
                        del.mutate(override.id);
                      }
                    }}
                  >
                    {tCommon("delete")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
