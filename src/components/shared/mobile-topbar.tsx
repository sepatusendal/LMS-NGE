"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function MobileTopbar({ roleLabel }: { roleLabel: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
      <div className="flex items-center gap-2">
        <Image src="/brand/nufa-mark.png" alt="NUFA" width={28} height={28} />
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {roleLabel}
        </span>
      </div>
      <Button variant="ghost" size="icon-sm" onClick={handleLogout}>
        <LogOut className="size-4" aria-hidden="true" />
        <span className="sr-only">Keluar</span>
      </Button>
    </div>
  );
}
