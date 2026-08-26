"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseLocalDate } from "@/lib/date";
import type { Holiday } from "./schema";
import { useDeleteHoliday } from "./use-holidays";

function DeleteCell({ holiday }: { holiday: Holiday }) {
  const del = useDeleteHoliday();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={del.isPending}
      onClick={() => del.mutate(holiday.id)}
    >
      Hapus
    </Button>
  );
}

export function createHolidayColumns(): ColumnDef<Holiday>[] {
  return [
    {
      accessorKey: "date",
      header: "Tanggal",
      cell: ({ row }) =>
        parseLocalDate(row.original.date).toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
    },
    { accessorKey: "name", header: "Nama" },
    {
      accessorKey: "schoolName",
      header: "Sekolah",
      cell: ({ row }) =>
        row.original.schoolName ?? (
          <Badge variant="secondary">Semua Sekolah</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <DeleteCell holiday={row.original} />,
    },
  ];
}
