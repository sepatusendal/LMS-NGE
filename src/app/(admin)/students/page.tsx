"use client";

import { useMemo, useState } from "react";
import { Search, School } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { useSchools } from "@/features/schools/use-schools";
import { useStudents } from "@/features/students/use-students";
import { createStudentColumns } from "@/features/students/columns";
import { StudentFormDialog } from "@/features/students/student-form-dialog";
import type { Student } from "@/features/students/schema";

export default function StudentsPage() {
  const t = useTranslations("admin.students");
  const tCommon = useTranslations("common");
  const { data: schools } = useSchools();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const { data: students, isLoading, isError } = useStudents(
    selectedSchoolId || undefined,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | undefined>();

  const columns = useMemo(
    () =>
      createStudentColumns(t, tCommon, (student) => {
        setEditing(student);
        setDialogOpen(true);
      }),
    [t, tCommon],
  );

  const selectedSchool = schools?.find((s) => s.id === selectedSchoolId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        {selectedSchoolId && (
          <Button
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            {t("addTitle")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <School className="text-muted-foreground size-4 shrink-0" />
          <Select
            items={
              schools?.map((s) => ({ value: s.id, label: s.name })) ?? []
            }
            value={selectedSchoolId}
            onValueChange={(v) => v && setSelectedSchoolId(v)}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={t("selectSchoolEllipsis")} />
            </SelectTrigger>
            <SelectContent>
              {schools?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedSchoolId ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-full">
            <Search className="text-muted-foreground size-6" />
          </div>
          <p className="text-muted-foreground text-sm">{t("selectSchoolPrompt")}</p>
        </div>
      ) : (
        <>
          {selectedSchool && (
            <p className="text-muted-foreground text-sm">
              {t("showingStudentsOf", { school: selectedSchool.name })}
              {students && ` (${students.length})`}
            </p>
          )}
          <DataTable
            columns={columns}
            data={students ?? []}
            isLoading={isLoading}
            isError={isError}
            searchPlaceholder={t("searchPlaceholder")}
          />
        </>
      )}

      <StudentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        student={editing}
        defaultSchoolId={selectedSchoolId}
      />
    </div>
  );
}
