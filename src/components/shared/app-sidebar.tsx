"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface NavChild {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  children?: NavChild[];
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

  if (item.href && !hasChildren) {
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
          isDirectActive
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        <item.icon className="size-4" aria-hidden="true" />
        {item.label}
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
          <item.icon className="size-4" aria-hidden="true" />
          {item.label}
        </span>
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
      </button>
      {expanded && item.children && (
        <div className="mt-1 ml-4 flex flex-col gap-0.5 border-l pl-3">
          {item.children.map((child) => {
            const isChildActive = pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap",
                  isChildActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <child.icon className="size-3.5" aria-hidden="true" />
                {child.label}
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
}: {
  roleLabel: string;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();

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
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Keluar
      </Button>
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
