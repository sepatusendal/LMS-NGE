"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxLoadingIcon,
  ComboboxStatus,
} from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClass } from "@/features/classes/use-classes";
import { useStudentSearch } from "@/features/students/use-students";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useClassRoster,
  useEnrollStudent,
  useUnenrollStudent,
} from "@/features/classes/use-roster";
import { formatScheduleSlots } from "@/features/classes/schema";
import { ScheduleOverridesPanel } from "@/features/classes/schedule-overrides-panel";
import { SubstitutePanel } from "@/features/substitutes/substitute-panel";
import { ClassTimeline } from "@/features/meetings/class-timeline";
import { ClassAttendanceSummary } from "@/features/attendances/class-attendance-summary";

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const router = useRouter();

  const { data: classItem } = useClass(classId);
  const backHref = classItem?.classType === "TEACHER_TRAINING" ? "/teacher-training" : "/classes";
  const rosterLabel = classItem?.classType === "TEACHER_TRAINING" ? "Roster Peserta" : "Roster Siswa";

  const { data: roster, isLoading: rosterLoading } = useClassRoster(classId);
  const enrollStudent = useEnrollStudent(classId);
  const unenrollStudent = useUnenrollStudent(classId);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const { data: searchResults, isFetching: searching } = useStudentSearch(
    debouncedSearch,
    classItem?.schoolId,
  );

  const enrollableResults = useMemo(() => {
    if (!searchResults) return [];
    const enrolledIds = new Set((roster ?? []).map((r) => r.studentId));
    return searchResults.filter((s) => !enrolledIds.has(s.id));
  }, [searchResults, roster]);

  if (!classItem) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(backHref)}>
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
          href={backHref}
          className="text-muted-foreground text-sm hover:underline"
        >
          ← Kembali ke Kelas
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-xl font-semibold">{classItem.name}</h1>
          <Badge variant={classItem.classType === "TEACHER_TRAINING" ? "secondary" : "outline"}>
            {classItem.classType === "TEACHER_TRAINING" ? "Kelas Guru & Staff" : "Kelas Reguler"}
          </Badge>
        </div>
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
          <h2 className="font-medium">{rosterLabel}</h2>
          <Combobox
            items={enrollableResults.map((s) => ({ value: s.id, label: s.fullName }))}
            itemToStringLabel={(id: string) =>
              enrollableResults.find((s) => s.id === id)?.fullName ?? ""
            }
            inputValue={searchInput}
            onInputValueChange={setSearchInput}
            filter={null}
            onValueChange={(studentId) => {
              if (typeof studentId !== "string") return;
              enrollStudent.mutate(studentId);
              setSearchInput("");
            }}
          >
            <ComboboxInputGroup className="w-72">
              <ComboboxInput placeholder="Cari nama siswa untuk ditambahkan..." />
              <ComboboxLoadingIcon loading={searching || enrollStudent.isPending} />
              <ComboboxClear />
            </ComboboxInputGroup>
            <ComboboxContent>
              {searchInput.trim().length === 0 ? (
                <ComboboxStatus>
                  <UserPlus className="size-3.5" />
                  Ketik nama siswa untuk mencari
                </ComboboxStatus>
              ) : (
                <ComboboxEmpty>
                  Tidak ada siswa dengan nama &quot;{searchInput}&quot;
                </ComboboxEmpty>
              )}
              {enrollableResults.map((s) => (
                <ComboboxItem key={s.id} value={s.id}>
                  {s.fullName}
                  {s.nis ? ` · ${s.nis}` : ""}
                </ComboboxItem>
              ))}
            </ComboboxContent>
          </Combobox>
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
                        disabled={unenrollStudent.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Keluarkan ${r.fullName} dari kelas ini?`,
                            )
                          ) {
                            unenrollStudent.mutate(r.enrollmentId);
                          }
                        }}
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

      <ClassAttendanceSummary classId={classItem.id} />

      <div className="space-y-3">
        <h2 className="font-medium">Timeline Kelas</h2>
        <ClassTimeline classId={classItem.id} classDisplayName={classItem.name} />
      </div>
    </div>
  );
}
