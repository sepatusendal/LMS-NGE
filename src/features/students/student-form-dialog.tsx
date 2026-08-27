"use client";

import { useEffect, useMemo } from "react";
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
import { useClasses } from "@/features/classes/use-classes";
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
  const { data: classes } = useClasses(undefined, open && !isEdit);
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentInput>({ resolver: zodResolver(studentSchema) });

  useEffect(() => {
    if (open) {
      reset({
        fullName: student?.fullName ?? "",
        schoolId: student?.schoolId ?? defaultSchoolId ?? "",
        nis: student?.nis ?? "",
        classId: "",
      });
    }
  }, [open, student, defaultSchoolId, reset]);

  const selectedSchoolId = watch("schoolId");
  const schoolClasses = useMemo(
    () => (classes ?? []).filter((c) => c.schoolId === selectedSchoolId),
    [classes, selectedSchoolId],
  );

  // Assigning to a class only applies at creation — editing a student here
  // doesn't touch enrollments, that stays a job for the class detail page.
  useEffect(() => {
    if (!isEdit) setValue("classId", "");
  }, [selectedSchoolId, isEdit, setValue]);

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
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="classId">Assign ke Kelas (opsional)</Label>
              <Controller
                control={control}
                name="classId"
                render={({ field }) => (
                  <Select
                    items={schoolClasses.map((c) => ({ value: c.id, label: c.name }))}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedSchoolId}
                  >
                    <SelectTrigger id="classId" className="w-full">
                      <SelectValue
                        placeholder={
                          selectedSchoolId
                            ? "Pilih kelas (opsional)"
                            : "Pilih sekolah dulu"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {schoolClasses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-muted-foreground text-xs">
                Siswa akan otomatis terdaftar ke kelas ini setelah disimpan.
              </p>
            </div>
          )}
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
