"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClasses } from "@/features/classes/use-classes";
import type { Student } from "./schema";
import {
  useAssignStudentToClass,
  useMoveStudentToClass,
  useRemoveStudentFromClass,
  useSchoolEnrollments,
} from "./use-student-enrollments";

/** Admin-side class assignment for one student: add to several classes,
 * move between them, or remove — the roster stays editable from the class
 * detail page too, both write the same class_enrollments rows. */
export function StudentClassesDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student;
}) {
  const t = useTranslations("admin.students.classesDialog");
  const { data: classes } = useClasses(undefined, open);
  const { data: enrollments } = useSchoolEnrollments(open ? student?.schoolId : undefined);
  const assign = useAssignStudentToClass();
  const remove = useRemoveStudentFromClass();
  const move = useMoveStudentToClass();
  const [addValue, setAddValue] = useState("");

  const current = useMemo(
    () => (enrollments ?? []).filter((e) => e.studentId === student?.id),
    [enrollments, student?.id],
  );

  // Same school, active, and the matching kind (regular students only join
  // regular classes, Guru & Staff trainees only join training classes).
  const availableClasses = useMemo(() => {
    if (!student) return [];
    const enrolledIds = new Set(current.map((e) => e.classId));
    return (classes ?? []).filter(
      (c) =>
        c.schoolId === student.schoolId &&
        c.isActive &&
        c.classType === student.studentType &&
        !enrolledIds.has(c.id),
    );
  }, [classes, student, current]);

  const busy = assign.isPending || remove.isPending || move.isPending;
  const classItems = availableClasses.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title", { name: student?.fullName ?? "" })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("currentClasses")}</p>
          {current.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noClasses")}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {current.map((e) => (
                <li key={e.enrollmentId} className="flex items-center gap-2 p-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{e.className}</span>
                  <Select
                    items={classItems}
                    value=""
                    onValueChange={(toClassId) => {
                      if (!toClassId || !student) return;
                      move.mutate({
                        studentId: student.id,
                        fromEnrollmentId: e.enrollmentId,
                        toClassId,
                      });
                    }}
                    disabled={busy || classItems.length === 0}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t("moveTo")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(t("removeConfirm", { class: e.className }))) {
                        remove.mutate(e.enrollmentId);
                      }
                    }}
                  >
                    {t("remove")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("addToClass")}</p>
          <div className="flex items-center gap-2">
            <Select
              items={classItems}
              value={addValue}
              onValueChange={(v) => setAddValue(v ?? "")}
              disabled={classItems.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue
                  placeholder={classItems.length === 0 ? t("noMoreClasses") : t("selectClass")}
                />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!addValue || busy || !student}
              onClick={() => {
                if (!student) return;
                assign.mutate(
                  { studentId: student.id, classId: addValue },
                  { onSuccess: () => setAddValue("") },
                );
              }}
            >
              {t("add")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
