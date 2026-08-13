"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useClasses } from "@/features/classes/use-classes";
import { createClassColumns } from "@/features/classes/columns";
import { ClassFormDialog } from "@/features/classes/class-form-dialog";
import type { Class } from "@/features/classes/schema";

export default function TeacherTrainingClassesPage() {
  const { data: classes, isLoading } = useClasses("TEACHER_TRAINING");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Class | undefined>();

  const columns = useMemo(
    () =>
      createClassColumns((classItem) => {
        setEditing(classItem);
        setDialogOpen(true);
      }, "TEACHER_TRAINING"),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Kelas Guru & Staff</h1>
          <p className="text-muted-foreground text-sm">
            Kelas English training untuk guru, staf, dan karyawan — terpisah dari kelas siswa.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setDialogOpen(true);
          }}
        >
          Tambah Kelas
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={classes ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari kelas..."
      />

      <ClassFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classItem={editing}
        classType="TEACHER_TRAINING"
      />
    </div>
  );
}
