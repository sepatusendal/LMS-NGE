"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, School, ChevronDown, ChevronRight, Clock, Plus, FileSpreadsheet, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { downloadAlbrightTeachingRecords } from "@/features/lesson-plans/albright-export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSchools } from "@/features/schools/use-schools";
import { useClasses } from "@/features/classes/use-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";
import { formatScheduleSlots } from "@/features/classes/schema";
import { ExportExcelButton } from "@/components/shared/export-excel-button";
import type { ExcelColumn } from "@/lib/export-excel";
import type { LessonPlan } from "@/features/lesson-plans/schema";
import type { Class } from "@/features/classes/schema";

function buildLessonPlanColumns(classById: Map<string, Class>): ExcelColumn<LessonPlan>[] {
  return [
    { header: "Sekolah", key: "school", width: 22, value: (p) => classById.get(p.classId)?.schoolName ?? "-" },
    { header: "Kelas", key: "class", width: 22, value: (p) => p.className },
    { header: "Meeting", key: "meeting", width: 10, value: (p) => p.meetingNumber },
    { header: "Minggu", key: "week", width: 10, value: (p) => p.week },
    { header: "Tanggal", key: "date", width: 14, value: (p) => new Date(p.scheduledDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) },
    { header: "Level", key: "level", width: 10, value: (p) => p.level ?? "-" },
    { header: "Topic", key: "topic", width: 26, value: (p) => p.topic },
    { header: "Learning Objectives", key: "objectives", width: 40, value: (p) => p.learningObjectives.filter(Boolean).join(" | ") || "-" },
    { header: "Skills", key: "skills", width: 26, value: (p) => p.skills.join(", ") || "-" },
    { header: "Materials", key: "materials", width: 26, value: (p) => p.materialsRequired.join(", ") || "-" },
    { header: "Vocabulary Focus", key: "vocab", width: 26, value: (p) => p.vocabularyFocus ?? "-" },
    { header: "Differentiation - Support", key: "diffSupport", width: 30, value: (p) => p.differentiationSupport ?? "-" },
    { header: "Differentiation - Extension", key: "diffExtension", width: 30, value: (p) => p.differentiationExtension ?? "-" },
    { header: "Differentiation - Homework", key: "diffHomework", width: 30, value: (p) => p.differentiationHomework ?? "-" },
    { header: "Modul", key: "module", width: 24, value: (p) => p.moduleFileName ?? "-" },
    { header: "Dibuat oleh", key: "createdBy", width: 22, value: (p) => p.createdByTeacherName },
    { header: "Tanggal Dibuat", key: "createdAt", width: 16, value: (p) => new Date(p.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) },
  ];
}

function AlbrightExportButton({
  classId,
  className,
  level,
}: {
  classId: string;
  className: string;
  level: string;
}) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      await downloadAlbrightTeachingRecords(classId, className, level);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
      {isExporting ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
      Download Teaching Records (Format Albright)
    </Button>
  );
}

export default function AdminLessonPlansPage() {
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const { data: lessonPlans, isLoading } = useLessonPlans();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const schoolClasses = (classes ?? []).filter(
    (c) => c.schoolId === selectedSchoolId && c.isActive,
  );
  const classById = useMemo(() => new Map((classes ?? []).map((c) => [c.id, c])), [classes]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lesson Plan</h1>
          <p className="text-muted-foreground text-sm">
            Lihat, edit, atau tambahkan lesson plan teacher per sekolah.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportExcelButton
            filename="lesson-plan"
            sheets={[
              { name: "Lesson Plan", columns: buildLessonPlanColumns(classById), rows: lessonPlans ?? [] },
            ]}
          />
          <Link href="/lesson-plan/new" className={buttonVariants({ variant: "default" })}>
            <Plus className="size-4" />
            Tambah Lesson Plan
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <School className="text-muted-foreground size-4 shrink-0" />
        <Select
          items={schools?.map((s) => ({ value: s.id, label: s.name })) ?? []}
          value={selectedSchoolId}
          onValueChange={(v) => {
            if (v) setSelectedSchoolId(v);
            setExpandedClassId(null);
          }}
        >
          <SelectTrigger className="w-full sm:w-64">
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

      {!selectedSchoolId ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-full">
            <Search className="text-muted-foreground size-6" />
          </div>
          <p className="text-muted-foreground text-sm">
            Pilih sekolah untuk melihat lesson plan.
          </p>
        </div>
      ) : isLoading ? (
        <p className="text-muted-foreground text-sm">Memuat data...</p>
      ) : schoolClasses.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Belum ada kelas di sekolah ini.
        </p>
      ) : (
        <div className="space-y-2">
          {schoolClasses.map((cls) => {
            const classPlans = (lessonPlans ?? [])
              .filter((p) => p.classId === cls.id)
              .sort(
                (a, b) =>
                  a.meetingNumber - b.meetingNumber,
              );
            const isExpanded = expandedClassId === cls.id;

            return (
              <Card key={cls.id}>
                <CardContent className="space-y-3 pt-4">
                  <button
                    className="flex w-full items-center justify-between text-left"
                    onClick={() =>
                      setExpandedClassId(isExpanded ? null : cls.id)
                    }
                  >
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {cls.teacherName} ·{" "}
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatScheduleSlots(cls.scheduleSlots)}
                        </span>
                        {cls.room ? ` · R.${cls.room}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {classPlans.length} lesson plan
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 border-t pt-3">
                      {cls.curriculumReportFormat === "ALBRIGHT" && (
                        <AlbrightExportButton
                          classId={cls.id}
                          className={cls.name}
                          level={cls.curriculumGradeLevel ?? cls.curriculumName ?? "Albright"}
                        />
                      )}
                      {classPlans.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          Belum ada lesson plan.
                        </p>
                      ) : (
                        classPlans.map((plan) => (
                          <Link
                            key={plan.id}
                            href={`/lesson-plan/${plan.id}`}
                            className="hover:bg-muted flex items-center justify-between rounded-md px-3 py-2 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                Meeting {plan.meetingNumber} — {plan.topic}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Minggu {plan.week} ·{" "}
                                {new Date(plan.scheduledDate).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Disubmit oleh {plan.createdByTeacherName} ·{" "}
                                {new Date(plan.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Level {plan.level || "-"}
                            </Badge>
                          </Link>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
