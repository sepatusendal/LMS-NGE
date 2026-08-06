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
import { useSchools } from "@/features/schools/use-schools";
import { useClasses } from "@/features/classes/use-classes";
import { useAdminReports } from "@/features/reports/use-admin-reports";
import { OBJECTIVES_LABEL } from "@/features/reports/schema";

const OBJECTIVES_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  YES: "default",
  PARTIALLY: "secondary",
  NO: "destructive",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { data: reports, isLoading } = useAdminReports();
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");

  const schoolIdByClassId = useMemo(() => new Map((classes ?? []).map((c) => [c.id, c.schoolId])), [classes]);

  const filtered = useMemo(() => {
    if (!reports) return [];
    return reports.filter((r) => {
      if (schoolId && schoolIdByClassId.get(r.classId) !== schoolId) return false;
      if (classId && r.classId !== classId) return false;
      return true;
    });
  }, [reports, schoolId, classId, schoolIdByClassId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Daily Teaching Report</h1>
        <p className="text-muted-foreground text-sm">
          Semua report yang disubmit teacher — {reports?.length ?? 0} total.
        </p>
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
