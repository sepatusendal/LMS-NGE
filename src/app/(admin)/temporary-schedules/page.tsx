"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useTemporarySchedules } from "@/features/temporary-schedules/use-temporary-schedules";
import { createTemporaryScheduleColumns } from "@/features/temporary-schedules/columns";
import { TemporaryScheduleDialog } from "@/features/temporary-schedules/temporary-schedule-dialog";

export default function TemporarySchedulesPage() {
  const t = useTranslations("admin.temporarySchedules");
  const locale = useLocale();
  const { data: batches, isLoading, isError } = useTemporarySchedules();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns = useMemo(() => createTemporaryScheduleColumns(t, locale), [t, locale]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
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

      <TemporaryScheduleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
