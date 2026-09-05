"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Student } from "./schema";
import { useSetStudentActive } from "./use-students";

function ActiveToggleCell({ student }: { student: Student }) {
  const tCommon = useTranslations("common");
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
        {student.isActive ? tCommon("active") : tCommon("inactive")}
      </Badge>
    </div>
  );
}

export function createStudentColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  onEdit: (student: Student) => void,
): ColumnDef<Student>[] {
  return [
    { accessorKey: "fullName", header: t("nameHeader") },
    {
      accessorKey: "nis",
      header: "NIS",
      cell: ({ row }) => row.original.nis || "-",
    },
    { accessorKey: "schoolName", header: tCommon("school") },
    {
      accessorKey: "isActive",
      header: tCommon("status"),
      cell: ({ row }) => <ActiveToggleCell student={row.original} />,
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
