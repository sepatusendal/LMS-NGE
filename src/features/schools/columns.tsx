"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { School } from "./schema";
import { useSetSchoolActive } from "./use-schools";

function ActiveToggleCell({ school }: { school: School }) {
  const tCommon = useTranslations("common");
  const setActive = useSetSchoolActive();
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={school.isActive}
        disabled={setActive.isPending}
        onCheckedChange={(checked) =>
          setActive.mutate({ id: school.id, isActive: checked })
        }
      />
      <Badge variant={school.isActive ? "default" : "secondary"}>
        {school.isActive ? tCommon("active") : tCommon("inactive")}
      </Badge>
    </div>
  );
}

export function createSchoolColumns(
  t: (key: string) => string,
  tCommon: (key: string) => string,
  onEdit: (school: School) => void,
): ColumnDef<School>[] {
  return [
    {
      accessorKey: "name",
      header: t("nameHeader"),
      cell: ({ row }) => (
        <Link
          href={`/schools/${row.original.id}`}
          className="text-primary font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "address",
      header: t("address"),
      cell: ({ row }) => row.original.address || "-",
    },
    {
      accessorKey: "picName",
      header: "PIC",
      cell: ({ row }) =>
        row.original.picName
          ? `${row.original.picName}${row.original.picPhone ? ` (${row.original.picPhone})` : ""}`
          : "-",
    },
    {
      accessorKey: "isActive",
      header: tCommon("status"),
      cell: ({ row }) => <ActiveToggleCell school={row.original} />,
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
