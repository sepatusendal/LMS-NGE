"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useSchools } from "@/features/schools/use-schools";
import { createSchoolColumns } from "@/features/schools/columns";
import { SchoolFormDialog } from "@/features/schools/school-form-dialog";
import type { School } from "@/features/schools/schema";

export default function SchoolsPage() {
  const t = useTranslations("admin.schools");
  const tCommon = useTranslations("common");
  const { data: schools, isLoading, isError } = useSchools();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | undefined>();

  const columns = useMemo(
    () =>
      createSchoolColumns(t, tCommon, (school) => {
        setEditingSchool(school);
        setDialogOpen(true);
      }),
    [t, tCommon],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => {
            setEditingSchool(undefined);
            setDialogOpen(true);
          }}
        >
          {t("addTitle")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={schools ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder={t("searchPlaceholder")}
      />

      <SchoolFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        school={editingSchool}
      />
    </div>
  );
}
