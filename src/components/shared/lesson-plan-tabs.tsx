"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Mobile-only switcher between the two routes grouped under "Lesson Plan" in
// the desktop sidebar — the bottom nav stays flat with Absensi centered, so
// this is the only way to reach /jadwal on mobile.
export function LessonPlanTabs() {
  const pathname = usePathname();
  const t = useTranslations("common.nav");

  const TABS = [
    { href: "/lesson-plan", label: t("lessonPlan") },
    { href: "/jadwal", label: t("jadwal") },
  ];

  return (
    <div className="bg-muted flex gap-1 rounded-full p-1 md:hidden">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 rounded-full py-1.5 text-center text-sm font-semibold transition-colors",
              isActive
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
