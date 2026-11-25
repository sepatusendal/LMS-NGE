"use client";

import { House, CalendarDays, User, ClipboardCheck, NotebookPen, CalendarClock, Users, FileCheck2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { TeacherTopbar } from "@/components/shared/teacher-topbar";
import { AppSidebar, type NavItem } from "@/components/shared/app-sidebar";
import { BottomNav, type BottomNavItem } from "@/components/shared/bottom-nav";
import { LoadingState } from "@/components/shared/loading-state";
import { useCurrentUser } from "@/features/auth/use-current-user";
import { useComplianceCount } from "@/features/lesson-plans/use-compliance-count";
import { PolicyBanner, PolicyBell, PolicyPopup, usePolicyNotices } from "@/features/policies/policy-notices";
import AdminLayout from "@/app/(admin)/layout";
import CoordinatorLayout from "@/app/(coordinator)/layout";

// Desktop sidebar groups Jadwal/Kelas under Lesson Plan (more room to show
// a nested menu); the mobile bottom nav keeps everything flat and Absensi
// front-and-center — fewer, bigger targets read better for this app's
// mostly-older teacher users than a nested menu would on a small screen.
function buildTeacherSidebarItems(
  t: ReturnType<typeof useTranslations>,
  lessonPlanBadge: number,
  policyBadge: number,
): NavItem[] {
  return [
    { href: "/today", label: t("nav.today"), icon: House },
    { href: "/absensi", label: t("nav.absensi"), icon: ClipboardCheck },
    {
      label: t("nav.lessonPlan"),
      icon: CalendarDays,
      children: [
        { href: "/lesson-plan", label: t("nav.lessonPlan"), icon: NotebookPen, badge: lessonPlanBadge },
        { href: "/jadwal", label: t("nav.jadwal"), icon: CalendarClock },
        { href: "/kelas", label: t("nav.kelas"), icon: Users },
      ],
    },
    { href: "/kebijakan", label: t("nav.documents"), icon: FileCheck2, badge: policyBadge },
    { href: "/profile", label: t("nav.profile"), icon: User },
  ];
}

function buildTeacherBottomNavItems(
  t: ReturnType<typeof useTranslations>,
  lessonPlanBadge: number,
): BottomNavItem[] {
  return [
    { href: "/today", label: t("nav.today"), icon: House },
    { href: "/kelas", label: t("nav.kelas"), icon: Users },
    { href: "/absensi", label: t("nav.absensi"), icon: ClipboardCheck, emphasized: true },
    { href: "/lesson-plan", label: t("nav.lessonPlanShort"), icon: CalendarDays, badge: lessonPlanBadge },
    { href: "/profile", label: t("nav.profile"), icon: User },
  ];
}

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const { data: currentUser, isLoading } = useCurrentUser();
  const { count: lessonPlanBadge } = useComplianceCount();
  const pathname = usePathname();
  // Admins and coordinators get theirs from their own layout, see below.
  const policies = usePolicyNotices(currentUser?.role === "TEACHER" ? "TEACHER" : undefined, pathname);

  // /lesson-plan/* (admin and teacher) and /kebijakan/* (every role) are
  // shared routes that physically live in this (teacher) route group — without
  // this check, another role would get swapped into teacher-style chrome
  // (bottom nav, teacher sidebar) instead of staying in its own shell. Gate on isLoading first so an admin doesn't see
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
  if (currentUser?.role === "COORDINATOR") {
    return <CoordinatorLayout>{children}</CoordinatorLayout>;
  }

  const bottomNavItems = buildTeacherBottomNavItems(t, lessonPlanBadge);

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <div className="md:hidden">
        <TeacherTopbar navItems={bottomNavItems} actions={<PolicyBell count={policies.pending.length} />} />
      </div>
      <AppSidebar
        roleLabel="Teacher"
        navItems={buildTeacherSidebarItems(t, lessonPlanBadge, policies.pending.length)}
        showLanguageSwitcher
      />
      <main className="flex-1 overflow-x-auto bg-muted">
        <div className="mx-auto w-full max-w-md px-4 pt-4 pb-24 md:max-w-none md:px-8 md:pb-8 md:pt-8">
          <PolicyBanner pending={policies.pending} pathname={pathname} />
          {/* Wrapped on purpose: as a direct sibling of the banner, the routed
              page triggers React's missing "key" warning. */}
          {policies.blocked ? <LoadingState /> : <>{children}</>}
        </div>
      </main>
      <BottomNav items={bottomNavItems} />
      <PolicyPopup popup={policies.popup} onLater={policies.later} onClose={policies.close} />
    </div>
  );
}
