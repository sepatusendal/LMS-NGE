"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useCurriculums } from "@/features/curriculum/use-curriculum";
import { createCurriculumColumns } from "@/features/curriculum/columns";
import { CurriculumFormDialog } from "@/features/curriculum/curriculum-form-dialog";
import { CurriculumModuleDialog } from "@/features/curriculum/curriculum-module-dialog";
import type { Curriculum } from "@/features/curriculum/schema";

export default function CurriculumPage() {
  const t = useTranslations("admin.curriculum");
  const tCommon = useTranslations("common");
  const { data: curriculums, isLoading, isError } = useCurriculums();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Curriculum | undefined>();
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleCurriculumId, setModuleCurriculumId] = useState<string | undefined>();
  // Look the curriculum up live from the list (rather than holding a
  // snapshot) so the dialog reflects the module just uploaded/removed once
  // the query invalidation refetches.
  const moduleCurriculum = curriculums?.find((c) => c.id === moduleCurriculumId);

  const columns = useMemo(
    () =>
      createCurriculumColumns(
        t,
        tCommon,
        (curriculum) => {
          setEditing(curriculum);
          setDialogOpen(true);
        },
        (curriculum) => {
          setModuleCurriculumId(curriculum.id);
          setModuleDialogOpen(true);
        },
      ),
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
            setEditing(undefined);
            setDialogOpen(true);
          }}
        >
          {t("addTitle")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={curriculums ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder={t("searchPlaceholder")}
      />

      <CurriculumFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        curriculum={editing}
      />

      <CurriculumModuleDialog
        open={moduleDialogOpen}
        onOpenChange={setModuleDialogOpen}
        curriculum={moduleCurriculum}
      />
    </div>
  );
}
