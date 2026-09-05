"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useHolidays } from "@/features/holidays/use-holidays";
import { createHolidayColumns } from "@/features/holidays/columns";
import { HolidayFormDialog } from "@/features/holidays/holiday-form-dialog";

export default function HolidaysPage() {
  const t = useTranslations("admin.holidays");
  const locale = useLocale();
  const { data: holidays, isLoading, isError } = useHolidays();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns = useMemo(() => createHolidayColumns(t, locale), [t, locale]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>{t("addTitle")}</Button>
      </div>

      <DataTable
        columns={columns}
        data={holidays ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder={t("searchPlaceholder")}
      />

      <HolidayFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
