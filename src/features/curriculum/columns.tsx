"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { Curriculum } from "./schema";
import { useSetCurriculumActive } from "./use-curriculum";

function ActiveToggleCell({ curriculum }: { curriculum: Curriculum }) {
  const tCommon = useTranslations("common");
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
        {curriculum.isActive ? tCommon("active") : tCommon("inactive")}
      </Badge>
    </div>
  );
}

export function createCurriculumColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  onEdit: (curriculum: Curriculum) => void,
  onModule: (curriculum: Curriculum) => void,
): ColumnDef<Curriculum>[] {
  return [
    { accessorKey: "name", header: t("nameHeader") },
    { accessorKey: "gradeLevel", header: "Grade Level" },
    {
      accessorKey: "description",
      header: t("description"),
      cell: ({ row }) => row.original.description || "-",
    },
    {
      accessorKey: "isActive",
      header: tCommon("status"),
      cell: ({ row }) => <ActiveToggleCell curriculum={row.original} />,
    },
    {
      id: "module",
      header: t("module"),
      cell: ({ row }) => (
        <Button
          variant={row.original.moduleDriveFileId ? "secondary" : "outline"}
          size="sm"
          onClick={() => onModule(row.original)}
        >
          <FileText className="size-3.5" />
          <span className="ml-1.5">
            {row.original.moduleDriveFileId ? t("module") : t("upload")}
          </span>
        </Button>
      ),
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
