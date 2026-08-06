"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Users, BookOpen, Plus } from "lucide-react";
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
import { DAY_LABEL } from "@/features/classes/schema";
import type { Student } from "@/features/students/schema";
import type { Class } from "@/features/classes/schema";

export default function SchoolDetailPage() {
  const params = useParams<{ id: string }>();
  const schoolId = params.id;
  const { data: schools } = useSchools();
  const school = schools?.find((s) => s.id === schoolId);
  const { data: students, isLoading: studentsLoading } = useStudents(schoolId);
  const { data: classes } = useClasses();
  const schoolClasses = (classes ?? []).filter((c) => c.schoolId === schoolId && c.isActive);

  const [tab, setTab] = useState<"siswa" | "kelas">("siswa");
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>();
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | undefined>();

  const studentColumns = useMemo(
    () =>
      createStudentColumns((student) => {
        setEditingStudent(student);
        setStudentDialogOpen(true);
      }),
    [],
  );

  if (!school) {
    return (
      <div className="space-y-4">
        <Link href="/schools" className="text-muted-foreground text-sm hover:underline">
          ← Kembali ke Sekolah
        </Link>
        <p className="text-muted-foreground text-sm">Memuat data sekolah...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/schools" className="text-muted-foreground text-sm hover:underline">
          ← Kembali ke Sekolah
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">{school.name}</h1>
            {school.address && (
              <p className="text-muted-foreground text-sm">{school.address}</p>
            )}
            {school.picName && (
              <p className="text-muted-foreground text-xs mt-1">
                PIC: {school.picName}{school.picPhone ? ` (${school.picPhone})` : ""}
              </p>
            )}
          </div>
          <Badge variant={school.isActive ? "default" : "secondary"}>
            {school.isActive ? "Aktif" : "Nonaktif"}
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
          Siswa
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
          Kelas
          <span className="bg-muted rounded-full px-1.5 text-xs">{schoolClasses.length}</span>
        </button>
      </div>

      {tab === "siswa" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Daftar siswa di {school.name}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingStudent(undefined);
                setStudentDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Tambah Siswa
            </Button>
          </div>
          <DataTable
            columns={studentColumns}
            data={students ?? []}
            isLoading={studentsLoading}
            searchPlaceholder="Cari nama atau NIS..."
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
              Daftar kelas di {school.name}
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingClass(undefined);
                setClassDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Tambah Kelas
            </Button>
          </div>
          {schoolClasses.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center text-sm">
                Belum ada kelas di sekolah ini.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {schoolClasses.map((cls) => {
                const days = cls.scheduleDaysOfWeek
                  .map((d) => DAY_LABEL[String(d)])
                  .join(", ");
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
                            {cls.scheduleStartTime} - {cls.scheduleEndTime} · {days}
                            {cls.room ? ` · R.${cls.room}` : ""}
                          </p>
                        </div>
                        <Badge variant={cls.isActive ? "default" : "secondary"}>
                          {cls.isActive ? "Aktif" : "Nonaktif"}
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
