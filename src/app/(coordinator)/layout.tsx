"use client";

import { Activity } from "lucide-react";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { MobileTopbar } from "@/components/shared/mobile-topbar";
import { BottomNav } from "@/components/shared/bottom-nav";
import { useComplianceCount } from "@/features/lesson-plans/use-compliance-count";

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { count: lessonPlanBadge } = useComplianceCount();
  const navItems = [
    { href: "/monitoring", label: "Monitoring", icon: Activity, badge: lessonPlanBadge },
  ];

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <MobileTopbar roleLabel="Coordinator" />
      <AppSidebar roleLabel="Coordinator" navItems={navItems} />
      <main className="flex-1 overflow-x-auto p-4 pb-20 md:p-8 md:pb-8">
        {children}
      </main>
      <BottomNav items={navItems} />
    </div>
  );
}
