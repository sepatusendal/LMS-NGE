"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { useClasses } from "@/features/classes/use-classes";
import { createClassColumns } from "@/features/classes/columns";
import { buildClassExportColumns } from "@/features/classes/export-columns";
import { ClassFormDialog } from "@/features/classes/class-form-dialog";
import type { Class } from "@/features/classes/schema";

export default function ClassesPage() {
  const t = useTranslations("admin.classes");
  const tCommon = useTranslations("common");
  const tDay = useTranslations("jadwal.day");
  const locale = useLocale();
  const { data: classes, isLoading, isError } = useClasses("REGULAR");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Class | undefined>();

  const columns = useMemo(
    () =>
      createClassColumns(t, tCommon, tDay, (classItem) => {
        setEditing(classItem);
        setDialogOpen(true);
      }, "REGULAR"),
    [t, tCommon, tDay],
  );

  const exportColumns = useMemo(
    () => buildClassExportColumns(t, tCommon, locale),
    [t, tCommon, locale],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton
            filename="daftar-kelas"
            sheets={[{ name: t("title"), columns: exportColumns, rows: classes ?? [] }]}
          />
          <Button
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            {t("addTitle")}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={classes ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder={t("searchPlaceholder")}
      />

      <ClassFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classItem={editing}
      />
    </div>
  );
}
