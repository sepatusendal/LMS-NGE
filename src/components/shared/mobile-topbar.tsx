"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MobileNavDrawerList,
  type NavItem,
} from "@/components/shared/app-sidebar";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";

export function MobileTopbar({
  roleLabel,
  navItems,
  showLanguageSwitcher = false,
}: {
  roleLabel: string;
  navItems?: NavItem[];
  showLanguageSwitcher?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
      <div className="flex items-center gap-2">
        {navItems && navItems.length > 0 && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon-sm" />}>
              <Menu className="size-4" aria-hidden="true" />
              <span className="sr-only">{t("openMenu")}</span>
            </SheetTrigger>
            <SheetContent side="left" className="justify-start">
              <SheetHeader>
                <Image
                  src="/brand/nufa-logo.png"
                  alt="NUFA Global Education"
                  width={130}
                  height={38}
                />
                <SheetTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {roleLabel}
                </SheetTitle>
              </SheetHeader>
              <MobileNavDrawerList
                navItems={navItems}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
              <div className="mt-auto space-y-2 pt-2">
                {showLanguageSwitcher && <LanguageSwitcher className="w-full" />}
                <ThemeSwitcher className="w-full" />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleLogout}
                >
                  {t("logout")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
        <Image src="/brand/nufa-mark.png" alt="NUFA" width={28} height={28} />
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {roleLabel}
        </span>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={handleLogout}>
        <LogOut className="size-4" aria-hidden="true" />
        <span className="sr-only">{t("logout")}</span>
      </Button>
    </div>
  );
}
