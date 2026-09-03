"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { useClasses } from "@/features/classes/use-classes";
import { createClassColumns } from "@/features/classes/columns";
import { CLASS_EXPORT_COLUMNS } from "@/features/classes/export-columns";
import { ClassFormDialog } from "@/features/classes/class-form-dialog";
import type { Class } from "@/features/classes/schema";

export default function ClassesPage() {
  const { data: classes, isLoading, isError } = useClasses("REGULAR");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Class | undefined>();

  const columns = useMemo(
    () =>
      createClassColumns((classItem) => {
        setEditing(classItem);
        setDialogOpen(true);
      }, "REGULAR"),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Kelas</h1>
          <p className="text-muted-foreground text-sm">
            Kelola kelas, jadwal, dan penugasan teacher.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton
            filename="daftar-kelas"
            sheets={[{ name: "Kelas", columns: CLASS_EXPORT_COLUMNS, rows: classes ?? [] }]}
          />
          <Button
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            Tambah Kelas
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={classes ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder="Cari kelas..."
      />

      <ClassFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classItem={editing}
      />
    </div>
  );
}
