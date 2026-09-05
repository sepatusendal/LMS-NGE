"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { cn } from "@/lib/utils";

export interface NavChild {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Small count pill next to the label — e.g. classes needing a lesson plan. */
  badge?: number;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: NavChild[];
  /** Small count pill next to the label. Left unset on a group, it rolls up
   * to the sum of its children's badges — set explicitly to override. */
  badge?: number;
}

function NavBadge({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  return (
    <span className="bg-destructive text-destructive-foreground ml-auto flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavSection({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const hasChildren = Boolean(item.children?.length);

  const isParentActive = item.children
    ? item.children.some((c) => pathname.startsWith(c.href))
    : false;

  const isDirectActive = item.href ? pathname.startsWith(item.href) : false;

  const [expanded, setExpanded] = useState(isParentActive);

  const rolledUpBadge =
    item.badge ?? item.children?.reduce((sum, c) => sum + (c.badge ?? 0), 0);

  if (item.href && !hasChildren) {
    return (
      <Link
        href={item.href}
        aria-current={isDirectActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
          isDirectActive
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        <item.icon className="size-4 shrink-0" aria-hidden="true" />
        {item.label}
        <NavBadge count={item.badge} />
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
          isParentActive
            ? "text-foreground bg-muted/50"
            : "text-foreground hover:bg-muted",
        )}
      >
        <span className="flex items-center gap-2">
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          {item.label}
        </span>
        <span className="flex items-center gap-1.5">
          <NavBadge count={rolledUpBadge} />
          {expanded ? (
            <ChevronDown className="size-3.5 shrink-0" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0" />
          )}
        </span>
      </button>
      {expanded && item.children && (
        <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l pl-3">
          {item.children.map((child) => {
            const isChildActive = pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                aria-current={isChildActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
                  isChildActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <child.icon className="size-4 shrink-0" aria-hidden="true" />
                {child.label}
                <NavBadge count={child.badge} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AppSidebar({
  roleLabel,
  navItems,
  showLanguageSwitcher = false,
}: {
  roleLabel: string;
  navItems: NavItem[];
  showLanguageSwitcher?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col justify-between self-start border-r p-4 max-md:hidden">
      <div className="space-y-6">
        <div className="space-y-1">
          <Image
            src="/brand/nufa-logo.png"
            alt="NUFA Global Education"
            width={140}
            height={40}
          />
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {roleLabel}
          </p>
        </div>
        <nav className="flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavSection key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>
      <div className="space-y-2">
        {showLanguageSwitcher && <LanguageSwitcher className="w-full" />}
        <ThemeSwitcher className="w-full" />
        <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
          {t("logout")}
        </Button>
      </div>
    </aside>
  );
}

export function flatNavItems(items: NavItem[]): { href: string; label: string; icon: LucideIcon }[] {
  const flat: { href: string; label: string; icon: LucideIcon }[] = [];
  for (const item of items) {
    if (item.href) {
      flat.push({ href: item.href, label: item.label, icon: item.icon });
    }
    if (item.children) {
      for (const child of item.children) {
        flat.push({ href: child.href, label: child.label, icon: child.icon });
      }
    }
  }
  return flat;
}
