"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useSchools } from "@/features/schools/use-schools";
import { createSchoolColumns } from "@/features/schools/columns";
import { SchoolFormDialog } from "@/features/schools/school-form-dialog";
import type { School } from "@/features/schools/schema";

export default function SchoolsPage() {
  const { data: schools, isLoading, isError } = useSchools();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | undefined>();

  const columns = useMemo(
    () =>
      createSchoolColumns((school) => {
        setEditingSchool(school);
        setDialogOpen(true);
      }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sekolah</h1>
          <p className="text-muted-foreground text-sm">
            Kelola daftar sekolah mitra NGE.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingSchool(undefined);
            setDialogOpen(true);
          }}
        >
          Tambah Sekolah
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={schools ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder="Cari sekolah..."
      />

      <SchoolFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        school={editingSchool}
      />
    </div>
  );
}
