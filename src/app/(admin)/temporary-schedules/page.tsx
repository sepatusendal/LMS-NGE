"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { buildDayLabelShort } from "@/features/classes/schema";
import { useTemporarySchedules } from "@/features/temporary-schedules/use-temporary-schedules";
import { createTemporaryScheduleColumns } from "@/features/temporary-schedules/columns";
import { TemporaryScheduleDialog } from "@/features/temporary-schedules/temporary-schedule-dialog";
import type { TemporaryScheduleBatch } from "@/features/temporary-schedules/schema";

export default function TemporarySchedulesPage() {
  const t = useTranslations("admin.temporarySchedules");
  const tDay = useTranslations("jadwal.day");
  const locale = useLocale();
  const { data: batches, isLoading, isError } = useTemporarySchedules();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<TemporaryScheduleBatch | null>(null);

  const dayLabel = useMemo(() => buildDayLabelShort(tDay), [tDay]);
  const columns = useMemo(
    () =>
      createTemporaryScheduleColumns(t, locale, dayLabel, (batch) => {
        setEditingBatch(batch);
        setDialogOpen(true);
      }),
    [t, locale, dayLabel],
  );

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingBatch(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            setEditingBatch(null);
            setDialogOpen(true);
          }}
        >
          <Plus />
          {t("addTitle")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={batches ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder={t("searchPlaceholder")}
      />

      <TemporaryScheduleDialog open={dialogOpen} onOpenChange={handleDialogOpenChange} editingBatch={editingBatch} />
    </div>
  );
}
