"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Curriculum } from "./schema";
import { useSetCurriculumActive } from "./use-curriculum";

function ActiveToggleCell({ curriculum }: { curriculum: Curriculum }) {
  const setActive = useSetCurriculumActive();
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={curriculum.isActive}
        onCheckedChange={(checked) =>
          setActive.mutate({ id: curriculum.id, isActive: checked })
        }
      />
      <Badge variant={curriculum.isActive ? "default" : "secondary"}>
        {curriculum.isActive ? "Aktif" : "Nonaktif"}
      </Badge>
    </div>
  );
}

export function createCurriculumColumns(
  onEdit: (curriculum: Curriculum) => void,
): ColumnDef<Curriculum>[] {
  return [
    { accessorKey: "name", header: "Nama Kurikulum" },
    { accessorKey: "gradeLevel", header: "Grade Level" },
    {
      accessorKey: "description",
      header: "Deskripsi",
      cell: ({ row }) => row.original.description || "-",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <ActiveToggleCell curriculum={row.original} />,
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
