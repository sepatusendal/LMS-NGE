"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileHeart, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useSchools } from "@/features/schools/use-schools";
import { useStudents } from "@/features/students/use-students";
import { useParentReports } from "@/features/parent-reports/use-parent-reports";
import { MONTH_LABEL } from "@/features/parent-reports/schema";

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1];

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function ParentReportsPage() {
  const router = useRouter();
  const { data: reports, isLoading } = useParentReports();
  const { data: schools } = useSchools();

  const [open, setOpen] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [month, setMonth] = useState(String(CURRENT_MONTH));
  const [year, setYear] = useState(String(CURRENT_YEAR));

  const { data: students } = useStudents(schoolId || undefined);

  const monthOptions = useMemo(
    () => Object.entries(MONTH_LABEL).map(([value, label]) => ({ value, label })),
    [],
  );

  function handleGenerate() {
    if (!studentId) return;
    router.push(`/parent-reports/review?studentId=${studentId}&month=${month}&year=${year}`);
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Laporan Bulanan Orang Tua</h1>
          <p className="text-muted-foreground text-sm">
            Generate laporan PDF per siswa dari data kehadiran, teaching report, dan progress — {reports?.length ?? 0} laporan tersimpan.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            Buat Laporan
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Laporan Bulanan</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Sekolah</label>
                <Select
                  items={schools?.map((s) => ({ value: s.id, label: s.name })) ?? []}
                  value={schoolId}
                  onValueChange={(v) => {
                    setSchoolId(v ?? "");
                    setStudentId("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih sekolah..." />
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Siswa</label>
                <Select
                  items={students?.map((s) => ({ value: s.id, label: s.nis ? `${s.fullName} (${s.nis})` : s.fullName })) ?? []}
                  value={studentId}
                  onValueChange={(v) => setStudentId(v ?? "")}
                >
                  <SelectTrigger className="w-full" disabled={!schoolId}>
                    <SelectValue placeholder={schoolId ? "Pilih siswa..." : "Pilih sekolah dulu"} />
                  </SelectTrigger>
                  <SelectContent>
                    {students?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName}
                        {s.nis ? ` (${s.nis})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium">Bulan</label>
                  <Select items={monthOptions} value={month} onValueChange={(v) => v && setMonth(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-sm font-medium">Tahun</label>
                  <Select
                    items={YEAR_OPTIONS.map((y) => ({ value: String(y), label: String(y) }))}
                    value={year}
                    onValueChange={(v) => v && setYear(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGenerate} disabled={!studentId}>
                Lanjut Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        {isLoading ? (
          <p className="text-muted-foreground p-4 text-sm">Memuat data...</p>
        ) : !reports || reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileHeart className="text-muted-foreground mb-2 size-6" />
            <p className="text-muted-foreground text-sm">Belum ada laporan orang tua dibuat.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siswa</TableHead>
                <TableHead>Sekolah</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Digenerate</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{r.studentName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.schoolName}</TableCell>
                  <TableCell>
                    {MONTH_LABEL[r.periodMonth]} {r.periodYear}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "GENERATED" ? "default" : "secondary"}>
                      {r.status === "GENERATED" ? "Sudah Digenerate" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.generatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/parent-reports/review?studentId=${r.studentId}&month=${r.periodMonth}&year=${r.periodYear}`,
                        )
                      }
                    >
                      Lihat / Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
