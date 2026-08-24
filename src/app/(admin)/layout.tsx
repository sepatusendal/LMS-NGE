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
} from "lucide-react";
import { AppSidebar, type NavItem } from "@/components/shared/app-sidebar";
import { MobileTopbar } from "@/components/shared/mobile-topbar";
import { BottomNav } from "@/components/shared/bottom-nav";
import type { BottomNavItem } from "@/components/shared/bottom-nav";
import { useComplianceCount } from "@/features/lesson-plans/use-compliance-count";

function buildAdminNavItems(lessonPlanBadge: number): NavItem[] {
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/substitutes", label: "Guru Pengganti", icon: UserRoundX },
    {
      label: "Management",
      icon: Building2,
      children: [
        { href: "/schools", label: "Daftar Sekolah", icon: Building2 },
        { href: "/students", label: "Siswa", icon: Users },
        { href: "/classes", label: "Kelas", icon: BookOpen },
        { href: "/teacher-training", label: "Kelas Guru & Staff", icon: Presentation },
        { href: "/lesson-plans", label: "Lesson Plan", icon: CalendarDays, badge: lessonPlanBadge },
        { href: "/reports", label: "Daily Teaching Report", icon: NotebookTabs },
        { href: "/parent-reports", label: "Laporan Orang Tua", icon: FileHeart },
        { href: "/holidays", label: "Hari Libur", icon: CalendarOff },
      ],
    },
    { href: "/teachers", label: "Teacher", icon: GraduationCap },
    { href: "/users", label: "Admin & Coordinator", icon: ShieldUser },
    { href: "/curriculum", label: "Kurikulum", icon: ListChecks },
    { href: "/settings", label: "Pengaturan", icon: Settings },
  ];
}

function buildMobileNav(managementBadge: number): BottomNavItem[] {
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/substitutes", label: "Pengganti", icon: UserRoundX },
    { href: "/schools", label: "Management", icon: Building2, badge: managementBadge },
    { href: "/teachers", label: "Teacher", icon: GraduationCap },
    { href: "/settings", label: "Atur", icon: Settings },
  ];
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { count: lessonPlanBadge } = useComplianceCount();

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <MobileTopbar roleLabel="Admin" />
      <AppSidebar roleLabel="Admin" navItems={buildAdminNavItems(lessonPlanBadge)} />
      <main className="flex-1 overflow-x-auto bg-[#f5f6fb] p-4 pb-20 md:p-8 md:pb-8">
        {children}
      </main>
      <BottomNav items={buildMobileNav(lessonPlanBadge)} />
    </div>
  );
}
