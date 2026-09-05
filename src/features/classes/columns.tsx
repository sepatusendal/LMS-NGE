"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { buildDayLabelShort, formatScheduleSlots, type Class, type ClassType } from "./schema";
import { useSetClassActive } from "./use-classes";

function ActiveToggleCell({ classItem, classType }: { classItem: Class; classType: ClassType }) {
  const tCommon = useTranslations("common");
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
        {classItem.isActive ? tCommon("active") : tCommon("inactive")}
      </Badge>
    </div>
  );
}

export function createClassColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  tDay: (key: string) => string,
  onEdit: (classItem: Class) => void,
  classType: ClassType = "REGULAR",
): ColumnDef<Class>[] {
  const dayLabels = buildDayLabelShort(tDay);
  return [
    {
      accessorKey: "name",
      header: t("nameHeader"),
      cell: ({ row }) => (
        <Link
          href={`/classes/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    { accessorKey: "schoolName", header: tCommon("school") },
    { accessorKey: "teacherName", header: "Teacher" },
    {
      accessorKey: "room",
      header: t("room"),
      cell: ({ row }) => row.original.room || "-",
    },
    {
      id: "schedule",
      header: t("schedule"),
      cell: ({ row }) => formatScheduleSlots(row.original.scheduleSlots, dayLabels),
    },
    {
      accessorKey: "isActive",
      header: tCommon("status"),
      cell: ({ row }) => <ActiveToggleCell classItem={row.original} classType={classType} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
          {tCommon("edit")}
        </Button>
      ),
    },
  ];
}
