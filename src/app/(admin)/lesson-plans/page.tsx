"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, School, ChevronDown, ChevronRight, Clock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export default function AdminLessonPlansPage() {
  const { data: schools } = useSchools();
  const { data: classes } = useClasses();
  const { data: lessonPlans, isLoading } = useLessonPlans();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const schoolClasses = (classes ?? []).filter(
    (c) => c.schoolId === selectedSchoolId && c.isActive,
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Lesson Plan</h1>
          <p className="text-muted-foreground text-sm">
            Lihat, edit, atau tambahkan lesson plan teacher per sekolah.
          </p>
        </div>
        <Link href="/lesson-plan/new" className={buttonVariants({ variant: "default" })}>
          <Plus className="size-4" />
          Tambah Lesson Plan
        </Link>
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
