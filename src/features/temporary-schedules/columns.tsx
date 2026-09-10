"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseLocalDate } from "@/lib/date";
import type { TemporaryScheduleBatch } from "./schema";
import { useDeleteTemporaryScheduleBatch } from "./use-temporary-schedules";

function formatDate(date: string, locale: string) {
  return parseLocalDate(date).toLocaleDateString(locale === "en" ? "en-US" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DeleteCell({ batch }: { batch: TemporaryScheduleBatch }) {
  const tCommon = useTranslations("common");
  const del = useDeleteTemporaryScheduleBatch();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={del.isPending}
      onClick={() => {
        if (window.confirm(tCommon("confirmDeleteDescription"))) {
          del.mutate(batch.batchId);
        }
      }}
    >
      {tCommon("delete")}
    </Button>
  );
}

export function createTemporaryScheduleColumns(
  t: (key: string) => string,
  locale: string,
): ColumnDef<TemporaryScheduleBatch>[] {
  return [
    {
      id: "period",
      header: t("period"),
      cell: ({ row }) =>
        `${formatDate(row.original.dateFrom, locale)} – ${formatDate(row.original.dateTo, locale)}`,
    },
    {
      id: "time",
      header: t("newTime"),
      cell: ({ row }) => `${row.original.startTime}–${row.original.endTime}`,
    },
    {
      id: "classes",
      header: t("classesHeader"),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.classNames.slice(0, 3).map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
          {row.original.classNames.length > 3 && (
            <Badge variant="secondary">+{row.original.classNames.length - 3}</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "label",
      header: t("label"),
      cell: ({ row }) => row.original.label || "-",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <DeleteCell batch={row.original} />,
    },
  ];
}
