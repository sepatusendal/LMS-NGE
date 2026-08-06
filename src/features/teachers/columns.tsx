"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Teacher } from "./schema";
import { useSetTeacherActive } from "./use-teachers";

function ActiveToggleCell({ teacher }: { teacher: Teacher }) {
  const setActive = useSetTeacherActive();
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={teacher.isActive}
        onCheckedChange={(checked) =>
          setActive.mutate({ id: teacher.id, isActive: checked })
        }
      />
      <Badge variant={teacher.isActive ? "default" : "secondary"}>
        {teacher.isActive ? "Aktif" : "Nonaktif"}
      </Badge>
    </div>
  );
}

export function createTeacherColumns(
  onEdit: (teacher: Teacher) => void,
): ColumnDef<Teacher>[] {
  return [
    { accessorKey: "fullName", header: "Nama" },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "phone",
      header: "No. HP",
      cell: ({ row }) => row.original.phone || "-",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <ActiveToggleCell teacher={row.original} />,
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
