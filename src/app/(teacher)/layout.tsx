"use client";

import { House, CalendarDays, User, ClipboardCheck, NotebookPen, CalendarClock, Users } from "lucide-react";
import { TeacherTopbar } from "@/components/shared/teacher-topbar";
import { AppSidebar, type NavItem } from "@/components/shared/app-sidebar";
import { BottomNav, type BottomNavItem } from "@/components/shared/bottom-nav";

// Desktop sidebar groups Jadwal/Kelas under Lesson Plan (more room to show
// a nested menu); the mobile bottom nav keeps everything flat and Absensi
// front-and-center — fewer, bigger targets read better for this app's
// mostly-older teacher users than a nested menu would on a small screen.
const TEACHER_SIDEBAR_ITEMS: NavItem[] = [
  { href: "/today", label: "Hari Ini", icon: House },
  { href: "/absensi", label: "Absensi", icon: ClipboardCheck },
  {
    label: "Lesson Plan",
    icon: CalendarDays,
    children: [
      { href: "/lesson-plan", label: "Lesson Plan", icon: NotebookPen },
      { href: "/jadwal", label: "Jadwal", icon: CalendarClock },
      { href: "/kelas", label: "Kelas", icon: Users },
    ],
  },
  { href: "/profile", label: "Profil", icon: User },
];

const TEACHER_BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { href: "/today", label: "Hari Ini", icon: House },
  { href: "/kelas", label: "Kelas", icon: Users },
  { href: "/absensi", label: "Absensi", icon: ClipboardCheck, emphasized: true },
  { href: "/lesson-plan", label: "Plan", icon: CalendarDays },
  { href: "/profile", label: "Profil", icon: User },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <div className="md:hidden">
        <TeacherTopbar navItems={TEACHER_BOTTOM_NAV_ITEMS} />
      </div>
      <AppSidebar roleLabel="Teacher" navItems={TEACHER_SIDEBAR_ITEMS} />
      <main className="flex-1 overflow-x-auto bg-[#f5f6fb]">
        <div className="mx-auto w-full max-w-md px-4 pt-4 pb-24 md:max-w-none md:px-8 md:pb-8 md:pt-8">
          {children}
        </div>
      </main>
      <BottomNav items={TEACHER_BOTTOM_NAV_ITEMS} />
    </div>
  );
}
