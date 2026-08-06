"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
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
    <aside className="flex w-full shrink-0 flex-col justify-between border-b p-4 md:h-dvh md:w-60 md:border-r md:border-b-0">
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
        <nav className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Button variant="outline" size="sm" onClick={handleLogout}>
        Keluar
      </Button>
    </aside>
  );
}
