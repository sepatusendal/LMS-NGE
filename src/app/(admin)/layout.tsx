"use client";

import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  ListChecks,
} from "lucide-react";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { MobileTopbar } from "@/components/shared/mobile-topbar";
import { BottomNav } from "@/components/shared/bottom-nav";

const ADMIN_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schools", label: "Sekolah", icon: Building2 },
  { href: "/teachers", label: "Teacher", icon: GraduationCap },
  { href: "/students", label: "Siswa", icon: Users },
  { href: "/classes", label: "Kelas", icon: BookOpen },
  { href: "/curriculum", label: "Kurikulum", icon: ListChecks },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <MobileTopbar roleLabel="Admin" />
      <AppSidebar roleLabel="Admin" navItems={ADMIN_NAV_ITEMS} />
      <main className="flex-1 overflow-x-auto p-4 pb-20 md:p-8 md:pb-8">
        {children}
      </main>
      <BottomNav items={ADMIN_NAV_ITEMS} />
    </div>
  );
}
