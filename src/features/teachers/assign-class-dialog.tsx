"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClasses } from "@/features/classes/use-classes";
import { useScheduleOverrides } from "@/features/classes/use-schedule-overrides";
import { buildDayLabel, getSlotForDay } from "@/features/classes/schema";
import { useAssignTeacherToClassDay } from "./use-teacher-assignments";
import type { Teacher } from "./schema";

export function AssignClassDialog({
  open,
  onOpenChange,
  teacher,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher: Teacher;
}) {
  const t = useTranslations("admin.teachers.assignments");
  const tCommon = useTranslations("common");
  const tDay = useTranslations("jadwal.day");
  const DAY_LABEL = buildDayLabel(tDay);
  const { data: classes } = useClasses(undefined, open);
  const assign = useAssignTeacherToClassDay(teacher.id);

  const [classId, setClassId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const selectedClass = classes?.find((c) => c.id === classId);
  const { data: overrides } = useScheduleOverrides(classId);
  const overrideByDay = new Map((overrides ?? []).map((o) => [o.dayOfWeek, o]));

  function selectClass(id: string) {
    setClassId(id);
    setDayOfWeek(null);
    setStartTime("");
    setEndTime("");
  }

  function selectDay(day: number) {
    setDayOfWeek(day);
    const override = overrideByDay.get(day);
    const slot = selectedClass ? getSlotForDay(selectedClass.scheduleSlots, day) : null;
    setStartTime(override?.startTime ?? slot?.startTime ?? "");
    setEndTime(override?.endTime ?? slot?.endTime ?? "");
  }

  function reset() {
    setClassId("");
    setDayOfWeek(null);
    setStartTime("");
    setEndTime("");
  }

  async function onAssign() {
    if (!classId || dayOfWeek === null || !startTime || !endTime) return;
    await assign.mutateAsync({ classId, dayOfWeek, startTime, endTime, teacherId: teacher.id });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("assignDialogTitle", { teacher: teacher.fullName })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>{t("selectClass")}</Label>
            <Select
              items={classes?.map((c) => ({ value: c.id, label: `${c.name} (${c.schoolName})` }))}
              value={classId}
              onValueChange={(v) => v && selectClass(v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectClass")} />
              </SelectTrigger>
              <SelectContent>
                {classes?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.schoolName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClass && (
            <div className="space-y-2">
              <Label>{t("selectDay")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {selectedClass.scheduleDaysOfWeek.map((day) => {
                  const slot = getSlotForDay(selectedClass.scheduleSlots, day);
                  const override = overrideByDay.get(day);
                  const currentTeacher = override?.teacherName ?? selectedClass.teacherName;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`rounded-lg border p-2 text-left text-sm transition-colors ${
                        dayOfWeek === day ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                      }`}
                    >
                      <p className="font-medium">{DAY_LABEL[String(day)]}</p>
                      <p className="text-muted-foreground text-xs">
                        {slot ? `${slot.startTime}-${slot.endTime}` : "-"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t("currentlyBy", { teacher: currentTeacher })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {dayOfWeek !== null && (
            <div className="space-y-2">
              <Label>{t("timeLabel")}</Label>
              <div className="flex items-center gap-2">
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                <span className="text-muted-foreground text-sm">–</span>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={!classId || dayOfWeek === null || !startTime || !endTime || assign.isPending}
            onClick={onAssign}
          >
            {assign.isPending ? tCommon("saving") : t("assignButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
