"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { DAY_OPTIONS, type Class } from "./schema";
import { useSetClassActive } from "./use-classes";

const DAY_LABEL = Object.fromEntries(DAY_OPTIONS.map((d) => [d.value, d.label]));

function ActiveToggleCell({ classItem }: { classItem: Class }) {
  const setActive = useSetClassActive();
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={classItem.isActive}
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
      cell: ({ row }) => {
        const days = row.original.scheduleDaysOfWeek
          .map((d) => DAY_LABEL[String(d)])
          .join(" & ");
        return `${days}, ${row.original.scheduleStartTime}-${row.original.scheduleEndTime}`;
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <ActiveToggleCell classItem={row.original} />,
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
