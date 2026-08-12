"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Renders as a raised, colored circular button instead of a plain tab —
   * for the one action (Absensi) that should be unmistakably the easiest
   * target to hit, not just another item in the row. */
  emphasized?: boolean;
}

export function BottomNav({ items }: { items: BottomNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="bg-background fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        if (item.emphasized) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-start gap-1 py-1.5 text-[11px] font-semibold"
            >
              <span
                className={cn(
                  "flex size-12 -translate-y-3.5 items-center justify-center rounded-full shadow-lg shadow-primary/30 transition-transform",
                  isActive ? "bg-primary scale-105" : "bg-primary/90",
                )}
              >
                <Icon className="size-6 text-white" strokeWidth={2.25} aria-hidden="true" />
              </span>
              <span className={cn("-mt-2", isActive ? "text-primary" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon
              className="size-5"
              strokeWidth={isActive ? 2.5 : 2}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
