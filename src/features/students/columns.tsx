"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { StudentEnrollment } from "@/features/classes/roster-queries";
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
  onManageClasses: (student: Student) => void,
  enrollmentsByStudent: Map<string, StudentEnrollment[]>,
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
      id: "classes",
      header: t("classesHeader"),
      accessorFn: (s) =>
        (enrollmentsByStudent.get(s.id) ?? []).map((e) => e.className).join(", "),
      cell: ({ row }) => {
        const list = enrollmentsByStudent.get(row.original.id) ?? [];
        if (list.length === 0) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {list.map((e) => (
              <Badge key={e.enrollmentId} variant="outline">
                {e.className}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: tCommon("status"),
      cell: ({ row }) => <ActiveToggleCell student={row.original} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => onManageClasses(row.original)}>
            {t("manageClasses")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
            {tCommon("edit")}
          </Button>
        </div>
      ),
    },
  ];
}
