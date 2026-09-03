"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useTeachers } from "@/features/teachers/use-teachers";
import { createTeacherColumns } from "@/features/teachers/columns";
import { TeacherCreateDialog } from "@/features/teachers/teacher-create-dialog";
import { TeacherEditDialog } from "@/features/teachers/teacher-edit-dialog";
import type { Teacher } from "@/features/teachers/schema";

export default function TeachersPage() {
  const { data: teachers, isLoading, isError } = useTeachers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | undefined>();

  const columns = useMemo(
    () =>
      createTeacherColumns((teacher) => {
        setEditing(teacher);
        setEditOpen(true);
      }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Teacher</h1>
          <p className="text-muted-foreground text-sm">
            Kelola akun dan data teacher NGE.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Tambah Teacher</Button>
      </div>

      <DataTable
        columns={columns}
        data={teachers ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder="Cari teacher..."
      />

      <TeacherCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TeacherEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        teacher={editing}
      />
    </div>
  );
}
