"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseLocalDate } from "@/lib/date";
import type { Holiday } from "./schema";
import { useDeleteHoliday } from "./use-holidays";

function DeleteCell({ holiday }: { holiday: Holiday }) {
  const tCommon = useTranslations("common");
  const del = useDeleteHoliday();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={del.isPending}
      onClick={() => del.mutate(holiday.id)}
    >
      {tCommon("delete")}
    </Button>
  );
}

export function createHolidayColumns(
  t: (key: string) => string,
  locale: string,
): ColumnDef<Holiday>[] {
  return [
    {
      accessorKey: "date",
      header: t("date"),
      cell: ({ row }) =>
        parseLocalDate(row.original.date).toLocaleDateString(
          locale === "en" ? "en-US" : "id-ID",
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          },
        ),
    },
    { accessorKey: "name", header: t("name") },
    {
      accessorKey: "schoolName",
      header: t("school"),
      cell: ({ row }) =>
        row.original.schoolName ?? (
          <Badge variant="secondary">{t("allSchools")}</Badge>
        ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <DeleteCell holiday={row.original} />,
    },
  ];
}
