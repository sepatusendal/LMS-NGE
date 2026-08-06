"use client";

import { House, CalendarDays, User } from "lucide-react";
import { TeacherTopbar } from "@/components/shared/teacher-topbar";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { BottomNav } from "@/components/shared/bottom-nav";

const TEACHER_NAV_ITEMS = [
  { href: "/today", label: "Hari Ini", icon: House },
  { href: "/lesson-plan", label: "Lesson Plan", icon: CalendarDays },
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
        <TeacherTopbar navItems={TEACHER_NAV_ITEMS} />
      </div>
      <AppSidebar roleLabel="Teacher" navItems={TEACHER_NAV_ITEMS} />
      <main className="flex-1 overflow-x-auto">
        <div className="bg-background mx-auto w-full max-w-md px-4 pt-4 pb-24 md:max-w-none md:px-8 md:pb-8 md:pt-8">
          {children}
        </div>
      </main>
      <BottomNav items={TEACHER_NAV_ITEMS} />
    </div>
  );
}
