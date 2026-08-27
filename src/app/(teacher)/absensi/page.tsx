"use client";

import { useMemo } from "react";
import { AlertCircle, Users } from "lucide-react";
import { LoadingState } from "@/components/shared/loading-state";
import { useTodayClasses } from "@/features/meetings/use-today";
import { ClassWorkflowCard } from "@/features/meetings/class-workflow-card";

const DONE_STATUSES = new Set(["report_submitted", "course_completed"]);

export default function AbsensiPage() {
  const { data: classes, isLoading, isError, error } = useTodayClasses();

  const now = useMemo(() => new Date(), []);
  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [now],
  );

  const completedCount = classes?.filter((c) => DONE_STATUSES.has(c.meetingStatus)).length ?? 0;
  const totalCount = classes?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Absensi</h1>
        <p className="text-muted-foreground text-sm">{dateLabel}</p>
        {totalCount > 0 && (
          <p className="text-muted-foreground mt-1 text-xs">
            Kerjakan check-in, absensi, check-out, dan daily teaching report untuk tiap kelas —{" "}
            <span className="font-medium text-foreground">
              {completedCount}/{totalCount} kelas selesai
            </span>
          </p>
        )}
      </div>

      {isLoading && <LoadingState />}

      {isError && (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="text-destructive mb-2 size-6" />
          <p className="text-muted-foreground text-center text-sm">
            {error?.message || "Terjadi kesalahan. Coba refresh halaman."}
          </p>
        </div>
      )}

      {!isLoading && !isError && (!classes || classes.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
          <Users className="text-muted-foreground mb-3 size-10" />
          <p className="text-muted-foreground text-sm">Tidak ada kelas hari ini.</p>
        </div>
      )}

      {!isLoading && !isError && classes?.map((c) => <ClassWorkflowCard key={c.classId} c={c} />)}
    </div>
  );
}
