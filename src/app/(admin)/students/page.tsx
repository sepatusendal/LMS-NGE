"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useStudents } from "@/features/students/use-students";
import { createStudentColumns } from "@/features/students/columns";
import { StudentFormDialog } from "@/features/students/student-form-dialog";
import type { Student } from "@/features/students/schema";

export default function StudentsPage() {
  const { data: students, isLoading } = useStudents();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | undefined>();

  const columns = useMemo(
    () =>
      createStudentColumns((student) => {
        setEditing(student);
        setDialogOpen(true);
      }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Siswa</h1>
          <p className="text-muted-foreground text-sm">
            Kelola daftar siswa per sekolah.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setDialogOpen(true);
          }}
        >
          Tambah Siswa
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={students ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari siswa..."
      />

      <StudentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        student={editing}
      />
    </div>
  );
}
