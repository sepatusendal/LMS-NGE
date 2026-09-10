"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildDayOptions, formatScheduleSlots, type Class, type ClassInput } from "./schema";
import { useUpdateClass } from "./use-classes";

/** Inline day/time editor for the class's own weekly schedule — the
 * base slots (`ClassScheduleSlot`) that the "Jadwal per Hari" panel below it
 * then lets admins override per teacher. Lets admins add/remove meeting days
 * and change times right from the detail page instead of reopening the full
 * Edit Kelas dialog. Writes through `updateClassRecord`, so it gets the same
 * schedule-conflict check as every other schedule edit. */
export function ClassSchedulePanel({ classItem }: { classItem: Class }) {
  const t = useTranslations("admin.classes");
  const tCommon = useTranslations("common");
  const tDay = useTranslations("jadwal.day");
  const DAY_OPTIONS = useMemo(() => buildDayOptions(tDay), [tDay]);
  const updateClass = useUpdateClass(classItem.classType);

  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<Record<string, { startTime: string; endTime: string }>>({});

  function startEdit() {
    const initialTimes: Record<string, { startTime: string; endTime: string }> = {};
    classItem.scheduleSlots.forEach((s) => {
      initialTimes[String(s.dayOfWeek)] = { startTime: s.startTime, endTime: s.endTime };
    });
    setDays(classItem.scheduleDaysOfWeek.map(String));
    setTimes(initialTimes);
    setEditing(true);
  }

  function toggleDay(value: string) {
    setDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]));
  }

  function setTime(day: string, field: "startTime" | "endTime", value: string) {
    setTimes((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  async function save() {
    if (days.length === 0) return;
    const input: ClassInput = {
      name: classItem.name,
      schoolId: classItem.schoolId,
      teacherId: classItem.teacherId,
      curriculumId: classItem.curriculumId ?? "",
      room: classItem.room ?? "",
      scheduleDaysOfWeek: days,
      scheduleTimes: times,
    };
    await updateClass.mutateAsync({ id: classItem.id, input });
    setEditing(false);
  }

  const orderedSelectedDays = DAY_OPTIONS.filter((d) => days.includes(d.value));
  const canSave = days.length > 0 && days.every((d) => times[d]?.startTime && times[d]?.endTime);

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <p className="text-sm font-medium">{t("schedule")}</p>
          <p className="text-muted-foreground text-sm">{formatScheduleSlots(classItem.scheduleSlots)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={startEdit}>
          <Pencil />
          {tCommon("edit")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">{t("schedule")}</p>

      <div className="grid grid-cols-4 gap-2">
        {DAY_OPTIONS.map((d) => (
          <label key={d.value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-primary size-4"
              checked={days.includes(d.value)}
              onChange={() => toggleDay(d.value)}
            />
            {d.label}
          </label>
        ))}
      </div>

      {orderedSelectedDays.length > 0 && (
        <div className="space-y-2">
          {orderedSelectedDays.map((d) => (
            <div key={d.value} className="flex items-center gap-2">
              <span className="text-muted-foreground w-14 shrink-0 text-sm">{d.label}</span>
              <Input
                type="time"
                value={times[d.value]?.startTime ?? ""}
                onChange={(e) => setTime(d.value, "startTime", e.target.value)}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="time"
                value={times[d.value]?.endTime ?? ""}
                onChange={(e) => setTime(d.value, "endTime", e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" disabled={!canSave || updateClass.isPending} onClick={save}>
          {updateClass.isPending ? tCommon("saving") : tCommon("save")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          {tCommon("cancel")}
        </Button>
      </div>
    </div>
  );
}
