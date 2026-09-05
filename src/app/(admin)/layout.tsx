"use client";

import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  ListChecks,
  Settings,
  CalendarDays,
  CalendarOff,
  NotebookTabs,
  FileHeart,
  ShieldUser,
  UserRoundX,
  Presentation,
  Megaphone,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { AppSidebar, type NavItem } from "@/components/shared/app-sidebar";
import { MobileTopbar } from "@/components/shared/mobile-topbar";
import { BottomNav } from "@/components/shared/bottom-nav";
import type { BottomNavItem } from "@/components/shared/bottom-nav";
import { useComplianceCount } from "@/features/lesson-plans/use-compliance-count";

function buildAdminNavItems(
  t: (key: string) => string,
  lessonPlanBadge: number,
): NavItem[] {
  return [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/substitutes", label: t("substitutes"), icon: UserRoundX },
    {
      label: t("management"),
      icon: Building2,
      children: [
        { href: "/schools", label: t("schools"), icon: Building2 },
        { href: "/students", label: t("students"), icon: Users },
        { href: "/classes", label: t("classes"), icon: BookOpen },
        { href: "/teacher-training", label: t("teacherTraining"), icon: Presentation },
        { href: "/lesson-plans", label: t("lessonPlans"), icon: CalendarDays, badge: lessonPlanBadge },
        { href: "/reports", label: t("reports"), icon: NotebookTabs },
        { href: "/parent-reports", label: t("parentReports"), icon: FileHeart },
        { href: "/holidays", label: t("holidays"), icon: CalendarOff },
      ],
    },
    { href: "/teachers", label: t("teachers"), icon: GraduationCap },
    { href: "/users", label: t("users"), icon: ShieldUser },
    { href: "/curriculum", label: t("curriculum"), icon: ListChecks },
    { href: "/announcements", label: t("announcements"), icon: Megaphone },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];
}

function buildMobileNav(t: (key: string) => string, managementBadge: number): BottomNavItem[] {
  return [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/substitutes", label: t("substitutesShort"), icon: UserRoundX },
    { href: "/schools", label: t("management"), icon: Building2, badge: managementBadge },
    { href: "/teachers", label: t("teachers"), icon: GraduationCap },
    { href: "/settings", label: t("settingsShort"), icon: Settings },
  ];
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("admin.nav");
  const tRole = useTranslations("common.roles");
  const { count: lessonPlanBadge } = useComplianceCount();

  const navItems = buildAdminNavItems(t, lessonPlanBadge);

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <MobileTopbar
        roleLabel={tRole("admin")}
        navItems={navItems}
        showLanguageSwitcher
      />
      <AppSidebar
        roleLabel={tRole("admin")}
        navItems={navItems}
        showLanguageSwitcher
      />
      <main className="flex-1 overflow-x-auto bg-muted p-4 pb-20 md:p-8 md:pb-8">
        {children}
      </main>
      <BottomNav items={buildMobileNav(t, lessonPlanBadge)} />
    </div>
  );
}
