"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PencilLine, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { buildDayLabelShort, formatScheduleSlots, type Class, type ClassType } from "./schema";
import { useDeleteClass, useSetClassActive } from "./use-classes";

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

function RowActionsCell({
  classItem,
  tCommon,
  onEdit,
  classType,
}: {
  classItem: Class;
  tCommon: (key: string) => string;
  onEdit: (classItem: Class) => void;
  classType: ClassType;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteClass = useDeleteClass(classType);

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon-sm" onClick={() => onEdit(classItem)} aria-label={tCommon("edit")}>
        <PencilLine />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setConfirmOpen(true)}
        aria-label={tCommon("delete")}
      >
        <Trash2 />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`${tCommon("delete")} "${classItem.name}"?`}
        description={tCommon("confirmDeleteDescription")}
        isConfirming={deleteClass.isPending}
        onConfirm={() =>
          deleteClass.mutate(classItem.id, { onSuccess: () => setConfirmOpen(false) })
        }
      />
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
        <RowActionsCell classItem={row.original} tCommon={tCommon} onEdit={onEdit} classType={classType} />
      ),
    },
  ];
}
