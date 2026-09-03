"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useHolidays } from "@/features/holidays/use-holidays";
import { createHolidayColumns } from "@/features/holidays/columns";
import { HolidayFormDialog } from "@/features/holidays/holiday-form-dialog";

export default function HolidaysPage() {
  const { data: holidays, isLoading, isError } = useHolidays();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns = useMemo(() => createHolidayColumns(), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Hari Libur</h1>
          <p className="text-muted-foreground text-sm">
            Kelola tanggal libur — kelas yang jadwalnya jatuh di tanggal ini
            otomatis dianggap tidak ada pertemuan.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Tambah Hari Libur</Button>
      </div>

      <DataTable
        columns={columns}
        data={holidays ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder="Cari hari libur..."
      />

      <HolidayFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
