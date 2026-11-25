"use client";

import { Activity, FileSignature } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { MobileTopbar } from "@/components/shared/mobile-topbar";
import { BottomNav } from "@/components/shared/bottom-nav";
import { useComplianceCount } from "@/features/lesson-plans/use-compliance-count";
import { PolicyBanner, PolicyBell, PolicyPopup, usePolicyNotices } from "@/features/policies/policy-notices";

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("coordinator.nav");
  const tRole = useTranslations("common.roles");
  const { count: lessonPlanBadge } = useComplianceCount();
  const pathname = usePathname();
  const policies = usePolicyNotices("COORDINATOR", pathname);
  const navItems = [
    { href: "/monitoring", label: t("monitoring"), icon: Activity, badge: lessonPlanBadge },
    ...(policies.hasDocuments
      ? [{ href: "/kebijakan", label: t("myDocuments"), icon: FileSignature, badge: policies.pending.length }]
      : []),
  ];

  return (
    <div className="flex min-h-dvh w-full flex-col md:flex-row">
      <MobileTopbar
        roleLabel={tRole("coordinator")}
        actions={policies.hasDocuments ? <PolicyBell count={policies.pending.length} /> : null}
      />
      <AppSidebar roleLabel={tRole("coordinator")} navItems={navItems} showLanguageSwitcher />
      <main className="flex-1 overflow-x-auto p-4 pb-20 md:p-8 md:pb-8">
        <PolicyBanner pending={policies.pending} pathname={pathname} />
        {/* Wrapped on purpose: as a direct sibling of the banner, the routed
            page triggers React's missing "key" warning. */}
        <>{children}</>
      </main>
      <BottomNav items={navItems} />
      <PolicyPopup popup={policies.popup} onLater={policies.later} onClose={policies.close} />
    </div>
  );
}
