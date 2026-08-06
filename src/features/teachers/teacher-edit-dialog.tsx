"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { teacherEditSchema, type Teacher, type TeacherEditInput } from "./schema";
import { useUpdateTeacher } from "./use-teachers";

export function TeacherEditDialog({
  open,
  onOpenChange,
  teacher,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: Teacher;
}) {
  const updateTeacher = useUpdateTeacher();

  const { register, handleSubmit, reset } = useForm<TeacherEditInput>({
    resolver: zodResolver(teacherEditSchema),
  });

  useEffect(() => {
    if (open) reset({ phone: teacher?.phone ?? "" });
  }, [open, teacher, reset]);

  async function onSubmit(values: TeacherEditInput) {
    if (!teacher) return;
    await updateTeacher.mutateAsync({ id: teacher.id, input: values });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
        </DialogHeader>
        <div className="text-muted-foreground -mt-2 text-sm">
          {teacher?.fullName} · {teacher?.email}
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">No. HP</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateTeacher.isPending}>
              {updateTeacher.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
