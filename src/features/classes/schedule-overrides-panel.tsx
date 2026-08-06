"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAY_LABEL } from "./schema";
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
    setEditingDay(day);
    setStartTime(existing?.startTime ?? classItem.scheduleStartTime);
    setEndTime(existing?.endTime ?? classItem.scheduleEndTime);
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
        <h2 className="font-medium">Jadwal per Hari</h2>
        <p className="text-muted-foreground text-sm">
          Default: {classItem.teacherName}, {classItem.scheduleStartTime}-{classItem.scheduleEndTime}.
          Set override kalau tutor atau jam beda di hari tertentu (kelas ketemu 2x/minggu).
        </p>
      </div>

      <div className="divide-y rounded-lg border">
        {classItem.scheduleDaysOfWeek.map((day) => {
          const override = overrideByDay.get(day);
          const isEditing = editingDay === day;

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
                  items={teachers?.map((t) => ({ value: t.id, label: t.fullName }))}
                  value={teacherId}
                  onValueChange={(v) => v && setTeacherId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" disabled={upsert.isPending} onClick={() => saveEdit(day)}>
                    {upsert.isPending ? "Menyimpan..." : "Simpan"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    Batal
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
                    {classItem.teacherName} · {classItem.scheduleStartTime}-{classItem.scheduleEndTime} (default)
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" onClick={() => startEdit(day)}>
                  {override ? "Edit" : "Set Override"}
                </Button>
                {override && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={del.isPending}
                    onClick={() => del.mutate(override.id)}
                  >
                    Hapus
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
