"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useCurriculums } from "@/features/curriculum/use-curriculum";
import { createCurriculumColumns } from "@/features/curriculum/columns";
import { CurriculumFormDialog } from "@/features/curriculum/curriculum-form-dialog";
import { CurriculumModuleDialog } from "@/features/curriculum/curriculum-module-dialog";
import type { Curriculum } from "@/features/curriculum/schema";

export default function CurriculumPage() {
  const { data: curriculums, isLoading } = useCurriculums();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Curriculum | undefined>();
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleCurriculumId, setModuleCurriculumId] = useState<string | undefined>();
  // Look the curriculum up live from the list (rather than holding a
  // snapshot) so the dialog reflects the module just uploaded/removed once
  // the query invalidation refetches.
  const moduleCurriculum = curriculums?.find((c) => c.id === moduleCurriculumId);

  const columns = useMemo(
    () =>
      createCurriculumColumns(
        (curriculum) => {
          setEditing(curriculum);
          setDialogOpen(true);
        },
        (curriculum) => {
          setModuleCurriculumId(curriculum.id);
          setModuleDialogOpen(true);
        },
      ),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Kurikulum</h1>
          <p className="text-muted-foreground text-sm">
            Kelola level dan kurikulum yang digunakan di kelas.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setDialogOpen(true);
          }}
        >
          Tambah Kurikulum
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={curriculums ?? []}
        isLoading={isLoading}
        searchPlaceholder="Cari kurikulum..."
      />

      <CurriculumFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        curriculum={editing}
      />

      <CurriculumModuleDialog
        open={moduleDialogOpen}
        onOpenChange={setModuleDialogOpen}
        curriculum={moduleCurriculum}
      />
    </div>
  );
}
