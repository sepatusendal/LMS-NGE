"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import { useSchools } from "@/features/schools/use-schools";
import { useClasses } from "@/features/classes/use-classes";
import { useAdminReports } from "@/features/reports/use-admin-reports";
import { OBJECTIVES_LABEL } from "@/features/reports/schema";
import type { AdminReportListItem } from "@/features/reports/admin-queries";
import type { ExcelColumn } from "@/lib/export-excel";

const OBJECTIVES_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  YES: "default",
  PARTIALLY: "secondary",
  NO: "destructive",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const EXPORT_COLUMNS: ExcelColumn<AdminReportListItem>[] = [
  { header: "Tanggal", key: "date", width: 14, value: (r) => formatDate(r.actualTeachingDate) },
  { header: "Sekolah", key: "school", width: 22, value: (r) => r.schoolName },
  { header: "Kelas", key: "class", width: 22, value: (r) => r.className },
  { header: "Tipe Kelas", key: "classType", width: 16, value: (r) => (r.classType === "TEACHER_TRAINING" ? "Guru & Staff" : "Reguler") },
  { header: "Teacher", key: "teacher", width: 22, value: (r) => r.teacherName },
  { header: "Substitute", key: "substitute", width: 12, value: (r) => (r.isSubstitute ? "Ya" : "-") },
  { header: "Meeting", key: "meeting", width: 10, value: (r) => r.meetingNumber },
  { header: "Topic", key: "topic", width: 30, value: (r) => r.topic },
  { header: "Skills Diajarkan", key: "skills", width: 30, value: (r) => (r.skills.length > 0 ? r.skills.join(", ") : "-") },
  { header: "Hadir", key: "attendance", width: 12, value: (r) => (r.attendanceTotal > 0 ? `${r.attendancePresent}/${r.attendanceTotal}` : "-") },
  { header: "Tujuan Tercapai", key: "objectives", width: 16, value: (r) => (r.objectivesAchieved ? OBJECTIVES_LABEL[r.objectivesAchieved] : "-") },
  { header: "Checklist Objectives", key: "objectivesChecklist", width: 18, value: (r) => (r.objectivesTotal > 0 ? `${r.objectivesAchievedCount}/${r.objectivesTotal}` : "-") },
  { header: "What Went Well", key: "wentWell", width: 34, value: (r) => r.whatWentWell ?? "-" },
  { header: "What Needs Improvement", key: "needsImprovement", width: 34, value: (r) => r.whatNeedsImprovement ?? "-" },
  { header: "Action Plan", key: "actionPlan", width: 34, value: (r) => r.actionPlan ?? "-" },
  { header: "Catatan Pelajaran Berikutnya", key: "nextLesson", width: 34, value: (r) => r.nextLessonNotes ?? "-" },
  { header: "PR/Homework", key: "homework", width: 30, value: (r) => r.homeworkAssigned ?? "-" },
  { header: "Summary", key: "summary", width: 34, value: (r) => r.summary ?? "-" },
  {
    header: "Follow-up Siswa",
    key: "followUps",
    width: 40,
    value: (r) => (r.followUps.length > 0 ? r.followUps.map((f) => `${f.studentName}: ${f.note}`).join(" | ") : "-"),
  },
];

export default function AdminReportsPage() {
  const router = useRouter();
  const { data: reports, isLoading } = useAdminReports();
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [classType, setClassType] = useState("");

  const schoolIdByClassId = useMemo(() => new Map((classes ?? []).map((c) => [c.id, c.schoolId])), [classes]);

  const filtered = useMemo(() => {
    if (!reports) return [];
    return reports.filter((r) => {
      if (schoolId && schoolIdByClassId.get(r.classId) !== schoolId) return false;
      if (classId && r.classId !== classId) return false;
      if (classType && r.classType !== classType) return false;
      return true;
    });
  }, [reports, schoolId, classId, classType, schoolIdByClassId]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Daily Teaching Report</h1>
          <p className="text-muted-foreground text-sm">
            Semua report yang disubmit teacher — {reports?.length ?? 0} total.
          </p>
        </div>
        <ExportExcelButton
          filename="daily-teaching-report"
          sheets={[{ name: "Daily Teaching Report", columns: EXPORT_COLUMNS, rows: filtered }]}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          items={[
            { value: "", label: "Semua sekolah" },
            ...(schools?.map((s) => ({ value: s.id, label: s.name })) ?? []),
          ]}
          value={schoolId}
          onValueChange={(v) => setSchoolId(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua sekolah" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua sekolah</SelectItem>
            {schools?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "", label: "Semua kelas" },
            ...(classes?.map((c) => ({ value: c.id, label: c.name })) ?? []),
          ]}
          value={classId}
          onValueChange={(v) => setClassId(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua kelas</SelectItem>
            {classes?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={[
            { value: "", label: "Semua tipe" },
            { value: "REGULAR", label: "Kelas Reguler" },
            { value: "TEACHER_TRAINING", label: "Kelas Guru & Staff" },
          ]}
          value={classType}
          onValueChange={(v) => setClassType(v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Semua tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua tipe</SelectItem>
            <SelectItem value="REGULAR">Kelas Reguler</SelectItem>
            <SelectItem value="TEACHER_TRAINING">Kelas Guru & Staff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <p className="text-muted-foreground p-4 text-sm">Memuat data...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="text-muted-foreground mb-2 size-6" />
            <p className="text-muted-foreground text-sm">Belum ada report.</p>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Hadir</TableHead>
                  <TableHead className="text-right">Tujuan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/reports/${r.id}`)}
                  >
                    <TableCell className="whitespace-nowrap">{formatDate(r.actualTeachingDate)}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">
                      {r.className}
                      {r.classType === "TEACHER_TRAINING" && (
                        <Badge variant="secondary" className="ml-1.5 text-[10px]">
                          Guru & Staff
                        </Badge>
                      )}
                      {r.isSubstitute && (
                        <Badge variant="outline" className="ml-1.5 text-[10px]">
                          Sub
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">{r.teacherName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      Meeting {r.meetingNumber}: {r.topic}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {r.attendanceTotal > 0 ? `${r.attendancePresent}/${r.attendanceTotal}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.objectivesAchieved && (
                        <Badge variant={OBJECTIVES_BADGE[r.objectivesAchieved]} className="text-[10px]">
                          {OBJECTIVES_LABEL[r.objectivesAchieved]}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
