"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClasses } from "@/features/classes/use-classes";
import { useStudents } from "@/features/students/use-students";
import {
  useClassRoster,
  useEnrollStudent,
  useUnenrollStudent,
} from "@/features/classes/use-roster";
import { formatScheduleSlots } from "@/features/classes/schema";
import { ScheduleOverridesPanel } from "@/features/classes/schedule-overrides-panel";
import { SubstitutePanel } from "@/features/substitutes/substitute-panel";
import { ClassTimeline } from "@/features/meetings/class-timeline";

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const router = useRouter();

  const { data: classes } = useClasses();
  const classItem = classes?.find((c) => c.id === classId);

  const { data: roster, isLoading: rosterLoading } = useClassRoster(classId);
  const { data: allStudents } = useStudents();
  const enrollStudent = useEnrollStudent(classId);
  const unenrollStudent = useUnenrollStudent(classId);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const enrollableStudents = useMemo(() => {
    if (!allStudents || !classItem) return [];
    const enrolledIds = new Set((roster ?? []).map((r) => r.studentId));
    return allStudents.filter(
      (s) => s.schoolId === classItem.schoolId && !enrolledIds.has(s.id),
    );
  }, [allStudents, classItem, roster]);

  if (!classItem) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/classes")}>
          ← Kembali
        </Button>
        <p className="text-muted-foreground text-sm">Memuat data kelas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/classes"
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Kembali ke Kelas
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{classItem.name}</h1>
        <p className="text-muted-foreground text-sm">
          {classItem.schoolName} · {classItem.teacherName}
          {classItem.room ? ` · Ruang ${classItem.room}` : ""} ·{" "}
          {formatScheduleSlots(classItem.scheduleSlots)}
          {classItem.curriculumName ? ` · ${classItem.curriculumName}` : ""}
        </p>
      </div>

      <SubstitutePanel classId={classItem.id} />

      <ScheduleOverridesPanel classItem={classItem} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Roster Siswa</h2>
          <div className="flex gap-2">
            <Select
              items={enrollableStudents.map((s) => ({
                value: s.id,
                label: s.fullName,
              }))}
              value={selectedStudentId}
              onValueChange={(value) => setSelectedStudentId(value ?? "")}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Pilih siswa" />
              </SelectTrigger>
              <SelectContent>
                {enrollableStudents.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!selectedStudentId || enrollStudent.isPending}
              onClick={() => {
                enrollStudent.mutate(selectedStudentId);
                setSelectedStudentId("");
              }}
            >
              Tambahkan
            </Button>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Siswa</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rosterLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground h-24 text-center">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : roster && roster.length > 0 ? (
                roster.map((r) => (
                  <TableRow key={r.enrollmentId}>
                    <TableCell>{r.fullName}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unenrollStudent.mutate(r.enrollmentId)}
                      >
                        Keluarkan
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground h-24 text-center">
                    Belum ada siswa di kelas ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Timeline Kelas</h2>
        <ClassTimeline classId={classItem.id} classDisplayName={classItem.name} />
      </div>
    </div>
  );
}
