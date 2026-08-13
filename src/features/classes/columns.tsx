"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { formatScheduleSlots, type Class, type ClassType } from "./schema";
import { useSetClassActive } from "./use-classes";

function ActiveToggleCell({ classItem, classType }: { classItem: Class; classType: ClassType }) {
  const setActive = useSetClassActive(classType);
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={classItem.isActive}
        disabled={setActive.isPending}
        onCheckedChange={(checked) =>
          setActive.mutate({ id: classItem.id, isActive: checked })
        }
      />
      <Badge variant={classItem.isActive ? "default" : "secondary"}>
        {classItem.isActive ? "Aktif" : "Nonaktif"}
      </Badge>
    </div>
  );
}

export function createClassColumns(
  onEdit: (classItem: Class) => void,
  classType: ClassType = "REGULAR",
): ColumnDef<Class>[] {
  return [
    {
      accessorKey: "name",
      header: "Nama Kelas",
      cell: ({ row }) => (
        <Link
          href={`/classes/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: "schoolName", header: "Sekolah" },
    { accessorKey: "teacherName", header: "Teacher" },
    {
      accessorKey: "room",
      header: "Ruang",
      cell: ({ row }) => row.original.room || "-",
    },
    {
      id: "schedule",
      header: "Jadwal",
      cell: ({ row }) => formatScheduleSlots(row.original.scheduleSlots),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <ActiveToggleCell classItem={row.original} classType={classType} />,
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
