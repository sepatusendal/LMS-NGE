"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { School } from "./schema";
import { useSetSchoolActive } from "./use-schools";

function ActiveToggleCell({ school }: { school: School }) {
  const setActive = useSetSchoolActive();
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={school.isActive}
        onCheckedChange={(checked) =>
          setActive.mutate({ id: school.id, isActive: checked })
        }
      />
      <Badge variant={school.isActive ? "default" : "secondary"}>
        {school.isActive ? "Aktif" : "Nonaktif"}
      </Badge>
    </div>
  );
}

export function createSchoolColumns(
  onEdit: (school: School) => void,
): ColumnDef<School>[] {
  return [
    {
      accessorKey: "name",
      header: "Nama Sekolah",
      cell: ({ row }) => (
        <Link
          href={`/schools/${row.original.id}`}
          className="text-primary font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "address",
      header: "Alamat",
      cell: ({ row }) => row.original.address || "-",
    },
    {
      accessorKey: "picName",
      header: "PIC",
      cell: ({ row }) =>
        row.original.picName
          ? `${row.original.picName}${row.original.picPhone ? ` (${row.original.picPhone})` : ""}`
          : "-",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <ActiveToggleCell school={row.original} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
          Edit
        </Button>
      ),
    },
  ];
}
