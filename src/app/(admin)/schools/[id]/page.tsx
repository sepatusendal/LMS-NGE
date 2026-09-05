"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Users, BookOpen, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { useSchools } from "@/features/schools/use-schools";
import { useStudents } from "@/features/students/use-students";
import { createStudentColumns } from "@/features/students/columns";
import { StudentFormDialog } from "@/features/students/student-form-dialog";
import { useClasses } from "@/features/classes/use-classes";
import { ClassFormDialog } from "@/features/classes/class-form-dialog";
import { formatScheduleSlots } from "@/features/classes/schema";
import type { Student } from "@/features/students/schema";
import type { Class } from "@/features/classes/schema";

export default function SchoolDetailPage() {
  const t = useTranslations("admin.schools.detail");
  const tStudents = useTranslations("admin.students");
  const tCommon = useTranslations("common");
  const params = useParams<{ id: string }>();
  const schoolId = params.id;
  const { data: schools } = useSchools();
  const school = schools?.find((s) => s.id === schoolId);
  const { data: students, isLoading: studentsLoading, isError: studentsError } = useStudents(schoolId);
  const { data: classes } = useClasses();
  const schoolClasses = (classes ?? []).filter((c) => c.schoolId === schoolId && c.isActive);

  const [tab, setTab] = useState<"siswa" | "kelas">("siswa");
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | undefined>();

  const studentColumns = useMemo(
    () =>
      createStudentColumns(tStudents, tCommon, (student) => {
        setEditingStudent(student);
        setStudentDialogOpen(true);
      }),
    [tStudents, tCommon],
  );

  if (!school) {
    return (
      <div className="space-y-4">
        <Link href="/schools" className="text-muted-foreground text-sm hover:underline">
          {t("back")}
        </Link>
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/schools" className="text-muted-foreground text-sm hover:underline">
          {t("back")}
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{school.name}</h1>
            {school.address && (
              <p className="text-muted-foreground text-sm">{school.address}</p>
            )}
            {school.picName && (
              <p className="text-muted-foreground text-xs mt-1">
                {t("pic")}: {school.picName}{school.picPhone ? ` (${school.picPhone})` : ""}
              </p>
            )}
          </div>
          <Badge variant={school.isActive ? "default" : "secondary"}>
            {school.isActive ? tCommon("active") : tCommon("inactive")}
          </Badge>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("siswa")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab === "siswa"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="size-4" />
          {t("tabStudents")}
          {students && (
            <span className="bg-muted rounded-full px-1.5 text-xs">{students.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("kelas")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            tab === "kelas"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="size-4" />
          {t("tabClasses")}
          <span className="bg-muted rounded-full px-1.5 text-xs">{schoolClasses.length}</span>
        </button>
      </div>

      {tab === "siswa" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {t("studentsInSchool", { school: school.name })}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingStudent(undefined);
                setStudentDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("addStudent")}
            </Button>
          </div>
          <DataTable
            columns={studentColumns}
            data={students ?? []}
            isLoading={studentsLoading}
            isError={studentsError}
            searchPlaceholder={t("searchStudentPlaceholder")}
          />
          <StudentFormDialog
            open={studentDialogOpen}
            onOpenChange={setStudentDialogOpen}
            student={editingStudent}
            defaultSchoolId={schoolId}
          />
        </div>
      )}

      {tab === "kelas" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {t("classesInSchool", { school: school.name })}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingClass(undefined);
                setClassDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              {t("addClass")}
            </Button>
          </div>
          {schoolClasses.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center text-sm">
                {t("noClasses")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {schoolClasses.map((cls) => {
                return (
                  <Link key={cls.id} href={`/classes/${cls.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors">
                      <CardContent className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium">{cls.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {cls.teacherName}
                            {cls.curriculumName ? ` · ${cls.curriculumName}` : ""}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatScheduleSlots(cls.scheduleSlots)}
                            {cls.room ? ` · R.${cls.room}` : ""}
                          </p>
                        </div>
                        <Badge variant={cls.isActive ? "default" : "secondary"}>
                          {cls.isActive ? tCommon("active") : tCommon("inactive")}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
          <ClassFormDialog
            open={classDialogOpen}
            onOpenChange={setClassDialogOpen}
            classItem={editingClass}
          />
        </div>
      )}
    </div>
  );
}
