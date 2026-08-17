"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClasses } from "@/features/classes/use-classes";
import { useLessonPlans } from "@/features/lesson-plans/use-lesson-plans";
import { getClassComplianceStatus } from "./compliance";

interface NonCompliantClass {
  id: string;
  name: string;
  schoolName: string;
  teacherName: string;
  latestDate: string | null;
  daysLeft: number;
}

export function ComplianceAlert() {
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: lessonPlans, isLoading: plansLoading } = useLessonPlans();

  const { nonCompliant } = useMemo(() => {
    if (!classes || !lessonPlans) return { nonCompliant: [] };
    const now = Date.now();

    const bad: NonCompliantClass[] = classes
      .map((c) => ({ c, status: getClassComplianceStatus(c.id, lessonPlans, now) }))
      .filter(({ status }) => !status.isCompliant)
      .map(({ c, status }) => ({
        id: c.id,
        name: c.name,
        schoolName: c.schoolName,
        teacherName: c.teacherName,
        latestDate: status.latestDate,
        daysLeft: status.daysLeft,
      }));

    bad.sort((a, b) => a.daysLeft - b.daysLeft);
    return { nonCompliant: bad };
  }, [classes, lessonPlans]);

  const isLoading = classesLoading || plansLoading;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="text-destructive size-4" />
          Kepatuhan Lesson Plan
          {!isLoading && (
            <span className="text-muted-foreground ml-auto text-xs font-normal">
              {nonCompliant.length}/{classes?.length ?? 0} kelas perlu perhatian
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Memuat data...</p>
        ) : nonCompliant.length === 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="text-emerald-500 size-4" />
            <span>Semua kelas aman — lesson plan tersedia min. 2 minggu ke depan.</span>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nonCompliant.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium whitespace-nowrap">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {c.teacherName}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.latestDate === null ? "destructive" : "secondary"} className="text-xs">
                        {c.latestDate === null
                          ? "Belum ada"
                          : c.daysLeft < 0
                            ? `Telat ${Math.abs(c.daysLeft)}h`
                            : `${c.daysLeft}h lagi`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
