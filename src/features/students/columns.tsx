"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Student } from "./schema";
import { useSetStudentActive } from "./use-students";

function ActiveToggleCell({ student }: { student: Student }) {
  const setActive = useSetStudentActive();
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={student.isActive}
        disabled={setActive.isPending}
        onCheckedChange={(checked) =>
          setActive.mutate({ id: student.id, isActive: checked })
        }
      />
      <Badge variant={student.isActive ? "default" : "secondary"}>
        {student.isActive ? "Aktif" : "Nonaktif"}
      </Badge>
    </div>
  );
}

export function createStudentColumns(
  onEdit: (student: Student) => void,
): ColumnDef<Student>[] {
  return [
    { accessorKey: "fullName", header: "Nama Siswa" },
    {
      accessorKey: "nis",
      header: "NIS",
      cell: ({ row }) => row.original.nis || "-",
    },
    { accessorKey: "schoolName", header: "Sekolah" },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <ActiveToggleCell student={row.original} />,
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
