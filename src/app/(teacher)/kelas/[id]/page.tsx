"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Clock, GraduationCap, MapPin, NotebookPen, Users, CalendarClock, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClassAvatar } from "@/components/shared/class-avatar";
import { LoadingState } from "@/components/shared/loading-state";
import { ModuleCoverBanner } from "@/components/shared/module-cover";
import { useClass } from "@/features/classes/use-classes";
import { useMyClasses } from "@/features/classes/use-my-classes";
import { useClassRoster } from "@/features/classes/use-roster";
import { formatScheduleSlots } from "@/features/classes/schema";
import { ClassTimeline } from "@/features/meetings/class-timeline";
import { ClassAttendanceSummary } from "@/features/attendances/class-attendance-summary";

type TabKey = "roster" | "kehadiran" | "riwayat";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "roster", label: "Roster", icon: <Users className="size-4" /> },
  { key: "kehadiran", label: "Kehadiran", icon: <ClipboardList className="size-4" /> },
  { key: "riwayat", label: "Riwayat", icon: <CalendarClock className="size-4" /> },
];

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-3xl border border-black/5 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(20,25,50,0.08)] sm:p-5">
      <h2 className="flex items-center gap-1.5 font-bold">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function TeacherClassDetailPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const [tab, setTab] = useState<TabKey>("roster");

  const { data: classItem, isLoading, isFetched } = useClass(classId);
  const { data: roster, isLoading: rosterLoading } = useClassRoster(classId);
  // Module cover + "isPrimary" (who's allowed to write a lesson plan) aren't
  // part of the shared admin `Class` shape — pull them from the teacher's
  // own class list instead, which is already fetched/cached from /kelas.
  const { data: myClasses } = useMyClasses();
  const myClassInfo = myClasses?.find((c) => c.id === classId);

  if (isLoading) {
    return <LoadingState />;
  }

  // RLS scopes `useClass` to classes this teacher owns or covers — an id
  // outside that set (or a bad id) resolves to no data, not an error.
  if (isFetched && !classItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white px-6 py-14 text-center shadow-sm">
        <Users className="text-muted-foreground size-10" />
        <div>
          <p className="font-medium">Kelas tidak ditemukan</p>
          <p className="text-muted-foreground text-sm">
            Kelas ini mungkin bukan kelas Anda, atau sudah tidak aktif.
          </p>
        </div>
        <Link href="/kelas" className="text-primary text-sm font-medium hover:underline">
          ← Kembali ke Kelas Saya
        </Link>
      </div>
    );
  }

  if (!classItem) return null;

  const themeKey = classItem.curriculumName ?? classItem.name;

  return (
    <div className="space-y-5">
      <Link
        href="/kelas"
        className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:underline"
      >
        <ChevronLeft className="size-4" />
        Kelas Saya
      </Link>

      <div className="rounded-3xl border border-black/5 bg-white p-4 shadow-[0_2px_12px_-4px_rgba(20,25,50,0.08)] sm:p-5">
        <div className="flex items-start gap-3.5">
          <ClassAvatar name={classItem.name} themeKey={themeKey} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg leading-tight font-bold">{classItem.name}</h1>
              <Badge variant={classItem.classType === "TEACHER_TRAINING" ? "secondary" : "outline"}>
                {classItem.classType === "TEACHER_TRAINING" ? "Kelas Guru & Staff" : "Kelas Reguler"}
              </Badge>
            </div>
            <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span>{classItem.schoolName}</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatScheduleSlots(classItem.scheduleSlots)}
              </span>
              {classItem.room && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  Ruang {classItem.room}
                </span>
              )}
              {classItem.curriculumName && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="size-3" />
                  {classItem.curriculumName}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {myClassInfo && (
        <div className="space-y-3">
          <ModuleCoverBanner module={myClassInfo.module} />
          {myClassInfo.isPrimary && (
            <Link
              href="/lesson-plan/new"
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full")}
            >
              <NotebookPen className="size-4" />
              Buat Lesson Plan
            </Link>
          )}
        </div>
      )}

      <div className="flex gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors",
              tab === t.key
                ? "bg-[#4b60ac] text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "roster" && (
        <SectionCard title="Roster Siswa" icon={<Users className="size-4" />}>
          {rosterLoading ? (
            <p className="text-muted-foreground text-sm">Memuat roster...</p>
          ) : roster && roster.length > 0 ? (
            <>
              <p className="text-muted-foreground text-xs">{roster.length} siswa terdaftar</p>
              <ul className="divide-y">
                {roster.map((r) => (
                  <li key={r.enrollmentId} className="flex items-center justify-between py-2 text-sm">
                    <span>{r.fullName}</span>
                    {r.nis && <span className="text-muted-foreground text-xs">{r.nis}</span>}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Belum ada siswa di kelas ini.</p>
          )}
        </SectionCard>
      )}

      {tab === "kehadiran" && <ClassAttendanceSummary classId={classItem.id} />}

      {tab === "riwayat" && (
        <SectionCard title="Riwayat Pertemuan">
          <ClassTimeline classId={classItem.id} classDisplayName={classItem.name} canManage={false} />
        </SectionCard>
      )}
    </div>
  );
}
