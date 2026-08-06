"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchools } from "@/features/schools/use-schools";
import { studentSchema, type Student, type StudentInput } from "./schema";
import { useCreateStudent, useUpdateStudent } from "./use-students";

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
  defaultSchoolId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student;
  defaultSchoolId?: string;
}) {
  const isEdit = Boolean(student);
  const { data: schools } = useSchools();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentInput>({ resolver: zodResolver(studentSchema) });

  useEffect(() => {
    if (open) {
      reset({
        fullName: student?.fullName ?? "",
        schoolId: student?.schoolId ?? defaultSchoolId ?? "",
        nis: student?.nis ?? "",
      });
    }
  }, [open, student, defaultSchoolId, reset]);

  async function onSubmit(values: StudentInput) {
    if (isEdit && student) {
      await updateStudent.mutateAsync({ id: student.id, input: values });
    } else {
      await createStudent.mutateAsync(values);
    }
    onOpenChange(false);
  }

  const isSubmitting = createStudent.isPending || updateStudent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Siswa" : "Tambah Siswa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nama Siswa</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-destructive text-sm">
                {errors.fullName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nis">NIS (opsional)</Label>
            <Input id="nis" {...register("nis")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolId">Sekolah</Label>
            <Controller
              control={control}
              name="schoolId"
              render={({ field }) => (
                <Select
                  items={schools?.map((s) => ({ value: s.id, label: s.name }))}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="schoolId" className="w-full">
                    <SelectValue placeholder="Pilih sekolah" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools?.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.schoolId && (
              <p className="text-destructive text-sm">
                {errors.schoolId.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
