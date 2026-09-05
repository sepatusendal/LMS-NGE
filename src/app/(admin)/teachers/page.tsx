"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { useTeachers } from "@/features/teachers/use-teachers";
import { createTeacherColumns } from "@/features/teachers/columns";
import { TeacherCreateDialog } from "@/features/teachers/teacher-create-dialog";
import { TeacherEditDialog } from "@/features/teachers/teacher-edit-dialog";
import type { Teacher } from "@/features/teachers/schema";

export default function TeachersPage() {
  const t = useTranslations("admin.teachers");
  const tCommon = useTranslations("common");
  const { data: teachers, isLoading, isError } = useTeachers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | undefined>();

  const columns = useMemo(
    () =>
      createTeacherColumns(t, tCommon, (teacher) => {
        setEditing(teacher);
        setEditOpen(true);
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
        <Button onClick={() => setCreateOpen(true)}>{t("addTitle")}</Button>
      </div>

      <DataTable
        columns={columns}
        data={teachers ?? []}
        isLoading={isLoading}
        isError={isError}
        searchPlaceholder={t("searchPlaceholder")}
      />

      <TeacherCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TeacherEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        teacher={editing}
      />
    </div>
  );
}
