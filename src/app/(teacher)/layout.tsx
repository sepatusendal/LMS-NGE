"use client";

import { House, CalendarDays, User, ClipboardCheck, NotebookPen, CalendarClock, Users } from "lucide-react";
import { TeacherTopbar } from "@/components/shared/teacher-topbar";
import { AppSidebar, type NavItem } from "@/components/shared/app-sidebar";
import { BottomNav, type BottomNavItem } from "@/components/shared/bottom-nav";
import { LoadingState } from "@/components/shared/loading-state";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { useComplianceCount } from "@/features/lesson-plans/use-compliance-count";
import AdminLayout from "@/app/(admin)/layout";

// Desktop sidebar groups Jadwal/Kelas under Lesson Plan (more room to show
// a nested menu); the mobile bottom nav keeps everything flat and Absensi
// front-and-center — fewer, bigger targets read better for this app's
// mostly-older teacher users than a nested menu would on a small screen.
function buildTeacherSidebarItems(lessonPlanBadge: number): NavItem[] {
  return [
    { href: "/today", label: "Hari Ini", icon: House },
    { href: "/absensi", label: "Absensi", icon: ClipboardCheck },
    {
      label: "Lesson Plan",
      icon: CalendarDays,
      children: [
        { href: "/lesson-plan", label: "Lesson Plan", icon: NotebookPen, badge: lessonPlanBadge },
        { href: "/jadwal", label: "Jadwal", icon: CalendarClock },
        { href: "/kelas", label: "Kelas", icon: Users },
      ],
    },
    { href: "/profile", label: "Profil", icon: User },
  ];
}

function buildTeacherBottomNavItems(lessonPlanBadge: number): BottomNavItem[] {
  return [
    { href: "/today", label: "Hari Ini", icon: House },
    { href: "/kelas", label: "Kelas", icon: Users },
    { href: "/absensi", label: "Absensi", icon: ClipboardCheck, emphasized: true },
    { href: "/lesson-plan", label: "Plan", icon: CalendarDays, badge: lessonPlanBadge },
    { href: "/profile", label: "Profil", icon: User },
  ];
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: currentUser, isLoading } = useCurrentUser();
  const { count: lessonPlanBadge } = useComplianceCount();

  // /lesson-plan/* is the one route both ADMIN and TEACHER can reach, and it
  // physically lives in this (teacher) route group — without this check, an
  // admin editing/creating a lesson plan would get swapped into teacher-style
  // chrome (bottom nav, teacher sidebar) instead of staying in the admin
  // shell they were just in. Gate on isLoading first so an admin doesn't see
  // a flash of teacher chrome before their role resolves.
  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingState />
      </div>
    );
  }
  if (currentUser?.role === "ADMIN") {
    return <AdminLayout>{children}</AdminLayout>;
  }

  const bottomNavItems = buildTeacherBottomNavItems(lessonPlanBadge);

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <div className="md:hidden">
        <TeacherTopbar navItems={bottomNavItems} />
      </div>
      <AppSidebar roleLabel="Teacher" navItems={buildTeacherSidebarItems(lessonPlanBadge)} />
      <main className="flex-1 overflow-x-auto bg-[#f5f6fb]">
        <div className="mx-auto w-full max-w-md px-4 pt-4 pb-24 md:max-w-none md:px-8 md:pb-8 md:pt-8">
          {children}
        </div>
      </main>
      <BottomNav items={bottomNavItems} />
    </div>
  );
}
