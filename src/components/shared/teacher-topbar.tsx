"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TeacherNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function TeacherTopbar({ navItems }: { navItems: TeacherNavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <Image src="/brand/nufa-mark.png" alt="NUFA" width={28} height={28} />
        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
          >
            <LogOut className="size-4" />
            <span className="sr-only">Keluar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
