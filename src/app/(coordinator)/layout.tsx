"use client";

import { Activity } from "lucide-react";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { MobileTopbar } from "@/components/shared/mobile-topbar";
import { BottomNav } from "@/components/shared/bottom-nav";

const COORDINATOR_NAV_ITEMS = [
  { href: "/monitoring", label: "Monitoring", icon: Activity },
];

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <MobileTopbar roleLabel="Coordinator" />
      <AppSidebar roleLabel="Coordinator" navItems={COORDINATOR_NAV_ITEMS} />
      <main className="flex-1 overflow-x-auto p-4 pb-20 md:p-8 md:pb-8">
        {children}
      </main>
      <BottomNav items={COORDINATOR_NAV_ITEMS} />
    </div>
  );
}
